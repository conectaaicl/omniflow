server {
    listen 80;
    server_name osw.conectaai.cl;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name osw.conectaai.cl;

    ssl_certificate /var/www/working/nginx/ssl/cloudflare-origin.crt;
    ssl_certificate_key /var/www/working/nginx/ssl/cloudflare-origin.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    client_max_body_size 50M;

    # ── API Backend ──────────────────────────────────────
    location /api/ {
        proxy_pass http://127.0.0.1:8002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    # ── n8n Automation Editor (redirige al subdominio dedicado) ──
    location /n8n/ {
        return 301 https://n8n.conectaai.cl/;
    }

    # ── Frontend (Next.js) ───────────────────────────────
    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
