# Server Deployment — AO OS API (Linux VPS)

This guide covers deploying the AO OS API on a Linux VPS (Debian/Ubuntu).  
The server in these examples is named `ao-os-api`.

---

## Prerequisites

| Requirement | Version |
|---|---|
| Docker CE | 24+ |
| Docker Compose plugin | v2+ |
| git | any recent |
| cloudflared | latest |

---

## 1. Authenticate with GitHub (SSH key)

> **Why?**  
> GitHub removed HTTPS password authentication for Git operations in August 2021.  
> You must use an SSH key **or** a Personal Access Token (PAT).  
> SSH is recommended for servers.

```bash
ssh-keygen -t ed25519 -C "ao-os-api-deploy"
```

`ssh-keygen` will ask three questions — press **Enter** for each to accept the defaults:

```
Enter file in which to save the key (/home/jvr/.ssh/id_ed25519):  ← press Enter
Enter passphrase (empty for no passphrase):                        ← press Enter
Enter same passphrase again:                                       ← press Enter
```

> No passphrase is correct for a server deploy key — it lets git pull/clone run without manual interaction.

Once keygen finishes, print your public key and copy the **entire** output:

```bash
cat ~/.ssh/id_ed25519.pub
```

Add it to GitHub:

1. Go to **GitHub → Settings → SSH and GPG keys → New SSH key**
2. Title: `ao-os-api`
3. Key type: **Authentication key**
4. Paste the output from `cat ~/.ssh/id_ed25519.pub`
5. Click **Add SSH key**

Test the connection:

```bash
ssh -T git@github.com
# Expected: Hi jvr-beep! You've successfully authenticated, but GitHub does not provide shell access.
```

---

## 2. Clone the repository

```bash
# Use SSH (not HTTPS) — this avoids the username/password prompt entirely
git clone git@github.com:jvr-beep/AO-OS.git
cd AO-OS
```

> **If you prefer HTTPS with a PAT instead of SSH:**  
> 1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)  
> 2. Generate a token with `repo` scope  
> 3. Use it as the password when prompted:  
>    ```bash
>    git clone https://github.com/jvr-beep/AO-OS.git
>    # Username: jvr-beep
>    # Password: <paste your PAT here>
>    ```

---

## 3. Configure environment variables

```bash
cd apps/api
cp .env.example .env
nano .env   # or use your preferred editor
```

Key values to set:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/ao_os
APP_BASE_URL=https://api.aosanctuary.com
GOOGLE_REDIRECT_URI=https://api.aosanctuary.com/v1/auth/google/callback
```

---

## 4. Start the API with Docker Compose

```bash
# From the repo root
docker compose up -d

# Verify the API is healthy
curl http://localhost:4000/v1/health
# Expected: {"status":"ok"}
```

---

## 5. Set up the Cloudflare Tunnel

See [`infra/cloudflared/README.md`](../infra/cloudflared/README.md) for the full tunnel setup.  
Quick reference for day-to-day service management:

```bash
# Restart the tunnel (e.g. after editing infra/cloudflared/config.yml)
sudo systemctl restart cloudflared

# Check that the tunnel is healthy
sudo systemctl status cloudflared

# View live tunnel logs
sudo journalctl -u cloudflared -f
```

---

## 6. Pull updates

```bash
cd ~/AO-OS
git pull
docker compose up -d --build
```

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `Password authentication is not supported` | Using HTTPS with a plain password | Switch to SSH (step 1–2) or use a PAT |
| `Permission denied (publickey)` | SSH key not added to GitHub | Run `cat ~/.ssh/id_ed25519.pub` and add to GitHub Settings |
| `docker: command not found` | Docker not installed | `sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin` |
| API returns 502 via Cloudflare | API container not running | `docker compose ps` and `docker compose logs api` |
| `cloudflared` service failed | Config or credentials issue | `sudo journalctl -u cloudflared -n 50` |
