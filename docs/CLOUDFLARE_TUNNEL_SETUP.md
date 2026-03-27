# Cloudflare Tunnel Setup — AO OS API

## Overview

| Item | Value |
|------|-------|
| Tunnel name | `ao-os-api` |
| Tunnel UUID | `3a12c58b-3dad-4cfc-af2b-2b69a7c36ab3` |
| Public hostname | `api.aosanctuary.com` |
| DNS record | `api.aosanctuary.com` → tunnel UUID (proxied, orange cloud ✓) |
| Local target | `http://localhost:4000` |

The DNS record and Cloudflare tunnel are already configured. You only need to run `cloudflared` on the server with the config file below.

---

## 1. Verify the config file

Copy the template from this repo to your server:

**Source (repo):** `infra/cloudflared/config.yml`

**Destination (server):**
```
C:\Users\<YOUR_WINDOWS_USERNAME>\.cloudflared\config.yml
```

The file should contain:

```yaml
tunnel: 3a12c58b-3dad-4cfc-af2b-2b69a7c36ab3
credentials-file: C:\Users\<YOUR_WINDOWS_USERNAME>\.cloudflared\3a12c58b-3dad-4cfc-af2b-2b69a7c36ab3.json

ingress:
  - hostname: api.aosanctuary.com
    service: http://localhost:4000
  - service: http_status:404
```

> **Note:** The credentials JSON file (`3a12c58b-...json`) is created automatically by `cloudflared tunnel create` and is **not** stored in this repo.

---

## 2. Start the API

Ensure the AO OS API is running locally before starting the tunnel:

```cmd
pnpm --filter api dev
```

Verify it responds:

```cmd
curl.exe http://localhost:4000/v1/health
```

---

## 3. Run the tunnel

```cmd
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel run ao-os-api
```

You should see output like:

```
INF Starting tunnel tunnelID=3a12c58b-3dad-4cfc-af2b-2b69a7c36ab3
INF Registered tunnel connection connIndex=0 ...
```

---

## 4. Verify end-to-end

```cmd
curl.exe -i https://api.aosanctuary.com/v1/health
```

Expected response:

```json
{ "status": "ok" }
```

---

## 5. Run as a Windows service (optional, for persistent uptime)

```cmd
"C:\Program Files (x86)\cloudflared\cloudflared.exe" service install
net start cloudflared
```

To stop the service:

```cmd
net stop cloudflared
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `curl` returns 502 | API not running on port 4000 | Run `pnpm --filter api dev` |
| `curl` returns 530 | Tunnel not connected | Start cloudflared |
| `Error: credentials file not found` | JSON credentials file missing | Run `cloudflared tunnel create ao-os-api` or copy from original setup location |
| `ERR_TOO_MANY_REDIRECTS` | HTTPS redirect loop | Ensure Cloudflare SSL mode is set to **Full** (not Flexible) |
