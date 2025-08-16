# APM Project Memory Bank

Project Goal: Build a phishing detection web app with self-hosted primary models (DistilBERT for email, XGBoost for URL) and optional DeepSeek augmentation for human-readable explanations, with Next.js frontend and FastAPI backend.
Date Initiated: 2025-08-15
Manager Agent Session ID: N/A
Implementation Plan Reference: `Implementation_Plan.md`

---

## Log Entries

---
**Agent:** Implementer A (Backend/ML)
**Task Reference:** Phase 1 / Task 1) Backend (Implementer A)

**Summary:**
Scaffolded FastAPI backend MVP with POST /api/analyze (email only), preprocessing, DistilBERT loader stub, SQLite persistence via SQLModel, unit tests, and README quickstart. Local test run deferred due to shell issue.

**Details:**
- Project setup: FastAPI app, CORS, request_id middleware, health route, settings from env (.env.example added).
- Preprocessing: HTML unescape/strip, disallowed patterns check, truncate to 5000, SHA-256 content_hash.
- Inference: Model service with lazy-loaded Transformers/Torch; MVP heuristics for indicators; warmup on startup; timeout guard.
- API route: Validates type=email, enforces 2MB limit, runs preprocess→infer→persist, returns AnalyzeResponse; adds x-request-id.
- Persistence: SQLModel `Analysis` table; SQLite init on startup; save record after inference.
- Tests: Unit tests for preprocessing and API route (with inference stub).
- Docs/DevEx: README quickstart section; package.json scripts; pytest.ini; devserver.sh.

**Output/Result:**
```text
Files created/updated:
- backend/.env.example
- backend/requirements.txt
- backend/app/main.py
- backend/app/core/settings.py
- backend/app/schemas.py
- backend/app/models/analysis.py
- backend/app/services/preprocess.py
- backend/app/services/model.py
- backend/app/services/db.py
- backend/app/routers/analyze.py
- backend/tests/test_preprocess.py
- backend/tests/test_api.py
- backend/devserver.sh
- backend/pytest.ini
- backend/logging.json
- backend/__init__.py
- backend/app/__init__.py
- package.json (scripts: dev, test)
- README.md (Backend Quickstart)
Endpoints:
- GET /healthz
- POST /api/analyze
```

**Status:** Partially Completed

**Issues/Blockers:**
- VS Code integrated terminal failed to start (/bin/zsh -l exit code 127), so venv setup and pytest could not be run from IDE.
- EMAIL_MODEL_PATH not yet pointed to a local DistilBERT directory; inference uses lazy imports and route tests stub the model.
- p95 < 400ms latency not measured yet.

**Next Steps (Optional):**
- Fix terminal shell init (guard failing lines in ~/.zshrc) or use bash; then:
````
---
**Agent:** Implementer A (Backend/ML)
**Task Reference:** Phase 1 / Task 1) Backend (Implementer A)

**Summary:**
Troubleshot local environment setup on macOS, adjusted dependencies (removed hard pin on torch), tightened preprocessing security checks, made model imports lazy, and documented Python 3.11 + PyTorch install steps. Deferred runtime verification to a later session per user.

**Details:**
- Dependency fix: Removed `torch==2.3.1` from `backend/requirements.txt` (PyTorch wheels are platform-specific) and noted separate install.
- Model service: Switched to lazy imports for `transformers`/`torch` and stored torch reference; set default inference timeout to 0.5s to aid p95 target.
- Preprocessing: Strengthened disallowed pattern to `<\s*script` and validated patterns before stripping tags.
- DB: Ensured SQLite engine uses `check_same_thread=False` and added guard to initialize engine on save path.
- Docs/DevEx: Added Backend Quickstart to `README.md`; clarified venv usage and correct pip paths; added `package.json` scripts (`dev`, `test`).
- Guidance provided for fixing terminal `/bin/zsh -l` exit 127 and for switching to Python 3.11 due to `tokenizers`/PyO3 Python 3.13 incompatibility.

**Output/Result:**
```text
Files touched in this session:
- backend/requirements.txt (remove torch; add note)
- backend/app/services/preprocess.py (pattern + order of checks)
- backend/app/services/model.py (lazy imports, timeout)
- backend/app/services/db.py (SQLite connect args + guard)
- README.md (Backend Quickstart)
- package.json (scripts: dev, test)

Key commands for next session (from repo root):
python3.11 -m venv .venv && source .venv/bin/activate
python -m pip install -U pip wheel
python -m pip install -r backend/requirements.txt
python -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
cp backend/.env.example backend/.env
# set EMAIL_MODEL_PATH (example)
echo 'EMAIL_MODEL_PATH="models/email"' >> backend/.env
mkdir -p models/email
python - << 'PY'
from transformers import AutoTokenizer, AutoModelForSequenceClassification as M
m='distilbert-base-uncased'
AutoTokenizer.from_pretrained(m).save_pretrained('models/email')
M.from_pretrained(m).save_pretrained('models/email')
PY
pytest -q backend
bash backend/devserver.sh
```

**Status:** Partially Completed

**Issues/Blockers:**
- VS Code integrated terminal failing with `/bin/zsh -l` (exit 127) prevents running commands in-IDE.
- Python 3.13 causes `tokenizers` build failure (PyO3 supports ≤3.12); requires Python 3.11 per project spec.
- PyTorch must be installed via the correct wheel index for the platform.
- p95 latency not yet measured; real model inference not yet verified locally.

**Next Steps (Optional):**
- Switch to Python 3.11 venv and run the “Key commands” above.
- Verify `POST /api/analyze` end-to-end using the local DistilBERT folder.
- Measure p95 (< 400ms target) with a small load tool and record results in Memory Bank.
````

---
**Agent:** Debugger Agent (Backend)
**Task Reference:** Phase 1 / Task 1) Backend (Implementer A) — Validation & Debugging

**Summary:**
Completed validation of the FastAPI MVP for `POST /api/analyze` (email). Tests pass, persistence verified, and local p95 latency within target.

**Details:**
- Fixed tests by importing the model module in `backend/app/routers/analyze.py` (enables monkeypatch) and broadening `AnalyzeRequest.type` to accept "email"|"url" (router enforces 400 for non-email).
- Ran tests: 6 passed.
- Set up Python 3.11 env, installed CPU PyTorch, saved DistilBERT to `models/email`, started API; verified `/healthz` and `POST /api/analyze` with `x-request-id`.
- Verified SQLite persistence (analyses count 64; latest row includes expected fields).
- Measured performance: p95 57.39 ms; mean 40.95 ms on local CPU.
- Security/limits validated: 2MB payload guard; disallowed `<\s*script` and `{{...}}` patterns return 400.

**Output/Result:**
```text
Tests: 6 passed, 0 failed
Performance: p95=57.39 ms, mean=40.95 ms
DB: SELECT COUNT(*) FROM analyses -> 64
Sample response (redacted): { "risk_score": ~0.49, "classification": "safe", "indicators": [...] }
Config: EMAIL_MODEL_PATH=models/email; DATABASE_URL=sqlite:///./app.db
```

**Status:** Completed

**Issues/Blockers:**
None

**Next Steps (Optional):**
Proceed to Phase 2: URL analysis (XGBoost), `/api/history`, migrations to Postgres, dashboard integration.