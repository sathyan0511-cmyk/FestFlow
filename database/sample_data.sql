-- =============================================================================
-- FestFlow: College Event Management System
-- Sample Data: Relational DML Reference Implementation
-- =============================================================================
-- NOTE FOR EVALUATOR:
-- FestFlow's live production application uses MongoDB Atlas (NoSQL Document Store)
-- with Mongoose ODM (populated via server/src/utils/seedData.js).
-- This file provides the standardized ANSI SQL / Relational DML dataset
-- derived from the authoritative College Event Management System Normalisation
-- design chart to satisfy DBMS coursework submission specifications.
-- =============================================================================

-- 1. Insert Users
INSERT INTO users (user_id, name, email, password_hash, phone, role, participant_type, register_number, department, programme, year_of_study, section) VALUES
('usr_admin_001', 'Dr. Rajesh Sharma', 'admin@festflow.edu', '$2a$10$eO1d...hashed', '+91 98765 43210', 'admin', 'student', 'FAC_CS_01', 'Dean of Student Affairs', 'Ph.D', NULL, NULL),
('usr_faculty_001', 'Prof. K. Sundaram', 'faculty@festflow.edu', '$2a$10$eO1d...hashed', '+91 94440 12345', 'faculty', 'student', 'FAC_CS_12', 'Computer Science and Engineering', 'M.Tech', NULL, NULL),
('usr_org_001', 'Aarav Mehta', 'organizer@festflow.edu', '$2a$10$eO1d...hashed', '+91 98765 43211', 'organizer', 'student', '2023CS204', 'Computer Science and Engineering', 'B.Tech', 3, 'A'),
('usr_stud_001', 'Ananya Iyer', 'student@festflow.edu', '$2a$10$eO1d...hashed', '+91 98765 43212', 'student', 'student', '2024EC105', 'Electronics & Communication', 'B.Tech', 2, 'B');

-- 2. Insert Clubs
INSERT INTO clubs (club_id, name, description, category, contact_email, contact_phone, establishment_date, faculty_coordinator_id, status) VALUES
('club_codenexus_001', 'CodeNexus Developers Club', 'Premier open-source, competitive programming, and developer community.', 'Technical', 'codenexus@festflow.edu', '+91 98765 11111', '2022-08-15', 'usr_faculty_001', 'active'),
('club_finearts_002', 'Vibrant Expressions Fine Arts Guild', 'Fostering traditional, contemporary, digital art, and creative installations.', 'Arts', 'finearts@festflow.edu', '+91 98765 22222', '2021-03-10', NULL, 'active'),
('club_robotics_003', 'Autonomous Robotics & IoT Society', 'Building autonomous mobile robots, drones, and edge intelligence systems.', 'Technical', 'robotics@festflow.edu', '+91 98765 33333', '2020-01-20', NULL, 'active');

-- 3. Insert Club Memberships
INSERT INTO club_memberships (membership_id, club_id, user_id, member_type, membership_status, role) VALUES
('mem_001', 'club_codenexus_001', 'usr_faculty_001', 'faculty', 'active', 'coordinator'),
('mem_002', 'club_codenexus_001', 'usr_org_001', 'student', 'active', 'organizer'),
('mem_003', 'club_codenexus_001', 'usr_stud_001', 'student', 'active', 'member');

-- 4. Insert Venues & Facilities
INSERT INTO venues (venue_id, name, location, capacity, venue_type, status) VALUES
('ven_aud_001', 'Dr. APJ Abdul Kalam Auditorium', 'Central Academic Block, Ground Floor', 800, 'Auditorium', 'available'),
('ven_lab_002', 'Alan Turing Advanced Computing Lab', 'Tech Tower, 3rd Floor, Lab 304', 120, 'Lab', 'available'),
('ven_ground_003', 'Open Air Amphitheatre', 'North Campus Greens', 1500, 'Open Ground', 'available');

INSERT INTO venue_facilities (facility_id, venue_id, name, description, availability_status) VALUES
('fac_001', 'ven_aud_001', 'Dolby Surround Sound & Microphones', 'High-fidelity audio system', 'available'),
('fac_002', 'ven_aud_001', '4K Projection Screen', 'Ultra-HD projection unit', 'available'),
('fac_003', 'ven_lab_002', 'Gigabit Ethernet & Wi-Fi 6', 'Enterprise networking infrastructure', 'available');

