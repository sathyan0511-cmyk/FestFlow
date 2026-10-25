# CampusFix: Project Status & Architecture Specification

**Project Title:** CampusFix: An Explainable, Duplicate-Aware Campus Maintenance and Incident Prioritisation System Using Docker  
**Coursework / Module:** DA3 Academic Project  
**Status Date:** 2026-10-20  
**Overall Status:** Stage 3 Complete (Duplicate Complaint Detection Engine). Ready for REST APIs & Seed Data.

---

## 1. Executive Summary & Academic Value

Campus maintenance operations frequently struggle with:
1. **Duplicate Report Avalanches:** Multiple students and staff reporting the identical breakdown, overwhelming administrators.
2. **Opaque Incident Prioritisation:** Basic first-in, first-out queues or black-box machine learning models that students cannot explain or defend in academic examinations.

**CampusFix** addresses these issues through:
- **Transparent Multi-Factor Prioritisation:** Deterministic priority scoring combining severity, safety hazards, affected population, aging, and duplicate volume.
- **NLP Duplicate Detection:** Deterministic TF-IDF vector space modeling with cosine similarity and spatial/category heuristics.
- **SLA & Risk Estimation:** Proactive risk identification before deadlines are breached.
- **Microservices Deployment:** Docker Compose containerization for PostgreSQL, Flask, and React.

---

## 2. Completed Work (Stages 1, 2, & 3)

### 2.1 Workspace & Legacy Code Preservation
- All existing FestFlow files (`client/`, `server/`, `package.json`, `README.md`) remain untouched. All CampusFix code resides strictly in `backend/`.

### 2.2 Environment & Dependencies
- Virtual environment `backend/.venv` (Python 3.11.9) with `Flask==3.1.3`, `Flask-SQLAlchemy==3.1.1`, `Flask-Migrate==4.1.0`, `Flask-Cors==6.0.5`, `pytest==9.1.1`, `python-dotenv==1.2.4`, `psycopg2-binary==2.9.12`, `scikit-learn==1.9.1`, `scipy==1.17.1`.

### 2.3 Application Architecture & Relational Data Models
- Configuration hierarchy in `backend/app/config.py` (Development SQLite, Testing in-memory SQLite, Production PostgreSQL).
- Application factory in `backend/app/__init__.py` with `GET /api/health` and CLI `init-db`.
- Database models: `Incident`, `DuplicateCluster`, and `IncidentAuditLog`.

### 2.4 Explainable Prioritisation & SLA Engine (`backend/app/engines/priority.py`)
- Multi-factor deterministic priority formula bounded in $[0.0, 100.0]$:
  $$P = \min\left(100.0, \; \max\left(0.0, \; S_{\text{sev}} + S_{\text{safe}} + S_{\text{aff}} + S_{\text{age}} + S_{\text{dup}}\right)\right)$$
- Severity (Max 30), Safety Hazard (Max 25), Affected Population (Max 20, logarithmic), Aging (Max 15, linear 48h), Duplicate Escalation (Max 10).
- Dynamic SLA deadline assignment (`CRITICAL`: 4h, `HIGH`: 12h, `MEDIUM`: 24h, `LOW`: 48h).
- SLA status evaluation (`ON_TRACK`, `AT_RISK`, `BREACHED`, `COMPLIED`, `RESOLVED_BREACHED`).

### 2.5 Duplicate Complaint Detection Engine (`backend/app/engines/duplicate.py`)
- **Text Normalization:** Lowercasing, alphanumeric punctuation stripping, and campus-specific stopword removal (filtering conversational intake noise like "please", "urgently", "problem", "issue").
- **TF-IDF & Cosine Similarity:** Employs scikit-learn's `TfidfVectorizer` (unigrams with sublinear TF scaling) and `cosine_similarity`. Double-weights incident titles to boost semantic salience relative to long descriptions.
- **Contextual Signals:**
  - **Location Similarity ($S_{\text{loc}} \in [0.0, 1.0]$):** $1.0$ for exact building and room/detail match; $0.85$ for same building with specific room/area token overlap; $0.70$ for same building with distinct rooms; $0.40$ for cross-building specific keyword overlap; $0.0$ for unrelated locations.
  - **Category Similarity ($S_{\text{cat}} \in [0.0, 1.0]$):** $1.0$ for exact category match; $0.0$ otherwise.
- **Composite Scoring Formula:**
  $$S_{\text{composite}} = \text{round}\left(w_{\text{text}} \cdot S_{\text{text}} + w_{\text{loc}} \cdot S_{\text{loc}} + w_{\text{cat}} \cdot S_{\text{cat}}, 3\right)$$
  - $w_{\text{text}} = 0.65$ (Semantic cosine similarity)
  - $w_{\text{loc}} = 0.20$ (Spatial proximity heuristic)
  - $w_{\text{cat}} = 0.15$ (Maintenance category indicator)
  - $\sum w = 1.00$
