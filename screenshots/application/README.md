# Application UI Screenshots Specification

Place live screenshots of the running FestFlow frontend (`http://localhost:5173`) in this directory.

---

## Required Application Screenshots & Recommended Filenames

| Recommended Filename | Route to Open | Login As | Exactly What to Capture |
| :--- | :--- | :--- | :--- |
| `login_role_selection.png` | `/login` | Logged out | The authentication portal displaying the login card and the 4 one-click evaluation quick-fill buttons (`Faculty`, `Organizer`, `Student`, `Admin`). |
| `student_event_discovery.png` | `/events` | Student | Campus events directory showing category filter pills (`Technical`, `Cultural`, `Sports`), search bar, and event cards with capacity badges. |
| `student_event_details.png` | `/events/:id` | Student | Single event profile (e.g. HackFest) showing banner, date/time chips, venue location, chief guest, and registration action button. |
| `student_digital_passes.png` | `/my-registrations` | Student | E-ticket wallet showing registered passes, unique ticket numbers (`FF-XXXXX`), QR token status, and cancellation options. |
| `organizer_my_clubs.png` | `/clubs` | Organizer | "My Clubs" section and campus clubs grid with the `My Club` badge and `Manage Club` CTA button. |
| `organizer_event_management.png` | `/` | Organizer | Organizer dashboard showing top "My Clubs" cards, active member metrics, focus filter switcher, and scheduled events list. |
| `organizer_event_finances.png` | `/finances` | Organizer | Event financial ledger displaying approved budget, categorized expenses, revenue inflows, and real-time dynamically computed profit. |
| `faculty_dashboard.png` | `/` | Faculty | Faculty dashboard showing supervised club cards, active organizer counts, and organizer appointment shortcuts. |
| `faculty_club_management.png` | `/manage/club/:id` | Faculty | Dedicated club management console (`/manage/club/:id`) showing club metadata, faculty coordinator details, and the Organizers tab. |
| `faculty_assign_organizer.png` | `/manage/club/:id` | Faculty | The "Appoint Organizer" modal opened with the searchable student member autocomplete list and role assignment confirmation. |
| `admin_faculty_management.png` | `/admin/faculty` | Admin | Universal faculty management console showing provisioned faculty accounts, department assignments, and assigned clubs. |
| `competitions_leaderboard.png` | `/competitions` | Any | Hackathon contest page showing participating teams, criteria rubric, judges panel, and the real-time scoring leaderboard. |
| `certificate_verification.png` | `/certificates` | Any | Public verification portal showing the verification code input (`V-FEST26-8812`) and the resulting verified cryptographic credential. |

---

## Guidelines for Screenshots

1. **Resolution**: Minimum 1280x720 (720p) or 1920x1080 (1080p).
2. **Format**: High-quality PNG format.
3. **Data**: Use seeded demo accounts to ensure rich, populated UI views.
