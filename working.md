# CampusFix: Handover & Architecture Document (`working.md`)

**Project Title:** CampusFix: An Explainable, Duplicate-Aware Campus Maintenance and Incident Prioritisation System Using Docker  
**Coursework / Module:** DA3 Academic Assignment  
**Handover Date:** 2026-10-20  
**Current State:** Stages 0, 1, 2, and 3 are 100% complete and verified. Ready to begin **Stage 4: REST API Endpoints & Demonstration Seeding**.

---

## 1. Critical Working Rules & Workspace Preservation

1. **FestFlow Preservation (Strict Constraint):**
   - The root repository was originally created under the folder name `FestFlow` and contains an existing MERN project (`client/`, `server/`, `package.json`, `README.md`).
   - **DO NOT** delete, modify, or overwrite any existing FestFlow files!
   - All CampusFix backend code lives strictly inside `backend/`.
   - The future frontend will live in `frontend/`.
2. **Zero Paid APIs / No External Cloud AI:**
   - Uses only free and open-source dependencies (Flask, SQLAlchemy, scikit-learn, pytest, PostgreSQL, SQLite).
   - Deterministic algorithms only; everything must be transparent and explainable for college viva defense.
3. **Environment Reality:**
   - OS: Windows with PowerShell.
   - Python: Python `3.11.9` running inside `backend/.venv` (`.\backend\.venv\Scripts\python.exe`).
   - Node: Node `v24.22.0`, npm `11.19.1`.
   - Docker: Docker CLI is currently **not found on PATH**. Containerization (Dockerfile + docker-compose) is deferred to Stage 6; local dev/testing runs natively via Python + SQLite.

---

## 2. Completed Milestones

### Stage 0: Architecture & Inspection [COMPLETED]
- Workspace inspection and multi-container architecture design.
- Created `PROJECT_STATUS.md` and `TODO.md`.

### Stage 1: Backend Foundation & Data Models [COMPLETED]
- Created `backend/requirements.txt`, `backend/.gitignore`, and `backend/.env.example`.
- Created virtual environment `backend/.venv` with all dependencies (`Flask==3.1.3`, `Flask-SQLAlchemy==3.1.1`, `Flask-Migrate==4.1.0`, `Flask-Cors==6.0.5`, `pytest==9.1.1`, `python-dotenv==1.2.4`, `psycopg2-binary==2.9.12`, `scikit-learn==1.9.1`, `scipy==1.17.1`).
- Implemented `backend/app/config.py`:
  - `DevelopmentConfig`: Uses local SQLite (`campusfix_dev.db`).
  - `TestingConfig`: Uses in-memory SQLite (`sqlite:///:memory:`).
  - `ProductionConfig`: Configured for PostgreSQL (`postgresql://campusfix_user:campusfix_secure_pass_2026@localhost:5432/campusfix`).
- Implemented `backend/app/__init__.py`:
  - App factory with `GET /api/health` and CLI `flask --app backend/wsgi.py init-db`.
- Implemented SQLAlchemy models in `backend/app/models/`:
  - `Incident`: Core table with tracking number, severity, safety hazard flags, affected population, aging, SLA deadline, priority score, and self-referential parent/duplicate relationships.
  - `DuplicateCluster`: Groups corroborating incident reports. Resolves circular foreign key using `use_alter=True, name="fk_cluster_canonical_incident"`.
  - `IncidentAuditLog`: Immutable history of status transitions, duplicate mergers, and priority recalculations.