-- 5. Insert Events
INSERT INTO events (event_id, title, description, event_type, category, start_date, end_date, start_time, end_time, status, club_id, venue_id, max_participants, registration_deadline, registration_fee, chief_guest, created_by) VALUES
('ev_hackfest_001', 'National HackFest & AI Summit 2026', '36-hour flagship national collegiate hackathon with AI, Web3, and IoT tracks.', 'Technical', 'Artificial Intelligence', '2026-11-15', '2026-11-16', '09:00', '21:00', 'published', 'club_codenexus_001', 'ven_aud_001', 350, '2026-11-10 23:59:59', 250.00, 'Dr. V. Kamakoti, Director, IIT Madras', 'usr_admin_001'),
('ev_quantum_002', 'Quantum Computing & Algorithms Symposium', 'Hands-on workshop exploring Qiskit quantum circuit simulations.', 'Workshop', 'Quantum Physics', '2026-12-05', '2026-12-05', '10:00', '16:00', 'published', 'club_codenexus_001', 'ven_lab_002', 100, '2026-12-01 23:59:59', 0.00, 'Dr. S. Ramanathan, IBM Quantum Ambassador', 'usr_org_001');

-- 6. Insert Registrations
INSERT INTO registrations (registration_id, user_id, event_id, registration_date, registration_type, registration_status, ticket_number, qr_code, fee) VALUES
('reg_001', 'usr_stud_001', 'ev_hackfest_001', '2026-10-18 12:30:00', 'team', 'registered', 'FF-2026-9812', 'QR-FF-2026-9812-VERIFIED', 250.00),
('reg_002', 'usr_org_001', 'ev_hackfest_001', '2026-10-18 12:35:00', 'solo', 'registered', 'FF-2026-9813', 'QR-FF-2026-9813-VERIFIED', 250.00);

-- 7. Insert Payments
INSERT INTO payments (payment_id, registration_id, event_id, user_id, amount, payment_date, payment_method, transaction_id, payment_status) VALUES
('pay_001', 'reg_001', 'ev_hackfest_001', 'usr_stud_001', 250.00, '2026-10-18 12:31:15', 'upi', 'TXN_UPI_9847291048', 'completed');

-- 8. Insert Certificates
INSERT INTO certificates (certificate_id, certificate_no, certificate_type, event_id, user_id, issue_date, verification_code, status) VALUES
('cert_001', 'CERT-2026-8812', 'participation', 'ev_hackfest_001', 'usr_stud_001', '2026-11-17 10:00:00', 'V-FEST26-8812', 'issued');

-- 9. Insert Feedback
INSERT INTO feedbacks (feedback_id, event_id, user_id, rating, comments, submitted_date) VALUES
('fb_001', 'ev_hackfest_001', 'usr_stud_001', 5, 'Superb hackathon experience, high quality mentoring, and smooth check-in!', '2026-11-17 14:00:00');

-- 10. Insert Volunteers
INSERT INTO volunteers (volunteer_id, event_id, user_id, assigned_task, shift_start, shift_end, volunteer_status) VALUES
('vol_001', 'ev_hackfest_001', 'usr_stud_001', 'Technical Helpdesk & Hardware Kit Distribution', '08:30', '16:30', 'assigned');

-- 11. Insert Finances (Budgets, Expenses, Revenues)
INSERT INTO budgets (budget_id, event_id, allocated_amount, approved_amount, budget_status, approval_date) VALUES
('bud_001', 'ev_hackfest_001', 100000.00, 95000.00, 'approved', '2026-10-15');

INSERT INTO expenses (expense_id, event_id, amount, expense_category, expense_date, description) VALUES
('exp_001', 'ev_hackfest_001', 46250.00, 'catering', '2026-11-15 13:00:00', 'Lunch & Refreshments for 350 Hackathon Participants'),
('exp_002', 'ev_hackfest_001', 30000.00, 'prizes', '2026-11-16 18:00:00', 'Cash prizes and physical mementos for hackathon podium winners'),
('exp_003', 'ev_hackfest_001', 16000.00, 'equipment', '2026-11-14 17:00:00', 'Audio-visual hardware rental and networking switches');

