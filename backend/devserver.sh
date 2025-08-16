#!/usr/bin/env bash
set -euo pipefail

# Simple launcher for local dev
export PYTHONPATH=$(pwd)

if [ -f backend/.env ]; then
  set -a; source backend/.env; set +a
fi

uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