### Stage 2: Explainable Prioritisation & SLA Engine [COMPLETED]
- Implemented `backend/app/engines/priority.py`:
  - **Deterministic Priority Formula:**
    $$P = \min\left(100.0, \; \max\left(0.0, \; S_{\text{sev}} + S_{\text{safe}} + S_{\text{aff}} + S_{\text{age}} + S_{\text{dup}}\right)\right)$$
    * **Severity ($S_{\text{sev}}$):** Max 30.0 pts (`CRITICAL`: 30.0, `HIGH`: 22.5, `MEDIUM`: 15.0, `LOW`: 7.5).
    * **Safety Hazard ($S_{\text{safe}}$):** Max 25.0 pts (Acute hazards `ELECTRICAL`, `FIRE`, `STRUCTURAL`, `CHEMICAL`, `GAS_LEAK`: 25.0; Physical hazards `TRIP_FALL`, `WATER_DAMAGE`, `SHATTERED_GLASS`: 15.0; General: 20.0; None: 0.0).
    * **Affected Population ($S_{\text{aff}}$):** Max 20.0 pts. Smooth logarithmic scaling: $20.0 \times \frac{\log_{10}(1 + N)}{\log_{10}(1 + 500)}$ saturating at 500 occupants.
    * **Aging Factor ($S_{\text{age}}$):** Max 15.0 pts. Linear progression: $\min(15.0, \frac{t_{\text{hours}}}{48.0} \times 15.0)$.
    * **Duplicate Escalation ($S_{\text{dup}}$):** Max 10.0 pts. Corroborating reports boost: $\min(10.0, \frac{D}{5.0} \times 10.0)$.
  - **Priority Tiers & SLA Policy:**
    * `CRITICAL`: $P \ge 75.0 \implies 4\text{h}$
    * `HIGH`: $55.0 \le P < 75.0 \implies 12\text{h}$
    * `MEDIUM`: $35.0 \le P < 55.0 \implies 24\text{h}$
    * `LOW`: $P < 35.0 \implies 48\text{h}$
  - **SLA Evaluation States:**
    * Active Incidents: `ON_TRACK`, `AT_RISK` ($\le 25\%$ or $\le 2\text{h}$ remaining), `BREACHED`.
    * Resolved Incidents: `COMPLIED`, `RESOLVED_BREACHED`.
  - **Explainability:** Returns exact point breakdown + human-readable rationale.

### Stage 3: Duplicate Complaint Detection Engine [COMPLETED]
- Implemented `backend/app/engines/duplicate.py`:
  - **Text Preprocessing:** Lowercasing, alphanumeric punctuation stripping, and campus stopword removal.
  - **TF-IDF & Cosine Similarity:** Uses scikit-learn `TfidfVectorizer` (unigrams with sublinear TF scaling) and `cosine_similarity`. Double-weights titles to elevate salient breakdown keywords.
  - **Contextual Signals:**
    * Location similarity ($S_{\text{loc}}$): $1.0$ (exact building + room), $0.85$ (same building + specific room overlap), $0.70$ (same building, distinct room), $0.40$ (cross-building specific keyword overlap), $0.0$ (unrelated).
    * Category similarity ($S_{\text{cat}}$): $1.0$ (matching category), $0.0$ (different).
  - **Composite Score:**
    $$S_{\text{composite}} = \text{round}(0.65 \cdot S_{\text{text}} + 0.20 \cdot S_{\text{loc}} + 0.15 \cdot S_{\text{cat}}, 3)$$
  - **Confidence Classifications:**
    * `HIGH_CONFIDENCE`: $S_{\text{composite}} \ge 0.70$ (Auto-suggest prominent merge).
    * `POTENTIAL_DUPLICATE`: $0.40 \le S_{\text{composite}} < 0.70$ (Surfaced for human review).
    * `DISTINCT`: $S_{\text{composite}} < 0.40$ (Unique incident).
  - **Duck-Typing:** Accepts SQLAlchemy `Incident` models, plain dictionaries, or test objects.
  - **Synthetic Benchmark Results:** Precision = 1.000, Recall = 1.000, F1 = 1.000 (outperforming Jaccard baseline F1 = 0.750).

---

## 3. Current Test Status

**All 65 automated tests pass cleanly with zero warnings:**
```powershell
.\backend\.venv\Scripts\pytest.exe -v -s backend/tests
```
- `test_config.py` (4 tests)
- `test_health.py` (2 tests)
- `test_models.py` (4 tests)
- `test_priority.py` (37 tests)
- `test_duplicate.py` (18 tests)

---

## 4. Exact Next Steps: Stage 4 (REST API Endpoints & Seed Data)

The fresh agent taking over should implement **Stage 4**:

