# CampusFix: Project Master Task List (TODO)

## Stage 0: Architecture, Inspection & Planning [COMPLETED]
- [x] Workspace inspection (Python 3.11.9, Node 24.22.0, Docker CLI check, existing FestFlow files)
- [x] Formulate explainable mathematical prioritisation formula and duplicate detection pipeline
- [x] Design relational schema with audit tracking and duplicate clustering
- [x] Author comprehensive `PROJECT_STATUS.md` and `TODO.md`
- [x] Align with user constraints: preserve FestFlow, defer algorithms, test environment isolation

## Stage 1: Backend Foundation, Data Models & Quality Checks [COMPLETED]
- [x] Setup Python environment configuration (`backend/requirements.txt`, `backend/.gitignore`, `backend/.env.example`)
- [x] Verify full dependency installation (Flask 3.1.3, Flask-SQLAlchemy 3.1.1, Flask-Migrate 4.1.0, Flask-Cors 6.0.5, pytest 9.1.1, scikit-learn 1.9.1, scipy 1.17.1, psycopg2-binary 2.9.12)
- [x] Implement Flask application factory with CORS, error handlers, and CLI commands (`backend/app/__init__.py`)
- [x] Implement environment configurations for Development (SQLite), Testing (in-memory SQLite), and Production (PostgreSQL) (`backend/app/config.py`)
- [x] Implement SQLAlchemy database models (`backend/app/models/incident.py`, `backend/app/models/audit.py`)
- [x] Implement `GET /api/health` endpoint reporting service, version, and database status
- [x] Implement documented database initialization command (`flask --app backend/wsgi.py init-db`)
- [x] Author comprehensive pytest suite (`test_config.py`, `test_health.py`, `test_models.py`)
- [x] Execute automated tests and verify 10/10 tests passing with zero warnings
- [x] Verify FestFlow files (`client/`, `server/`, `package.json`, `README.md`) remain completely intact

## Stage 2: Explainable Prioritisation & SLA Engine [COMPLETED]
- [x] Implement Explainable Prioritisation Engine (`backend/app/engines/priority.py`):
  - [x] Multi-factor deterministic formula (Severity, Safety Hazard, Affected Count, Aging, Duplicate Escalation)
  - [x] Bounded strictly in [0.0, 100.0] with logarithmic population saturation and linear aging bounds
  - [x] Dynamic SLA deadline computation (Critical: 4h, High: 12h, Medium: 24h, Low: 48h)
  - [x] Structured explainability payload (JSON mathematical factor breakdown + human narrative)
  - [x] SLA state evaluator (`ON_TRACK`, `AT_RISK`, `BREACHED`, `COMPLIED`, `RESOLVED_BREACHED`) with timezone-aware handling
  - [x] Robust input sanitization preventing NaN, infinity, and crashes on corrupt inputs
- [x] Author comprehensive unit tests (`backend/tests/test_priority.py` - 37 tests)
- [x] Verify 47/47 tests passing across the backend suite in 0.21s

## Stage 3: Duplicate Complaint Detection Engine [COMPLETED]
- [x] Implement Duplicate Complaint Detection Engine (`backend/app/engines/duplicate.py`):
  - [x] Text normalization, punctuation stripping, and campus stopword removal
  - [x] scikit-learn `TfidfVectorizer` and `cosine_similarity`
  - [x] Spatial (building & specific area) and categorical composite heuristics
  - [x] Transparent composite scoring formula ($w_{\text{text}}=0.65, w_{\text{loc}}=0.20, w_{\text{cat}}=0.15$)
  - [x] Confidence classifications: `HIGH_CONFIDENCE` (>=0.70), `POTENTIAL_DUPLICATE` (0.40 - 0.70), `DISTINCT` (<0.40)
  - [x] Duck-typing compatibility for SQLAlchemy `Incident` models, plain dictionaries, and test objects
  - [x] Bulk candidate ranking with top-$k$ filtering and self-matching exclusion
- [x] Author comprehensive pytest suite (`backend/tests/test_duplicate.py` - 18 tests)
- [x] Include reproducible synthetic benchmark dataset evaluating Precision, Recall, and F1-score vs Jaccard baseline
- [x] Verify 65/65 tests passing across the entire backend suite in 4.91s

## Stage 4: REST API Endpoints & Demonstration Seeding [NEXT]
- [ ] Implement Incident Management API endpoints (`backend/app/routes/incidents.py`):
  - [ ] `POST /api/incidents`: Intake with auto priority calculation and duplicate candidate scanning
  - [ ] `GET /api/incidents`: Filtered, sorted, and paginated listing (by status, priority, category, building, search)
  - [ ] `GET /api/incidents/<id>`: Detailed view with explainability card and audit history
  - [ ] `PATCH /api/incidents/<id>/status`: Status transitions with validation and audit log generation
- [ ] Implement Duplicate Review API endpoints:
  - [ ] `POST /api/incidents/check-duplicates`: Real-time duplicate check for user form typing
  - [ ] `POST /api/incidents/<id>/merge-duplicate`: Associate duplicate incident to master incident
  - [ ] `POST /api/incidents/<id>/mark-distinct`: Dismiss suggested duplicate with reason
- [ ] Implement Analytics API endpoints (`backend/app/routes/analytics.py`):
  - [ ] `GET /api/analytics/summary`: Aggregate counts, priority distribution, cluster stats, SLA compliance
- [ ] Author realistic demonstration seed script (`backend/app/seeds/seed_data.py`) with deliberate duplicates
- [ ] Run backend API integration tests with pytest

## Stage 5: Modern React + Vite Frontend
- [ ] Scaffold `frontend/` with React, Vite, and cohesive design system
- [ ] Incident intake form with real-time duplicate warning modal
- [ ] Operations board with filtering, sorting, and priority/SLA badges
- [ ] Incident detail view with interactive priority explainability breakdown card and duplicate merge controls
- [ ] Analytics dashboard with KPI cards and charts
- [ ] Frontend build verification

## Stage 6: Docker Containerization & Deployment Orchestration
- [ ] Backend Dockerfile (Python 3.11, Gunicorn, PostgreSQL driver)
- [ ] Frontend Dockerfile (multi-stage Node build + Nginx static server)
- [ ] `docker-compose.yml` orchestrating PostgreSQL 16, backend API, and frontend client
- [ ] Containerized healthchecks, environment configs, and volume persistence

## Stage 7: Academic Documentation & Viva Defense Guide
- [ ] Complete Academic Project Report (DA3 documentation) with architecture diagrams, KaTeX formulations, and database schemas
- [ ] Viva Voce Defense Guide (`docs/VIVA_QUESTIONS_AND_ANSWERS.md`)
