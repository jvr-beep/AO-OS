# Cloudflare Tunnel — AO OS API

Zone: `aosanctuary.com`  
Tunnel maps public hostnames to the internal NestJS API (`localhost:4000`).

| Public hostname | Internal target |
|---|---|
| `api.aosanctuary.com` | `http://localhost:4000` |
| `api-staging.aosanctuary.com` | `http://localhost:4000` *(optional)* |

> **Important:** Cloudflare is not an application secret manager. This tunnel handles routing only. App secrets live in `.env` / your secrets manager.

---

## Hostname alignment

All three of the following must use the same production hostname:

| Location | Variable / value |
|---|---|
| API server env | `APP_BASE_URL=https://api.aosanctuary.com` |
| Web app env | `API_BASE_URL=https://api.aosanctuary.com/v1` |
| Google Cloud Console | Redirect URI → `https://api.aosanctuary.com/v1/auth/google/callback` |

---

## First-time setup

```bash
# 1. Install cloudflared
# https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/

# 2. Authenticate (opens browser)
cloudflared tunnel login

# 3. Create the tunnel (once per machine)
cloudflared tunnel create ao-os-api
# → writes credentials to ~/.cloudflared/<TUNNEL_ID>.json

# 4. Update config.yml
#    Set `tunnel:` and `credentials-file:` to the values printed above.

# 5. Add DNS CNAME records in Cloudflare dashboard → Zero Trust → Tunnels
#      api.aosanctuary.com         → <TUNNEL_ID>.cfargotunnel.com
#      api-staging.aosanctuary.com → <TUNNEL_ID>.cfargotunnel.com  (optional)

# 6. Install as a systemd service
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

---

## Day-to-day operations

```bash
# After editing config.yml, reload the service
sudo systemctl restart cloudflared

# Check tunnel health
sudo systemctl status cloudflared

# View live logs
sudo journalctl -u cloudflared -f
```

---

## Troubleshooting

| Symptom | Check |
|---|---|
| `status` shows `failed` | Run `journalctl -u cloudflared -n 50` for error details |
| Tunnel connects but API returns 502 | Confirm the API is running on port 4000 (`pnpm dev`) |
| DNS not resolving | Verify the CNAME records in Cloudflare dashboard |
| Wrong hostname in redirects | Confirm `APP_BASE_URL` / `API_BASE_URL` / Google redirect URI all match |
