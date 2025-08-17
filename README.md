# PhishGuard-AI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

*AI-powered phishing detection and analysis system*

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+

### Backend Setup
```bash
# Install and run backend
make install && make run
```

The backend will be available at `http://localhost:8000`

### Frontend Setup
```bash
# Install and run frontend
cd frontend && npm install && npm run dev
```

The frontend will be available at `http://localhost:3000`

### Quick Test
- Health check: `curl http://localhost:8000/healthz`
- Sample API call:
```bash
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"content": "Subject: Urgent Action Required", "type": "email"}'
```

## About PhishGuard-AI

PhishGuard-AI is an intelligent phishing detection system that combines machine learning models with advanced analysis techniques to identify and classify potentially malicious emails and content.

### Key Features
- Real-time phishing detection
- Email content analysis
- RESTful API for integration
- Structured logging with request tracking
- CORS protection and payload limits

### Architecture
- **Backend**: FastAPI-based Python service with DistilBERT model
- **Frontend**: Next.js React application
- **Database**: SQLite for analysis storage
- **Security**: CORS policies and request size limits
