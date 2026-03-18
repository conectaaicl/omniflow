import re
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.core import Tenant, TenantSettings, User
from app.core.database import engine


def _safe_schema(schema_name: str) -> str:
    if not re.match(r'^[a-z0-9_]+$', schema_name):
        raise ValueError(f"Invalid schema name: {schema_name}")
    return schema_name


def create_tenant_schema(schema_name: str):
    """
    Creates a PostgreSQL schema and all tenant tables using explicit DDL.
    This approach is reliable across all SQLAlchemy 2.0 configurations.
    """
    _safe_schema(schema_name)

    ddl = f"""
    CREATE SCHEMA IF NOT EXISTS {schema_name};

    CREATE TABLE IF NOT EXISTS {schema_name}.contacts (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        phone VARCHAR,
        email VARCHAR,
        external_id VARCHAR,
        source VARCHAR,
        campaign VARCHAR,
        last_interaction TIMESTAMP DEFAULT NOW(),
        lead_score INTEGER DEFAULT 0,
        intent VARCHAR
    );
    CREATE INDEX IF NOT EXISTS {schema_name}_contacts_ext_id
        ON {schema_name}.contacts(external_id);

    CREATE TABLE IF NOT EXISTS {schema_name}.conversations (
        id SERIAL PRIMARY KEY,
        contact_id INTEGER REFERENCES {schema_name}.contacts(id),
        channel VARCHAR NOT NULL,
        status VARCHAR DEFAULT 'open',
        last_message TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS {schema_name}.messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES {schema_name}.conversations(id),
        sender_type VARCHAR NOT NULL,
        content TEXT NOT NULL,
        content_type VARCHAR DEFAULT 'text',
        timestamp TIMESTAMP DEFAULT NOW(),
        is_read BOOLEAN DEFAULT FALSE,
        metadata_json JSONB
    );

    CREATE TABLE IF NOT EXISTS {schema_name}.pipelines (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL
    );

    CREATE TABLE IF NOT EXISTS {schema_name}.pipeline_stages (
        id SERIAL PRIMARY KEY,
        pipeline_id INTEGER REFERENCES {schema_name}.pipelines(id),
        name VARCHAR NOT NULL,
        "order" INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS {schema_name}.deals (
        id SERIAL PRIMARY KEY,
        contact_id INTEGER REFERENCES {schema_name}.contacts(id),
        stage_id INTEGER REFERENCES {schema_name}.pipeline_stages(id),
        title VARCHAR NOT NULL,
        value FLOAT DEFAULT 0.0,
        status VARCHAR DEFAULT 'open',
        created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS {schema_name}.quotes (
        id SERIAL PRIMARY KEY,
        contact_id INTEGER REFERENCES {schema_name}.contacts(id),
        deal_id INTEGER REFERENCES {schema_name}.deals(id) ON DELETE SET NULL,
        quote_text TEXT NOT NULL,
        product VARCHAR,
        total_value FLOAT DEFAULT 0.0,
        status VARCHAR DEFAULT 'sent',
        created_at TIMESTAMP DEFAULT NOW(),
        sent_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS {schema_name}.training_data (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES {schema_name}.conversations(id) ON DELETE SET NULL,
        message_content TEXT NOT NULL,
        expected_response TEXT,
        actual_response TEXT,
        rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
        corrected_response TEXT,
        labels JSONB DEFAULT '[]',
        reviewer VARCHAR,
        created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS {schema_name}_training_data_rating
        ON {schema_name}.training_data(rating);

    -- Seed default sales pipeline
    INSERT INTO {schema_name}.pipelines (name)
        SELECT 'Sales Pipeline'
        WHERE NOT EXISTS (SELECT 1 FROM {schema_name}.pipelines);
    """

    # Seed stages after pipeline row is committed
    seed_stages = f"""
    DO $$
    DECLARE pid INTEGER;
    BEGIN
        SELECT id INTO pid FROM {schema_name}.pipelines LIMIT 1;
        IF pid IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM {schema_name}.pipeline_stages WHERE pipeline_id = pid
        ) THEN
            INSERT INTO {schema_name}.pipeline_stages (pipeline_id, name, "order") VALUES
                (pid, 'Nuevo Lead',    0),
                (pid, 'Contactado',    1),
                (pid, 'Propuesta',     2),
                (pid, 'Negociación',   3),
                (pid, 'Ganado',        4),
                (pid, 'Perdido',       5);
        END IF;
    END$$;
    """

    with engine.begin() as conn:
        conn.execute(text(ddl))

    with engine.begin() as conn:
        conn.execute(text(seed_stages))


def create_new_tenant(
    db: Session,
    tenant_name: str,
    subdomain: str,
    admin_email: str,
    hashed_password: str,
) -> Tenant:
    schema_name = "tenant_" + re.sub(r"[^a-z0-9]", "_", subdomain.lower())
    _safe_schema(schema_name)

    # Tenant record
    new_tenant = Tenant(
        name=tenant_name,
        schema_name=schema_name,
        subdomain=subdomain,
    )
    db.add(new_tenant)
    db.commit()
    db.refresh(new_tenant)

    # Default settings
    settings = TenantSettings(
        tenant_id=new_tenant.id,
        webchat_bot_name="Asistente",
        webchat_greeting="¡Hola! ¿En qué puedo ayudarte hoy? 😊",
        webchat_enabled=True,
        ai_provider="groq",
    )
    db.add(settings)
    db.commit()

    # Schema + tables + seed pipeline
    create_tenant_schema(schema_name)

    # Admin user
    admin_user = User(
        tenant_id=new_tenant.id,
        email=admin_email,
        hashed_password=hashed_password,
        full_name="Admin",
        is_superuser=True,
        is_active=True,
    )
    db.add(admin_user)
    db.commit()

    return new_tenant


def get_tenant_by_host(db: Session, host: str) -> Tenant | None:
    """Retrieves a tenant by subdomain or custom domain."""
    host_clean = host.split(":")[0]
    parts = host_clean.split(".")
    subdomain = parts[0] if len(parts) > 1 else host_clean

    return db.query(Tenant).filter(
        (Tenant.subdomain == subdomain) | (Tenant.custom_domain == host_clean)
    ).first()
