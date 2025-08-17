# Simple developer commands

.PHONY: venv install test run load kill8000

VENV=backend/.venv311
PY=$(VENV)/bin/python
PIP=$(VENV)/bin/pip

venv:
	python3.11 -m venv $(VENV)
	$(PIP) install -U pip setuptools wheel

install: venv
	$(PIP) install -r backend/requirements.txt
	# Optional: CPU-only Torch (macOS x86_64)
	# $(PIP) install torch==2.2.2 --index-url https://download.pytorch.org/whl/cpu

test:
	cd backend && $(PY) -m pytest -q

run:
	PYTHONPATH=$(PWD) $(PY) -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

load:
	cd backend && BASE_URL=http://127.0.0.1:8000 N=100 CONCURRENCY=10 $(PY) scripts/load_test.py

kill8000:
	-@lsof -nP -iTCP:8000 -sTCP:LISTEN | awk 'NR>1{print $$2}' | xargs -r kill -9
