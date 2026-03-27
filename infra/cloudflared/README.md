# Cloudflare Tunnel – `ao-os-api`

This directory contains the local Cloudflare tunnel configuration for the AO OS API.

## Tunnel Details

| Field | Value |
|-------|-------|
| Tunnel name | `ao-os-api` |
| Tunnel UUID | `3a12c58b-3dad-4cfc-af2b-2b69a7c36ab3` |
| Public hostname | `api.aosanctuary.com` |
| Local service | `http://localhost:4000` |

## Prerequisites

- [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) installed on the server
- Tunnel credentials file at `C:\Users\Jason van Ravenswaay\.cloudflared\3a12c58b-3dad-4cfc-af2b-2b69a7c36ab3.json`
- `config.yml` copied to `C:\Users\Jason van Ravenswaay\.cloudflared\config.yml`

## Setup

1. **Copy the config file** to the cloudflared configuration directory:

   ```cmd
   copy infra\cloudflared\config.yml "C:\Users\Jason van Ravenswaay\.cloudflared\config.yml"
   ```

2. **Run the tunnel**:

   ```cmd
   "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel run ao-os-api
   ```

3. **Verify the tunnel is working**:

   ```cmd
   curl.exe -i https://api.aosanctuary.com/v1/health
   ```

   Expected response:
   ```json
   {"status":"ok"}
   ```

## DNS

The DNS record `api.aosanctuary.com` is already configured in Cloudflare to point to the tunnel UUID (proxied / orange cloud). No additional DNS configuration is needed.