- **Confidence Classifications & Thresholds:**
  - `HIGH_CONFIDENCE`: $S_{\text{composite}} \ge 0.70$ (Prominent merge recommendation).
  - `POTENTIAL_DUPLICATE`: $0.40 \le S_{\text{composite}} < 0.70$ (Surfaced for human administrator review).
  - `DISTINCT`: $S_{\text{composite}} < 0.40$ (Treated as unique maintenance breakdown).
- **Candidate Ranking:** Bulk vectorization across existing active incidents, filtering self-comparisons, and ranking descending by composite score up to top-$k$.
- **Model Adaptability:** Duck-typing support for SQLAlchemy `Incident` model instances, plain Python dictionaries, and generic test objects.

---

## 3. Test & Verification Evidence

All 65 automated tests passed cleanly with **zero warnings**:

```
Command: .\backend\.venv\Scripts\pytest.exe -v -s backend/tests

============================= test session starts =============================
platform win32 -- Python 3.11.9, pytest-9.1.1, pluggy-1.7.0
rootdir: C:\Users\sathy\FestFlow
collected 65 items

backend/tests/test_config.py::test_development_config PASSED
backend/tests/test_config.py::test_testing_config PASSED
backend/tests/test_config.py::test_production_config PASSED
backend/tests/test_config.py::test_config_by_name_mapping PASSED
backend/tests/test_duplicate.py::test_clean_text_normalization PASSED
backend/tests/test_duplicate.py::test_clean_text_empty_and_none PASSED
backend/tests/test_duplicate.py::test_identical_descriptions_produce_maximum_similarity PASSED
backend/tests/test_duplicate.py::test_near_identical_paraphrased_descriptions PASSED
backend/tests/test_duplicate.py::test_unrelated_descriptions_yield_near_zero_similarity PASSED
backend/tests/test_duplicate.py::test_out_of_vocabulary_and_small_corpus PASSED
backend/tests/test_duplicate.py::test_location_similarity_levels PASSED
backend/tests/test_duplicate.py::test_category_similarity PASSED
backend/tests/test_duplicate.py::test_high_confidence_duplicate_pair PASSED
backend/tests/test_duplicate.py::test_potential_duplicate_classification PASSED
backend/tests/test_duplicate.py::test_distinct_classification PASSED
backend/tests/test_duplicate.py::test_rank_candidates_sorting_and_top_k PASSED
backend/tests/test_duplicate.py::test_self_matching_exclusion PASSED
backend/tests/test_duplicate.py::test_empty_candidates_handling PASSED
backend/tests/test_duplicate.py::test_duck_typing_supports_objects_and_dicts PASSED
backend/tests/test_duplicate.py::test_duplicate_detector_determinism PASSED
backend/tests/test_duplicate.py::test_score_bounds_always_valid PASSED
backend/tests/test_duplicate.py::test_synthetic_evaluation_precision_recall_f1 PASSED
backend/tests/test_health.py::test_health_check_endpoint PASSED
backend/tests/test_health.py::test_404_error_handler PASSED
backend/tests/test_models.py::test_incident_creation_and_defaults PASSED
backend/tests/test_models.py::test_parent_duplicate_incident_relationship PASSED
backend/tests/test_models.py::test_duplicate_cluster_model PASSED
backend/tests/test_models.py::test_incident_audit_log PASSED
backend/tests/test_priority.py::test_absolute_minimum_score PASSED
backend/tests/test_priority.py::test_absolute_maximum_score_clamping PASSED
backend/tests/test_priority.py::test_severity_levels[LOW-7.5-LOW] PASSED
backend/tests/test_priority.py::test_severity_levels[MEDIUM-15.0-LOW] PASSED
backend/tests/test_priority.py::test_severity_levels[HIGH-22.5-LOW] PASSED
backend/tests/test_priority.py::test_severity_levels[CRITICAL-30.0-LOW] PASSED
backend/tests/test_priority.py::test_severity_monotonic_progression PASSED
backend/tests/test_priority.py::test_safety_hazard_versus_non_hazard PASSED
backend/tests/test_priority.py::test_hazard_taxonomy_scoring[ELECTRICAL-25.0] PASSED
backend/tests/test_priority.py::test_hazard_taxonomy_scoring[FIRE-25.0] PASSED
backend/tests/test_priority.py::test_hazard_taxonomy_scoring[STRUCTURAL-25.0] PASSED
backend/tests/test_priority.py::test_hazard_taxonomy_scoring[CHEMICAL-25.0] PASSED
backend/tests/test_priority.py::test_hazard_taxonomy_scoring[GAS_LEAK-25.0] PASSED
backend/tests/test_priority.py::test_hazard_taxonomy_scoring[TRIP_FALL-15.0] PASSED
backend/tests/test_priority.py::test_hazard_taxonomy_scoring[WATER_DAMAGE-15.0] PASSED
backend/tests/test_priority.py::test_hazard_taxonomy_scoring[SHATTERED_GLASS-15.0] PASSED
backend/tests/test_priority.py::test_hazard_taxonomy_scoring[UNSPECIFIED_NEW_HAZARD-20.0] PASSED
backend/tests/test_priority.py::test_affected_population_monotonicity_and_saturation PASSED
backend/tests/test_priority.py::test_aging_progression_and_cap PASSED
backend/tests/test_priority.py::test_future_creation_time_clamped PASSED
backend/tests/test_priority.py::test_duplicate_escalation_boost PASSED
backend/tests/test_priority.py::test_robustness_against_malformed_inputs[bad_input0] PASSED
backend/tests/test_priority.py::test_robustness_against_malformed_inputs[bad_input1] PASSED
backend/tests/test_priority.py::test_robustness_against_malformed_inputs[bad_input2] PASSED
backend/tests/test_priority.py::test_robustness_against_malformed_inputs[bad_input3] PASSED
backend/tests/test_priority.py::test_robustness_against_malformed_inputs[bad_input4] PASSED
backend/tests/test_priority.py::test_deterministic_identical_runs PASSED
backend/tests/test_priority.py::test_factor_breakdown_consistency PASSED
backend/tests/test_priority.py::test_sla_deadline_assignment[CRITICAL-4] PASSED
backend/tests/test_priority.py::test_sla_deadline_assignment[HIGH-12] PASSED
backend/tests/test_priority.py::test_sla_deadline_assignment[MEDIUM-24] PASSED
backend/tests/test_priority.py::test_sla_deadline_assignment[LOW-48] PASSED
backend/tests/test_priority.py::test_sla_deadline_assignment[UNKNOWN-24] PASSED
backend/tests/test_priority.py::test_sla_states_active_incident PASSED
backend/tests/test_priority.py::test_sla_states_resolved_incident PASSED
backend/tests/test_priority.py::test_timezone_naive_and_aware_interoperability PASSED
backend/tests/test_priority.py::test_exact_deadline_boundary PASSED

============================= 65 passed in 4.91s ==============================
```

