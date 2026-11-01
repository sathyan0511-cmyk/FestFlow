# FestFlow Phase 3.5.0.1 — Domain Schema & Cloud Index Audit

**Document Version:** 1.0.0  
**Phase:** 3.5.0.1 (Index Specifications & Constraint Integrity Audit)  
**Status:** COMPLETE (STRICTLY READ-ONLY)  
**Workspace:** `C:\Users\sathy\FestFlow`  
**Execution Date:** November 2026  
**Auditor:** Antigravity AI  

---

> [!IMPORTANT]
> **READ-ONLY AUDIT & ZERO-INDEX-PROVISIONING NOTICE**  
> All index definitions were extracted directly from the compiled Mongoose models in `server/src/models`.  
> Atlas database `festflow` was inspected in read-only mode and confirmed to be completely empty.  
> **Zero indexes were created or modified on Atlas during this turn.**

---

## 1. Executive Summary

An audit of all **23 FestFlow domain models** was conducted to verify unique constraints, sparse/partial options, and collation settings.  
- **Total Unique Constraints Identified:** **10 unique indexes** across 8 domain collections (e.g. `User.email`, `Venue.name`, `Club.name`, `ClubMembership.club+user`, `Registration.ticketNumber`, `Certificate.certificateNo`, `Payment.transactionId`).
- **Current Atlas `festflow` State:** Database contains **0 collections and 0 indexes**.
- **Candidate Violation Assessment:** Evaluated all 37 eligible active documents against the 10 unique constraints. **Zero violations detected.**

---

## 2. Collection-by-Collection Index & Unique Constraint Register

| # | Collection Name | Mongoose Model | Index Name | Key Specification | Unique? | Sparse / Partial / Collation | Exists on Atlas `festflow`? | Violation by 37 Active Docs? |
| :-: | :--- | :--- | :--- | :--- | :-: | :--- | :-: | :-: |
| **1** | `users` | `User` | `email_1` | `{ email: 1 }` | **Yes** | Standard BSON unique | ❌ Not yet provisioned | ❌ No (3 distinct emails) |
| **2** | `venues` | `Venue` | `name_1` | `{ name: 1 }` | **Yes** | Standard BSON unique | ❌ Not yet provisioned | ❌ No (4 distinct names) |
| **3** | `clubs` | `Club` | `name_1` | `{ name: 1 }` | **Yes** | Standard BSON unique | ❌ Not yet provisioned | ❌ No (3 distinct names) |
| **4** | `clubmemberships`| `ClubMembership` | `club_1_user_1` | `{ club: 1, user: 1 }` | **Yes** | Compound unique index | ❌ Not yet provisioned | ❌ No (1 valid membership) |
| **5** | `registrations` | `Registration` | `ticketNumber_1` | `{ ticketNumber: 1 }` | **Yes** | Standard BSON unique | ❌ Not yet provisioned | ❌ No (1 valid ticket) |
| | | | `user_1_event_1` | `{ user: 1, event: 1 }` | **Yes** | Compound unique index | ❌ Not yet provisioned | ❌ No (1 reg per user/event) |
| **6** | `certificates` | `Certificate` | `certificateNo_1` | `{ certificateNo: 1 }` | **Yes** | Standard BSON unique | ❌ Not yet provisioned | ❌ No (1 cert doc) |
| | | | `verificationCode_1` | `{ verificationCode: 1 }` | **Yes** | Standard BSON unique | ❌ Not yet provisioned | ❌ No (1 cert doc) |
| **7** | `payments` | `Payment` | `transactionId_1` | `{ transactionId: 1 }` | **Yes** | Standard BSON unique | ❌ Not yet provisioned | ❌ No (1 txn doc) |
| **8** | `feedbacks` | `Feedback` | `event_1_user_1` | `{ event: 1, user: 1 }` | **Yes** | Compound unique index | ❌ Not yet provisioned | ❌ No (1 feedback doc) |
| **9** | `volunteers` | `Volunteer` | `event_1_user_1` | `{ event: 1, user: 1 }` | **Yes** | Compound unique index | ❌ Not yet provisioned | ❌ No (1 volunteer doc) |
| **10**| `events` | `Event` | `club_1` | `{ club: 1 }` | No | Foreign key lookup index | ❌ Not yet provisioned | ❌ None |
| | | | `venue_1` | `{ venue: 1 }` | No | Foreign key lookup index | ❌ Not yet provisioned | ❌ None |
| | | | `status_1` | `{ status: 1 }` | No | Operational status index | ❌ Not yet provisioned | ❌ None |
| **11**| `caterings` | `Catering` | `event_1` | `{ event: 1 }` | No | Foreign key lookup index | ❌ Not yet provisioned | ❌ None |
| **12**| `budgets` | `Budget` | `event_1` | `{ event: 1 }` | No | Foreign key lookup index | ❌ Not yet provisioned | ❌ None |
| **13**| `expenses` | `Expense` | `event_1` | `{ event: 1 }` | No | Foreign key lookup index | ❌ Not yet provisioned | ❌ None |
| | | | `budget_1` | `{ budget: 1 }` | No | Foreign key lookup index | ❌ Not yet provisioned | ❌ None |
| **14**| `revenues` | `Revenue` | `event_1` | `{ event: 1 }` | No | Foreign key lookup index | ❌ Not yet provisioned | ❌ None |
| **15**| `eventsponsors` | `EventSponsor` | `event_1_sponsor_1`| `{ event: 1, sponsor: 1 }` | No | Relationship index | ❌ Not yet provisioned | ❌ None |
| **16**| `competitions` | `Competition` | `event_1` | `{ event: 1 }` | No | Foreign key lookup index | ❌ Not yet provisioned | ❌ None |
| **17**| `teams` | `Team` | `event_1` | `{ event: 1 }` | No | Foreign key lookup index | ❌ Not yet provisioned | ❌ None |
| **18**| `judges` | `Judge` | `event_1` | `{ event: 1 }` | No | Foreign key lookup index | ❌ Not yet provisioned | ❌ None |
| **19**| `judgingcriterias`|`JudgingCriteria`| `competition_1` | `{ competition: 1 }` | No | Foreign key lookup index | ❌ Not yet provisioned | ❌ None |
| **20**| `prizes` | `Prize` | `competition_1` | `{ competition: 1 }` | No | Foreign key lookup index | ❌ Not yet provisioned | ❌ None |
| **21**| `judgescores` | `JudgeScore` | `competition_1` | `{ competition: 1 }` | No | Foreign key lookup index | ❌ Not yet provisioned | ❌ None |
| **22**| `results` | `Result` | `competition_1` | `{ competition: 1 }` | No | Foreign key lookup index | ❌ Not yet provisioned | ❌ None |
| **23**| `sponsors` | `Sponsor` | `_id_` | `{ _id: 1 }` | **Yes** | Default BSON primary key | ❌ Not yet provisioned | ❌ None |

---

## 3. Pre-Ingestion Provisioning Recommendation

To prevent race conditions, index rebuild pauses, or duplicate insertion windows during Phase 3.5:
1. **Pre-Sync Provisioning:** An automated script must connect to Atlas `festflow` and issue `createIndex()` for all defined indexes **before** Batch 1 (Tier 0) is executed.
2. **Assertion Check:** The engine will query `atlasConn.collection(coll).indexes()` and assert that every unique index exists before initiating data ingestion.
