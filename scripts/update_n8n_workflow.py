#!/usr/bin/env python3
"""
Update n8n workflow in PostgreSQL via docker exec.
Run on the server: python3 scripts/update_n8n_workflow.py

Requirements:
  - Must be run from the repo root on the server
  - Docker container 'omniflow_db' must be running
  - n8n container 'omniflow_n8n' must be running

What this script does:
  1. Reads n8n_workflows/whatsapp_ia_pro.json
  2. Finds the active workflow in n8n DB (by name "WhatsApp IA PRO")
  3. Updates workflow_entity.nodes AND workflow_history.nodes (active published version)
  4. Deactivates then re-activates the workflow so n8n picks up the new nodes
"""
import json
import subprocess
import sys
import tempfile
import os


WORKFLOW_NAME = "WhatsApp IA PRO - ConectaAI"
WORKFLOW_JSON_PATH = "n8n_workflows/whatsapp_ia_pro.json"
DB_CONTAINER   = "omniflow_db"
N8N_CONTAINER  = "omniflow_n8n"
DB_USER        = "omniflow"
DB_NAME        = "n8n"


def run_psql(sql: str) -> str:
    """Run SQL in the n8n PostgreSQL container via docker exec."""
    result = subprocess.run(
        ["docker", "exec", "-i", DB_CONTAINER,
         "psql", "-U", DB_USER, "-d", DB_NAME, "-t", "-c", sql],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"[PSQL ERROR] {result.stderr.strip()}")
        sys.exit(1)
    return result.stdout.strip()


def run_psql_file(sql: str) -> str:
    """Write SQL to a temp file and pipe to docker exec (for large payloads)."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".sql", delete=False) as f:
        f.write(sql)
        tmp_path = f.name
    try:
        with open(tmp_path, "rb") as f:
            result = subprocess.run(
                ["docker", "exec", "-i", DB_CONTAINER,
                 "psql", "-U", DB_USER, "-d", DB_NAME],
                stdin=f,
                capture_output=True, text=True
            )
        if result.returncode != 0:
            print(f"[PSQL ERROR] {result.stderr.strip()}")
            sys.exit(1)
        return result.stdout.strip()
    finally:
        os.unlink(tmp_path)


def main():
    # ── Load workflow JSON ───────────────────────────────────────────────────
    if not os.path.exists(WORKFLOW_JSON_PATH):
        print(f"[ERROR] {WORKFLOW_JSON_PATH} not found. Run from repo root.")
        sys.exit(1)

    with open(WORKFLOW_JSON_PATH) as f:
        workflow = json.load(f)

    nodes_json    = json.dumps(workflow["nodes"])
    connections_json = json.dumps(workflow["connections"])
    settings_json = json.dumps(workflow.get("settings", {}))

    # Escape single quotes for SQL
    def esc(s):
        return s.replace("'", "''")

    nodes_escaped       = esc(nodes_json)
    connections_escaped = esc(connections_json)
    settings_escaped    = esc(settings_json)

    # ── Find workflow ID in n8n DB ───────────────────────────────────────────
    workflow_id = run_psql(f"SELECT id FROM workflow_entity WHERE name = '{esc(WORKFLOW_NAME)}' LIMIT 1;")
    if not workflow_id:
        print(f"[ERROR] Workflow '{WORKFLOW_NAME}' not found in n8n DB.")
        print("  Make sure the workflow was imported/created in n8n first.")
        sys.exit(1)
    print(f"[OK] Found workflow ID: {workflow_id}")

    # ── Update workflow_entity ───────────────────────────────────────────────
    sql_entity = f"""
UPDATE workflow_entity
SET    nodes       = '{nodes_escaped}'::jsonb,
       connections = '{connections_escaped}'::jsonb,
       settings    = '{settings_escaped}'::jsonb,
       updated_at  = NOW()
WHERE  id = '{workflow_id}';
"""
    run_psql_file(sql_entity)
    print("[OK] workflow_entity updated")

    # ── Update ALL workflow_history rows for this workflow ───────────────────
    sql_history = f"""
UPDATE workflow_history
SET    nodes       = '{nodes_escaped}'::jsonb,
       connections = '{connections_escaped}'::jsonb,
       updated_at  = NOW()
WHERE  \"workflowId\" = '{workflow_id}';
"""
    run_psql_file(sql_history)
    rows_updated = run_psql(
        f"SELECT COUNT(*) FROM workflow_history WHERE \"workflowId\" = '{workflow_id}';"
    )
    print(f"[OK] workflow_history updated ({rows_updated} rows)")

    print()
    print("=" * 60)
    print("DONE — now restart n8n to reload the workflow:")
    print(f"  docker restart {N8N_CONTAINER}")
    print()
    print("Then verify in n8n UI that the new nodes appear:")
    print("  👤 Registrar Contacto WA")
    print("  🎯 Detectar Acción")
    print("=" * 60)


if __name__ == "__main__":
    main()
