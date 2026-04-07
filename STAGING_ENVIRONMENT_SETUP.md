# Staging Environment Setup

This document describes how to get the staging API reachable at
`https://api-staging.aosanctuary.com` via a Cloudflare Tunnel on the Linux
staging host.

## Prerequisites

- The AO-OS API is already running on the host (verify: `curl http://localhost:4000/v1/health` returns `200`).
- You have root / sudo access to the staging host.
- You have access to the Cloudflare dashboard for the `ao-os-api-staging` tunnel
  (tunnel ID `bde6525b-327e-4630-960a-e58c641d2456`).

---

## Step 1 — Install `cloudflared`

```bash
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
  | sudo gpg --dearmor -o /usr/share/keyrings/cloudflare-main.gpg

echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' \
  | sudo tee /etc/apt/sources.list.d/cloudflared.list

sudo apt-get update
sudo apt-get install -y cloudflared
which cloudflared   # should print /usr/bin/cloudflared or similar
```

---

## Step 2 — Create the config directory and config file

```bash
sudo mkdir -p /root/.cloudflared

sudo cp ~/AO-OS/infra/cloudflared/config.staging.yml.example \
        /root/.cloudflared/config.yml

sudo sed -i 's/STAGING_TUNNEL_ID/bde6525b-327e-4630-960a-e58c641d2456/g' \
        /root/.cloudflared/config.yml

sudo cat /root/.cloudflared/config.yml
```

Expected output:

```yaml
tunnel: ao-os-api-staging
credentials-file: /root/.cloudflared/bde6525b-327e-4630-960a-e58c641d2456.json

ingress:
  - hostname: api-staging.aosanctuary.com
    service: http://localhost:4000
  - service: http_status:404
```

---

## Step 3 — Place the tunnel credentials JSON on the server

The credentials file must exist at:

```
/root/.cloudflared/bde6525b-327e-4630-960a-e58c641d2456.json
```

To obtain it:

1. Go to <https://dash.cloudflare.com> → **Zero Trust** → **Access** →
   **Tunnels**.
2. Click the `ao-os-api-staging` tunnel.
3. Under **Configure**, download or copy the credentials JSON.
4. Upload it to the server (from your local machine):

```bash
scp /path/to/bde6525b-327e-4630-960a-e58c641d2456.json \
    root@<STAGING_HOST>:/root/.cloudflared/bde6525b-327e-4630-960a-e58c641d2456.json
```

Verify it is on the server:

```bash
sudo cat /root/.cloudflared/bde6525b-327e-4630-960a-e58c641d2456.json
```

---

## Step 4 — Test the tunnel manually

Run the tunnel in the foreground to confirm it connects before making it a
service:

```bash
sudo cloudflared --config /root/.cloudflared/config.yml tunnel run ao-os-api-staging
```

You should see lines like:

```
INF Connection ... registered connIndex=0 ...
INF Connection ... registered connIndex=1 ...
```

While it is running, from another terminal (or from your laptop) test the
public URL:

```bash
curl -i https://api-staging.aosanctuary.com/v1/health
```

A `200 OK` confirms the tunnel is working. Press `Ctrl-C` to stop the manual
run once verified.

---

## Step 5 — Install as a persistent systemd service

```bash
CLOUDFLARED_BIN=$(which cloudflared)

sudo tee /etc/systemd/system/cloudflared.service >/dev/null <<EOF
[Unit]
Description=Cloudflare Tunnel (staging)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${CLOUDFLARED_BIN} --config /root/.cloudflared/config.yml tunnel run ao-os-api-staging
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared --no-pager
```

The status output should show `active (running)`.

---

## Step 6 — Final external verification

```bash
curl -i https://api-staging.aosanctuary.com/v1/health
```

A `200 OK` here means the tunnel is live. The staging web app can now reach
the staging API and the password reset flow will work again.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `cloudflared: command not found` | Installation failed | Re-run Step 1 |
| `failed to unmarshal tunnel credentials` | Wrong or missing JSON | Re-check Step 3 |
| `failed to connect to Cloudflare edge` | Network / firewall | Ensure outbound TCP 7844 or 443 is open |
| `no ingress rule matched` | Hostname mismatch in config | Verify `config.yml` hostname matches DNS |
| Service not starting after reboot | Systemd unit not enabled | `sudo systemctl enable cloudflared` |

---

## CORS — Staging origin coverage

The API derives its allowed CORS origin list from the following env vars
(set in `apps/api/.env` on the staging host):

| Env var | Example staging value |
|---------|----------------------|
| `APP_BASE_URL` | `https://staging.aosanctuary.com` |
| `STAFF_APP_BASE_URL` | `https://staff-staging.aosanctuary.com` |
| `WEB_BASE_URL` | `https://staging.aosanctuary.com` |

The API also accepts an explicit comma-separated override via `CORS_ORIGIN`.

If any of the above vars are set, the corresponding origin is automatically
added to the allowed list without requiring a separate `CORS_ORIGIN` entry.
The fallback list always includes the two production origins, both staging
origins, and `http://localhost:3000/3001` for local dev.

To verify the staging API is returning the correct header after deploy:

```bash
curl -si -X OPTIONS https://api-staging.aosanctuary.com/v1/auth/login \
  -H "Origin: https://staging.aosanctuary.com" \
  -H "Access-Control-Request-Method: POST" \
  | grep -i access-control-allow-origin
```

Expected: `access-control-allow-origin: https://staging.aosanctuary.com`
