> **Deprecated for production/VPS deploy.** Use [K3s + Traefik](./k3s-traefik.md). Nginx below applies only when `NESTLANCER_DEPLOY_MODE=compose`.

<div align="center">

# Nestlancer Dev/E2E Docker + Nginx Setup Guide

### This guide documents how to run containers and expose them online using Nginx for both:

</div>

---

## 📖 Table of Contents

- [1) Docker watch-mode command from `package.json`](#1-docker-watch-mode-command-from-packagejson)
- [2) Deploy all dev containers](#2-deploy-all-dev-containers)
- [3) Install Nginx](#3-install-nginx)
- [4) Configure Nginx for `dev.nestlancer.com`](#4-configure-nginx-for-devnestlancercom)
- [5) Firewall setup (UFW)](#5-firewall-setup-ufw)
- [6) DNS and runtime verification](#6-dns-and-runtime-verification)
- [7) What was validated on this server](#7-what-was-validated-on-this-server)
- [8) E2E subdomain setup (`e2e.nestlancer.com`)](#8-e2e-subdomain-setup-e2enestlancercom)
- [9) Prod API subdomain setup (`api.nestlancer.com`)](#9-prod-api-subdomain-setup-apinestlancercom)

---

## 1) Docker watch-mode command from `package.json`

Main script:

- `pnpm docker:start`

It runs:

- `pnpm docker:build` -> `docker compose -f docker-compose.dev.yml build`
- `pnpm docker:up` -> `docker compose -f docker-compose.dev.yml up -d`

Watch mode comes from service commands in `docker-compose.dev.yml` using:

- `pnpm --filter <service> dev`
- which maps to NestJS watch (`nest start --watch`)

---

## 2) Deploy all dev containers

From project root:

```bash
pnpm docker:start
```

Useful checks:

```bash
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml logs -f --tail=100
```

---

## 3) Install Nginx

```bash
apt-get update
apt-get install -y nginx
```

---

## 4) Configure Nginx for `dev.nestlancer.com`

Create file:

- `/etc/nginx/sites-available/dev.nestlancer.com`

Content used:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name dev.nestlancer.com;

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:3100/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable + validate + reload:

```bash
ln -sfn /etc/nginx/sites-available/dev.nestlancer.com /etc/nginx/sites-enabled/dev.nestlancer.com
nginx -t
systemctl reload nginx
systemctl is-active nginx
```

---

## 5) Firewall setup (UFW)

Allow Nginx traffic:

```bash
ufw allow 'Nginx Full'
ufw reload
ufw status
```

---

## 6) DNS and runtime verification

Verify DNS:

```bash
getent hosts dev.nestlancer.com
```

Verify Nginx vhost routing:

```bash
curl -I -H 'Host: dev.nestlancer.com' http://127.0.0.1/
curl -I http://dev.nestlancer.com/
```

Verify API health through domain:

```bash
curl -i http://dev.nestlancer.com/api/v1/health/live
```

Expected result:

- HTTP `200 OK` on `/api/v1/health/live`

---

## 7) What was validated on this server

- Docker dev stack was built and started.
- Nginx was installed and running.
- UFW allowed Nginx traffic.
- `dev.nestlancer.com` resolved and proxied successfully.
- Health endpoint returned `200 OK` through Nginx/domain.

---

## 8) E2E subdomain setup (`e2e.nestlancer.com`)

### 8.1 DNS record

Create an `A` record in your DNS provider:

- Name: `e2e`
- Target: your server public IP
- Proxy: Orange cloud (Cloudflare proxied) if you want edge protection/caching

Note:

- With orange proxy enabled, DNS resolves to Cloudflare IPs (this is expected).

### 8.2 Run E2E Docker stack

```bash
pnpm docker:e2e:build
pnpm docker:e2e:up
docker compose -f docker-compose.e2e.yml ps
```

### 8.3 Nginx vhost for E2E subdomain

Create file:

- `/etc/nginx/sites-available/e2e.nestlancer.com`

Example config (adjust upstream ports to match `docker-compose.e2e.yml`):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name e2e.nestlancer.com;

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:3100/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable + reload:

```bash
ln -sfn /etc/nginx/sites-available/e2e.nestlancer.com /etc/nginx/sites-enabled/e2e.nestlancer.com
nginx -t
systemctl reload nginx
```

### 8.4 Verify E2E subdomain

```bash
getent hosts e2e.nestlancer.com
curl -I http://e2e.nestlancer.com/
curl -i http://e2e.nestlancer.com/api/v1/health/live
```

Expected:

- `Server: cloudflare` in headers when orange proxy is enabled
- HTTP `200 OK` from `/api/v1/health/live`

### 8.5 HTTPS note (important with orange proxy)

If `https://e2e.nestlancer.com` returns `521`, Cloudflare cannot connect to origin SSL.

Fix by enabling origin HTTPS on Nginx (`443`) and using one of:

- Let's Encrypt certificate on origin, then Cloudflare SSL mode `Full (strict)`
- Cloudflare Origin Certificate on origin, then Cloudflare SSL mode `Full (strict)`

---

## 9) Prod API subdomain setup (`api.nestlancer.com`)

### 9.1 DNS record

Create an `A` record in your DNS provider:

- Name: `api`
- Target: your server public IP
- Proxy: Orange cloud (Cloudflare proxied) if you want Cloudflare in front
  With orange proxy enabled, DNS resolves to Cloudflare IPs (expected).

### 9.2 Nginx vhost for prod API

Create file:

- `/etc/nginx/sites-available/api.nestlancer.com`
  Config used on this server (currently proxies to the upstream listening on `:4000`):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name api.nestlancer.com;
    client_max_body_size 50m;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    # Optional: if you expose WebSocket gateway under same subdomain
    location /ws/ {
        proxy_pass http://127.0.0.1:3100/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable + reload:

```bash
ln -sfn /etc/nginx/sites-available/api.nestlancer.com /etc/nginx/sites-enabled/api.nestlancer.com
nginx -t
systemctl reload nginx
```

### 9.3 Verify prod API subdomain

Local vhost check (bypasses DNS):

```bash
curl -i -H 'Host: api.nestlancer.com' http://127.0.0.1/api/v1/health/live
```

Public check (through Cloudflare if orange proxy enabled):

```bash
curl -i http://api.nestlancer.com/api/v1/health/live
```

Expected:

- HTTP `200 OK` from `/api/v1/health/live`
- `Server: cloudflare` in headers when orange proxy is enabled

### 9.4 HTTPS note (Cloudflare orange proxy)

If `https://api.nestlancer.com` returns `521`, the origin is not serving HTTPS on `443`.
To make HTTPS work:

- Configure Nginx `443` for `api.nestlancer.com`
- Install a cert (Let's Encrypt or Cloudflare Origin Cert)
- Set Cloudflare SSL mode to `Full (strict)`

---

<div align="center">

**Nestlancer Dev/E2E Docker + Nginx Setup Guide** — Nestlancer guide

</div>
