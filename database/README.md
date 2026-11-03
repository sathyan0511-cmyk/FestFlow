# FestFlow Database Architecture & Design Specification

## Overview

FestFlow is a full-stack College Event Management System built on **MongoDB Atlas** (Cloud Document Database) utilizing the **Mongoose ODM (Object Document Mapper)** in Node.js / Express.

Unlike conventional relational database architectures that rely on rigid tables and heavy multi-table joins, FestFlow combines **normalized document references** with **strategic atomic subdocument embedding**. This achieves strict database normalization (UNF → 1NF → 2NF → 3NF → BCNF principles) while capitalizing on MongoDB's high-performance document retrieval patterns.

---

## Database Architecture Highlights

1. **Database Platform**: MongoDB Atlas Cluster (Shared M0 / Dedicated Tier)
2. **ODM Framework**: Mongoose v8.9.5
3. **Data Integrity**:
   - Strongly typed schemas with built-in Mongoose validations and custom regular expressions.
   - Compound unique indexes preventing illegal state (e.g., duplicate user registrations, repeat feedback submissions).
   - Pre-save cryptographic middleware (`bcryptjs`) for user credential hashing.
4. **Strict Normalization (3NF & BCNF Compliance)**:
   - **Zero Derived Redundancy**: Financial profits (`Profit = Revenue - Expense`), event seat availability (`Available = Capacity - Registered`), and catering costs (`Cost = Quantity * UnitPrice`) are dynamically computed at query time rather than redundantly stored.
   - **Atomic Structures (1NF)**: Menu lines in catering orders and facilities in venues are modeled as structured embedded document arrays with discrete, atomic fields.
   - **Reference Isolation**: Entities such as `User`, `Club`, `Venue`, `Event`, `Payment`, and `Certificate` are partitioned into distinct collections linked by standard MongoDB `ObjectId` references (`ref: '...'`).

---

## Directory Index & Rubric Compliance

This directory provides comprehensive documentation covering both the live cloud MongoDB implementation and the standardized relational 3NF SQL reference:

### A. Live MongoDB Atlas Implementation (Application Runtime)
- [`schema.md`](./schema.md) — Comprehensive technical specification of all 14 Mongoose models, attributes, constraints, and relationships.
- [`collections.md`](./collections.md) — Directory of all 18 MongoDB collections, their purpose, indexing strategies, and read/write access patterns.
- [`sample_data.md`](./sample_data.md) — Safe, representative JSON documents matching the exact schemas used by seed scripts.
- [`queries.js`](./queries.js) — Practical, production-grade MongoDB/Mongoose aggregation pipelines and queries.

### B. Relational 3NF / ANSI SQL Reference (Coursework Alignment)
- [`schema.sql`](./schema.sql) — Standardized ANSI SQL DDL defining the relational 3NF schema corresponding to the normalization chart.
- [`sample_data.sql`](./sample_data.sql) — Standardized ANSI SQL DML inserting matching sanitized test fixtures.
- [`queries.sql`](./queries.sql) — Analytical SQL queries demonstrating equivalent relational business logic (Net Profit, Seat Availability, Leaderboard).

---

## Connection & Environment

The database connection is managed centrally via `server/src/config/db.js` using Mongoose:

```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ Database Connected successfully: MongoDB Atlas Cluster [DB: ${conn.connection.name}]`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};
```

Environment variables are loaded from `server/.env` (protected from Git tracking). A sanitization helper ensures sensitive database credentials are never logged or exposed in console output.
