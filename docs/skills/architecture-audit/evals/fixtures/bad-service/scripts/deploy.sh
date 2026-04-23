#!/bin/bash
# "CI/CD" — run locally, SSH to prod, pull and restart
ssh deploy@prod.internal.example "cd /opt/app && git pull && pm2 restart app"
