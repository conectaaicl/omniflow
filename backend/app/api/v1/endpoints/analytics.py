"""
Analytics API — métricas de conversaciones, mensajes y canales
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db, tenant_db_session
from app.core.security import get_current_user

router = APIRouter()


@router.get("/overview")
def get_analytics_overview(
    days: int = 30,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Dashboard analytics: conversations, messages, leads, channels."""
    from app.models.core import Tenant
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        return {}

    schema = tenant.schema_name
    since = datetime.utcnow() - timedelta(days=days)

    with tenant_db_session(schema) as tdb:
        # Total conversations
        total_convs = tdb.execute(text("SELECT COUNT(*) FROM conversations")).scalar() or 0
        # Active (last N days)
        active_convs = tdb.execute(
            text("SELECT COUNT(*) FROM conversations WHERE updated_at > :since"),
            {"since": since}
        ).scalar() or 0
        # Total messages
        total_msgs = tdb.execute(text("SELECT COUNT(*) FROM messages")).scalar() or 0
        # Messages last N days
        recent_msgs = tdb.execute(
            text("SELECT COUNT(*) FROM messages WHERE created_at > :since"),
            {"since": since}
        ).scalar() or 0
        # By channel
        by_channel = tdb.execute(
            text("SELECT channel, COUNT(*) as cnt FROM conversations GROUP BY channel ORDER BY cnt DESC")
        ).fetchall()
        # By status
        by_status = tdb.execute(
            text("SELECT status, COUNT(*) as cnt FROM conversations GROUP BY status ORDER BY cnt DESC")
        ).fetchall()
        # Contacts
        total_contacts = tdb.execute(text("SELECT COUNT(*) FROM contacts")).scalar() or 0
        new_contacts = tdb.execute(
            text("SELECT COUNT(*) FROM contacts WHERE created_at > :since"),
            {"since": since}
        ).scalar() or 0
        # Daily message volume (last 14 days)
        daily = tdb.execute(
            text("""
                SELECT DATE(created_at) as day, COUNT(*) as cnt
                FROM messages
                WHERE created_at > :since
                GROUP BY DATE(created_at)
                ORDER BY day ASC
                LIMIT 14
            """),
            {"since": datetime.utcnow() - timedelta(days=14)}
        ).fetchall()
        # Bot vs Human messages
        bot_msgs = tdb.execute(
            text("SELECT COUNT(*) FROM messages WHERE sender_type = 'bot'")
        ).scalar() or 0
        human_msgs = tdb.execute(
            text("SELECT COUNT(*) FROM messages WHERE sender_type IN ('agent', 'human')")
        ).scalar() or 0
        visitor_msgs = tdb.execute(
            text("SELECT COUNT(*) FROM messages WHERE sender_type = 'visitor'")
        ).scalar() or 0

    return {
        "period_days": days,
        "conversations": {
            "total": total_convs,
            "active_period": active_convs,
        },
        "messages": {
            "total": total_msgs,
            "period": recent_msgs,
            "bot": bot_msgs,
            "human": human_msgs,
            "visitor": visitor_msgs,
        },
        "contacts": {
            "total": total_contacts,
            "new_period": new_contacts,
        },
        "by_channel": [{"channel": r[0], "count": r[1]} for r in by_channel],
        "by_status": [{"status": r[0], "count": r[1]} for r in by_status],
        "daily_messages": [{"date": str(r[0]), "count": r[1]} for r in daily],
    }
