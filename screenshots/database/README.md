# Database Evidence & Atlas Screenshots Specification

Place screenshots of the cloud MongoDB Atlas deployment and MongoDB Compass in this directory.

---

## Required Database Evidence & Recommended Filenames

| Recommended Filename | Source / Tool | Exactly What to Capture (Safe Views) |
| :--- | :--- | :--- |
| `atlas_cluster_overview.png` | MongoDB Atlas Cloud Console | Cloud dashboard showing Cluster deployment (tier, region, connection metrics, total read/write operations) with credentials masked. |
| `atlas_collections_roster.png` | MongoDB Atlas / Compass | Database view showing the directory of all 18 collections (`users`, `clubs`, `events`, `registrations`, `finances`, etc.). |
| `atlas_document_inspector.png` | MongoDB Atlas Document Viewer | Document inspector showing a normalized record (e.g. `Event` with referenced `ObjectId`s for `club`, `venue`, `createdBy`). |
| `atlas_compound_indexes.png` | MongoDB Atlas Index Explorer | Index management tab highlighting unique compound indexes, specifically `{ user: 1, event: 1 }` on `registrations`. |

---

## Guidelines for Screenshots

1. **Security & Privacy**: Ensure MongoDB connection strings with passwords or internal private IP addresses are masked or blurred before committing.
2. **Format**: PNG format.