### Task 4.1: Incident Management API (`backend/app/routes/incidents.py`)
- Register Blueprint `incidents_bp` in `backend/app/__init__.py` under `/api/incidents`.
- Endpoints to implement:
  1. `POST /api/incidents`:
     - Validates payload: `title`, `description`, `category`, `building`, `location_details`, `reporter_name`, `reporter_email`, `severity`, `is_safety_hazard`, `hazard_type`, `affected_people_count`.
     - Automatically calculates priority and SLA using `PriorityEngine.calculate_priority(...)`.
     - Automatically scans existing active incidents using `DuplicateDetector.rank_candidates(...)`.
     - Generates unique tracking number (e.g. `CF-2026-0001`).
     - Creates incident, logs `CREATED` in `IncidentAuditLog`.
     - Returns incident dict + potential duplicate warning if any found.
  2. `GET /api/incidents`:
     - Filter by: `status`, `priority_level`, `category`, `building`, `is_safety_hazard`.
     - Search by keyword (title/description/tracking number).
     - Sorting: by `priority_score` (descending default), `created_at`, `sla_deadline`.
     - Pagination: `page`, `per_page` (default 20).
  3. `GET /api/incidents/<id>`:
     - Returns full incident detail, live SLA evaluation state (`PriorityEngine.evaluate_sla_status`), factor explainability card, and full audit logs.
  4. `PATCH /api/incidents/<id>/status`:
     - Updates status (`REPORTED` -> `UNDER_REVIEW` -> `IN_PROGRESS` -> `RESOLVED` -> `CLOSED`).
     - Accepts `resolution_notes`, `resolved_by`.
     - Records entry in `IncidentAuditLog`.
  5. `POST /api/incidents/check-duplicates`:
     - Real-time pre-submission check for the user as they type their complaint in the frontend form.
  6. `POST /api/incidents/<id>/merge-duplicate`:
     - Merges a duplicate incident into a primary/canonical incident.
     - Marks duplicate as `is_duplicate=True, status="DUPLICATE", parent_incident_id=canonical_id`.
     - Adds/updates `DuplicateCluster`, increments duplicate count.
     - Recalculates primary incident's priority score with the escalated duplicate count!
     - Logs `DUPLICATE_MERGED` and `PRIORITY_RECALCULATED` in `IncidentAuditLog`.

### Task 4.2: Analytics API (`backend/app/routes/analytics.py`)
- Register Blueprint `analytics_bp` in `backend/app/__init__.py` under `/api/analytics`.
- Endpoint `GET /api/analytics/summary`:
  - Total incident count, active vs resolved.
  - Priority distribution (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
  - Category breakdown.
  - SLA compliance metrics (on-track count, at-risk count, breached count, resolution SLA adherence rate).
  - Duplicate reduction rate: $\frac{\text{duplicate complaints merged}}{\text{total complaints reported}} \times 100\%$.

### Task 4.3: Demonstration Seed Script (`backend/app/seeds/seed_data.py`)
- Creates rich, realistic campus incident scenarios:
  - 15+ realistic incidents across multiple campus buildings (Science Block, Central Library, Hostel 4, Dining Hall, Lecture Complex).
  - Includes deliberate duplicate clusters (e.g. 3 independent reports of the same library window shattered or restroom flood).
  - Tests SLA states (some open and on-track, some at-risk, some breached for demonstration).
- Document CLI command to run seeds: `python -m app.seeds.seed_data`.

### Task 4.4: Integration Tests (`backend/tests/test_api.py`)
- Author comprehensive tests covering all REST endpoints with `client` and `db_session` fixtures.

---

## 5. Important Commands Cheatsheet

```powershell
# 1. Run all backend tests (must pass before and after changes)
.\backend\.venv\Scripts\pytest.exe -v -s backend/tests

# 2. Run database table creation
.\backend\.venv\Scripts\python.exe -m flask --app backend/wsgi.py init-db

# 3. Start local development server (port 5000)
.\backend\.venv\Scripts\python.exe backend/wsgi.py

# 4. Check git status (ensure FestFlow files remain untracked / untouched)
git status
```
