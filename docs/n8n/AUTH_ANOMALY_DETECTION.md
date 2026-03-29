# AO OS Auth Anomaly Detection (n8n)

Workflow file: `docs/n8n/AO_OS_Auth_Anomaly_Detection_v1.0.0_dynamic-jwt.json`

## Purpose

Detect repeated `auth.login_failed` events in the event stream and alert operations when failures exceed a threshold in a rolling time window.

## Detection Logic

- Source endpoint: `GET /v1/events/poll`
- Event filter: `type === "AuthEvent"` and `data.eventType === "auth.login_failed"`
- Group key priority:
  1. `memberId`
  2. `attemptedEmail`
  3. `ipAddress`
  4. `unknown`
- Trigger condition: grouped failures `>= AO_OS_AUTH_FAILURE_THRESHOLD` inside `AO_OS_AUTH_ANOMALY_WINDOW_MINUTES`

## Required Environment Variables

- `AO_OS_API_BASE` (example: `https://api.aosanctuary.com/v1`)
- `AO_OS_N8N_EMAIL`
- `AO_OS_N8N_PASSWORD`
- `AO_OS_ALERT_EMAIL`
- `NOTION_API_KEY`
- `NOTION_OPERATIONAL_LOG_DB_ID`

## Optional Environment Variables

- `AO_OS_AUTH_FAILURE_THRESHOLD` (default: `5`)
- `AO_OS_AUTH_ANOMALY_WINDOW_MINUTES` (default: `15`)
- `AO_OS_AUTH_ALERT_COOLDOWN_MINUTES` (default: `30`)
- `NOTION_SECURITY_ALERT_DB_ID` (if set, anomalies are logged here first)

## Outputs

- Notion page per anomaly group with summary + recent failures
- Gmail alert per anomaly group with threshold/window/reason breakdown

## Cooldown Suppression

- Cooldown key: grouped identity (`memberId` or `attemptedEmail` or `ipAddress`)
- If the same identity re-triggers within cooldown window, email is suppressed
- Suppressed anomalies are still written to Notion with `Status = Anomaly Suppressed`

## Notes

- This workflow assumes `AuthEvent` is included in events polling and that staff credentials can access `/v1/events/poll`.
- If no anomalies are detected in a run, downstream Notion/Gmail nodes receive zero items and do not execute.