---

## 4. Synthetic Benchmark Evaluation & Comparative Analysis

A reproducible benchmark comprising **20 realistic campus maintenance pairs** (10 true duplicate pairs and 10 true distinct pairs across HVAC, electrical hazards, lab water leaks, elevators, and structural issues) was evaluated:

| Metric | CampusFix TF-IDF Composite ($S_{\text{composite}} \ge 0.40$) | Baseline: Token Jaccard Overlap ($J \ge 0.30$) |
|---|:---:|:---:|
| **Precision** | **1.000** ($10/10$) | **1.000** ($6/6$) |
| **Recall** | **1.000** ($10/10$) | **0.600** ($6/10$) |
| **F1-Score** | **1.000** | **0.750** |
| **Confusion Matrix** | $\text{TP}=10, \text{FP}=0, \text{TN}=10, \text{FN}=0$ | $\text{TP}=6, \text{FP}=0, \text{TN}=10, \text{FN}=4$ |

### Limitations & Academic Assessment
1. **Synthetic vs Real-World Generalization:** Synthetic evaluation demonstrates algorithmic behavior under controlled lexical and spatial variation, but does not establish identical real-world operational accuracy across thousands of noisy, uncurated student submissions.
2. **Lexical Synonym Limitations:** As a bag-of-words / n-gram TF-IDF model, pure text similarity depends on shared vocabulary stems. While the composite engine compensates by weighting location (0.20) and category (0.15), reports that use disjoint synonyms (e.g. "lift" vs "elevator") rely heavily on contextual signals to reach the review threshold.
3. **Similarity vs Truth:** The composite score represents administrative similarity confidence, not mathematical proof that two reports correspond to the same physical breakdown. Human-in-the-loop review is intentionally preserved.

---

## 5. Important Commands

- **Run Complete Automated Test Suite (65 tests):**
  ```powershell
  .\backend\.venv\Scripts\pytest.exe -v -s backend/tests
  ```
- **Run Duplicate Detection Tests Only:**
  ```powershell
  .\backend\.venv\Scripts\pytest.exe -v -s backend/tests/test_duplicate.py
  ```
- **Run Priority Engine Tests Only:**
  ```powershell
  .\backend\.venv\Scripts\pytest.exe -v backend/tests/test_priority.py
  ```

---

## 6. Next Immediate Step

**Stage 4: REST API Endpoints & Demonstration Seeding**
- Implement `backend/app/routes/incidents.py`:
  - `POST /api/incidents`: Incident submission with automatic priority calculation and real-time duplicate scan.
  - `GET /api/incidents`: Filtered and paginated listing (by status, priority, category, building, search query).
  - `GET /api/incidents/<id>`: Detailed view with explainability payload and audit trail.
  - `PATCH /api/incidents/<id>/status`: Status updates with transition validation and audit logging.
  - `POST /api/incidents/<id>/merge-duplicate`: Administrative duplicate merger.
- Implement `backend/app/routes/analytics.py`:
  - `GET /api/analytics/summary`: KPI metrics, priority distribution, cluster stats, SLA compliance rate.
- Author demonstration seeding script (`backend/app/seeds/seed_data.py`) with rich campus breakdown scenarios.