INSERT INTO revenues (revenue_id, event_id, revenue_type, amount, revenue_date, description) VALUES
('rev_001', 'ev_hackfest_001', 'sponsorship', 80000.00, '2026-10-20', 'Google Cloud Title Sponsorship Grant'),
('rev_002', 'ev_hackfest_001', 'registration_fees', 25000.00, '2026-11-12', 'Cumulative Participant Registration Fees (100 Paid Delegates)');

-- 12. Insert Sponsors & Event Sponsorships
INSERT INTO sponsors (sponsor_id, name, contact_person, email, phone, organization_type, address) VALUES
('sp_001', 'Google Cloud University Alliances', 'Priya Nambiar', 'priya@google.com', '+91 80 6789 0000', 'tech', 'RMZ Infinity, Old Madras Road, Bengaluru');

INSERT INTO event_sponsors (event_sponsor_id, event_id, sponsor_id, sponsorship_type, sponsorship_amount, agreement_date, sponsorship_status) VALUES
('evsp_001', 'ev_hackfest_001', 'sp_001', 'Title', 80000.00, '2026-10-20', 'confirmed');

-- 13. Insert Catering & Atomic Menu Items
INSERT INTO caterings (catering_id, event_id, caterer_name, contact_person, phone, email, service_date, status) VALUES
('cat_001', 'ev_hackfest_001', 'Annapoorna Royal Campus Caterers', 'M. Sundaram', '+91 98401 23456', 'catering@annapoorna.edu', '2026-11-15 12:30:00', 'confirmed');

INSERT INTO catering_menu_items (menu_item_id, catering_id, menu_item, quantity, cost_per_unit) VALUES
('menu_001', 'cat_001', 'South Indian Mini Tiffin Box', 350, 85.00),
('menu_002', 'cat_001', 'Cold Pressed Juice & Fruit Salad', 350, 45.00);

-- 14. Insert Competitions, Teams, Judges, Criteria, Scores, Prizes, and Results
INSERT INTO competitions (competition_id, event_id, competition_name, description, competition_type, maximum_teams, team_size_limit, registration_deadline, status) VALUES
('comp_001', 'ev_hackfest_001', 'AI Innovation Challenge', 'Build edge AI models for smart campus sustainability.', 'hackathon', 30, 4, '2026-11-10 23:59:59', 'completed');

INSERT INTO teams (team_id, competition_id, team_name, team_leader_id, registration_date, team_status) VALUES
('team_001', 'comp_001', 'Neural Knights', 'usr_stud_001', '2026-10-18 14:00:00', 'winner'),
('team_002', 'comp_001', 'Quantum Pioneers', 'usr_org_001', '2026-10-18 14:15:00', 'shortlisted');

INSERT INTO team_members (team_member_id, team_id, user_id, member_role) VALUES
('tm_001', 'team_001', 'usr_stud_001', 'Leader');

INSERT INTO judges (judge_id, name, email, phone, designation, organization, expertise) VALUES
('jdg_001', 'Dr. Arvind Swaminathan', 'arvind.ai@techcorp.in', '+91 98410 77777', 'Principal AI Architect', 'Cognitive Labs', 'Deep Learning & Edge Computer Vision');

INSERT INTO judging_criteria (criteria_id, competition_id, criteria_name, description, maximum_score, weightage) VALUES
('crit_001', 'comp_001', 'Innovation & Novelty', 'Uniqueness of the technical solution', 10, 1.00),
('crit_002', 'comp_001', 'Technical Execution', 'Code architecture, model accuracy, and edge deployment', 10, 1.00);

INSERT INTO judge_scores (score_id, competition_id, team_id, judge_id, criteria_id, score, remarks) VALUES
('sc_001', 'comp_001', 'team_001', 'jdg_001', 'crit_001', 9.50, 'Outstanding zero-shot edge inference pipeline'),
('sc_002', 'comp_001', 'team_001', 'jdg_001', 'crit_002', 9.00, 'Clean modular Python backend and low latency');

INSERT INTO prizes (prize_id, competition_id, prize_name, position, amount) VALUES
('prz_001', 'comp_001', 'First Prize - Gold Cup & Cash Award', 1, 20000.00),
('prz_002', 'comp_001', 'Second Prize - Silver Runner Up', 2, 10000.00);

INSERT INTO results (result_id, competition_id, team_id, position, final_score, result_status, prize_id) VALUES
('res_001', 'comp_001', 'team_001', 1, 18.50, 'announced', 'prz_001');
