# FestFlow Visual Documentation & Screenshots

This directory organizes visual documentation and verification artifacts for the FestFlow College Event Management System.

---

## Folder Organization

```
screenshots/
├── application/       # Screenshots of live application UI across all 4 user roles
├── database/          # Screenshots from MongoDB Atlas Cluster & MongoDB Compass
└── testing/           # Terminal verification outputs, test suites, and build evidence
```

---

## Deliverables Checklist

- [ ] **Application UI** (`screenshots/application/`):
  - `login_role_selection.png`: Unified login page with 4-role 1-click evaluation quick-fill buttons.
  - `student_event_discovery.png`: Student event catalog with category filtering and search.
  - `student_event_details.png`: Event detail profile with seat availability, schedule, and venue details.
  - `student_digital_passes.png`: Student e-ticket pass wallet with QR verification tokens.
  - `organizer_my_clubs.png`: Organizer "My Clubs" section and campus clubs directory.
  - `organizer_event_management.png`: Organizer dashboard with club-scoped event scheduling.
  - `organizer_event_finances.png`: Financial ledger with dynamic net profit calculation.
  - `faculty_dashboard.png`: Faculty coordinator dashboard with supervised clubs.
  - `faculty_club_management.png`: Dedicated club management console (`/manage/club/:id`).
  - `faculty_assign_organizer.png`: Faculty modal for appointing student organizers.
  - `admin_faculty_management.png`: Admin faculty account provisioning console.
  - `competitions_leaderboard.png`: Hackathon contest page with live judge scores and podium leaderboard.
  - `certificate_verification.png`: Tamper-proof certificate verification portal.
- [ ] **Database Evidence** (`screenshots/database/`):
  - `atlas_cluster_overview.png`: MongoDB Atlas cluster overview showing cloud deployment (credentials masked).
  - `atlas_collections_roster.png`: Directory of all 18 collections in MongoDB Atlas.
  - `atlas_document_inspector.png`: Document inspector showing normalized references.
  - `atlas_compound_indexes.png`: MongoDB index explorer showing unique compound indexes (`{ user: 1, event: 1 }`).
- [ ] **Automated Testing** (`screenshots/testing/`):
  - `backend_test_results.png`: Terminal output of `tests/runServerTest.js` (14/14 Modules PASSED).
  - `faculty_hierarchy_test_results.png`: Terminal output of `tests/faculty_and_clubs.test.js` (22/22 PASSED).
  - `permissions_test_results.png`: Terminal output of `tests/permissions.test.js` (17/17 PASSED).
  - `master_test_runner_results.png`: Terminal output of `tests/run_all.js` (Consolidated 53/53 PASSED).
  - `frontend_build_results.png`: Terminal output of `npm run build --prefix client` (0 errors).

Refer to the respective subdirectories for capturing specifications and existing verification logs.
