# n8n: Google Drive Policy Sync

**Workflow ID:** `kG5zqJn3INv8yFgw`  
**URL:** https://aoos.app.n8n.cloud/workflow/kG5zqJn3INv8yFgw  
**Status:** Created — requires activation (see setup steps below)

---

## What It Does

Polls the AO Google Drive policy folder every 15 minutes.  
When a Google Doc is created or modified, it exports the file as plain text and commits it to `docs/policy/` in this repo via the GitHub REST API.

File naming: Google Doc title → slugified → `docs/policy/{slug}.md`  
Commit author: `AO-OS Bot <bot@aosanctuary.com>`

---

## Setup (one-time)

### 1. Set the Drive folder ID

In n8n, open the **Watch Policy Folder** node.  
Replace `REPLACE_WITH_DRIVE_FOLDER_ID` with the actual Google Drive folder ID.

To get the folder ID: open the AO policy folder in Drive → copy the ID from the URL:  
`https://drive.google.com/drive/folders/{FOLDER_ID}`

### 2. Connect Google Drive credentials

The `Watch Policy Folder` and `Download as Text` nodes need a Google Drive OAuth2 credential.  
Use the existing `Google Drive OAuth2 API` credential (auto-assigned) or connect the account that owns the AO policy folder.

### 3. Create a GitHub API credential

The `Get Existing File` and `Commit to GitHub` nodes use HTTP Request nodes with header auth.

Create a new credential in n8n:
- **Type:** Header Auth
- **Name:** GitHub API Token
- **Name (header):** `Authorization`
- **Value:** `Bearer ghp_YOUR_PERSONAL_ACCESS_TOKEN`

The token needs `repo` scope (read + write contents) on the `jvr-beep/AO-OS` repo.

Assign this credential to both HTTP Request nodes.

### 4. Activate the workflow

Toggle the workflow to **Active** in n8n. It will poll every 15 minutes from that point forward.

---

## Node Reference

| Node | Type | Purpose |
|---|---|---|
| Watch Policy Folder | Google Drive Trigger | Detects created/modified Google Docs in the policy folder |
| Download as Text | Google Drive | Exports the Doc as `text/plain` binary |
| Build Payload | Code | Converts binary → base64, builds file path + commit message |
| Get Existing File | HTTP Request (GET) | Fetches current file from GitHub to get its SHA (needed for updates) |
| Build PUT Body | Code | Assembles GitHub API PUT body — includes `sha` if file exists |
| Commit to GitHub | HTTP Request (PUT) | Writes the file to `docs/policy/` via GitHub Contents API |

---

## Notes

- Google Docs are exported as plain text (`.txt` content) then committed as `.md`. For full markdown, convert docs in Drive to markdown format or use a Docs-to-Markdown add-on.
- The workflow will not create commits if the file content is unchanged (GitHub API returns 200 with same SHA and rejects a PUT with identical content).
- All commits appear as `AO-OS Bot` in git history and are pushed to `main` branch.
