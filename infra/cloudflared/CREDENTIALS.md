# Cloudflared Tunnel Credentials Template
#
# This file is for REFERENCE ONLY.
# DO NOT commit actual credentials to the repository.
#
# On your API host (Linux), store credentials at:
#   /root/.cloudflared/TUNNEL_ID.json
#
# To obtain credentials:
# 1. Create a tunnel in Cloudflare dashboard https://dash.cloudflare.com
# 2. Copy the provided credentials file
# 3. Place it in /root/.cloudflared/ on the API host
# 4. Update infra/cloudflared/config.yml with the tunnel ID and hostname
#
# The token format:
# {"a":"...","t":"...","s":"..."}
#
# Your tunnel credentials file should contain JSON similar to:
# {
#   "a": "base64-encoded-account-tag",
#   "t": "base64-encoded-tunnel-uuid",
#   "s": "base64-encoded-secret"
# }
#
# Environment variable for service install (Linux only):
# sudo cloudflared service install <TOKEN>
#
# Or use the credentials file directly:
# cloudflared tunnel run ao-os-api
