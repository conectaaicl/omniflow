"""
Instagram token auto-refresh script.
Run monthly via cron: 0 2 1 * * docker exec omniflow_backend python3 /app/scripts/ig_token_refresh.py
"""
import sys, httpx, asyncio
sys.path.insert(0, '/app')
from app.core.database import SessionLocal
from app.models.core import TenantSettings


async def refresh():
    db = SessionLocal()
    settings_list = db.query(TenantSettings).filter(
        TenantSettings.instagram_access_token.isnot(None)
    ).all()

    for settings in settings_list:
        token = settings.instagram_access_token
        if not token or not token.startswith('IGAAN'):
            continue
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                'https://graph.instagram.com/refresh_access_token',
                params={'grant_type': 'ig_refresh_token', 'access_token': token}
            )
            if r.status_code == 200:
                new_token = r.json().get('access_token')
                if new_token:
                    settings.instagram_access_token = new_token
                    db.commit()
                    print(f'[IG refresh] tenant {settings.tenant_id} OK', flush=True)
            else:
                print(f'[IG refresh] tenant {settings.tenant_id} FAILED: {r.text[:200]}', flush=True)

    db.close()


if __name__ == '__main__':
    asyncio.run(refresh())
