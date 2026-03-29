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

There are two ways to run the tunnel. Choose the one that matches how your tunnel was created.

### Option A — Token (recommended for dashboard-created tunnels)

When you create a tunnel in the **Cloudflare Zero Trust dashboard** (Settings → Tunnels → Add a tunnel), the dashboard provides a one-line install command that contains a token. Use that token here:

```bash
# 1. Install cloudflared
# https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/

# 2. Run the tunnel with the token from the Zero Trust dashboard.
#    Store the token in an environment variable — never hard-code it.
export TUNNEL_TOKEN=<paste the token from the Cloudflare dashboard>
cloudflared tunnel run --token "$TUNNEL_TOKEN"

# 3. To run as a persistent systemd service instead:
sudo cloudflared service install "$TUNNEL_TOKEN"
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

> **Token security:** The tunnel token is a long-lived credential. Store it in your server's environment (e.g. a systemd override file, `.env`, or a secrets manager). Never commit it to the repository.

### Option B — Credentials file (CLI-created tunnels)

Use this approach if you created the tunnel with `cloudflared tunnel create` on the command line:

```bash
# 1. Install cloudflared

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
| `Invalid token` / `failed to parse token` | The token string is truncated or corrupted — copy it again from the Cloudflare Zero Trust dashboard |
| Tunnel connects but API returns 502 | Confirm the API is running on port 4000 (`pnpm dev`) |
| DNS not resolving | Verify the CNAME records in Cloudflare dashboard |
| Wrong hostname in redirects | Confirm `APP_BASE_URL` / `API_BASE_URL` / Google redirect URI all match |
