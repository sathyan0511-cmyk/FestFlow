# FestFlow Database Architecture & Design Specification

## Overview

FestFlow is a full-stack College Event Management System built using **MongoDB** as its document-oriented database and **Mongoose ODM (Object Document Mapper)** for database interactions in Node.js / Express.

Unlike conventional relational database architectures that organize data into rigid tables and rely on multi-table joins, FestFlow uses a **hybrid data-modelling approach** that combines normalized document references with embedded subdocuments.

Major entities such as Users, Clubs, Events, Venues, Registrations and Payments are maintained in separate collections and connected through MongoDB ObjectId references. Closely related information, such as catering menu items and team members, can be represented using embedded document structures.

This approach balances data consistency, reduced duplication and efficient document retrieval while applying relevant database normalization principles.

---

## Database Architecture Highlights

1. **Database Platform:** MongoDB Community Server (Local Deployment).
2. **ODM Framework:** Mongoose v8.9.5.
3. **Backend Integration:** Node.js and Express.js.
4. **Data Integrity:**
   - Strongly typed Mongoose schemas with field validation and custom validation rules.
   - Unique and compound indexes to prevent duplicate records where required.
   - Schema-level constraints for maintaining valid application data.
   - Password hashing using `bcryptjs` before storing user credentials.

5. **Hybrid Data Modelling:**

   - **Reference-Based Relationships:** Major entities such as `User`, `Club`, `Venue`, `Event`, `Payment` and `Certificate` are maintained in separate collections and connected through MongoDB `ObjectId` references.
   - **Embedded Documents:** Closely related information, such as catering menu items and team members, can be stored as embedded document arrays.
   - **Reduced Data Duplication:** Shared entities are maintained separately and referenced by related documents.
   - **Derived Values:** Financial summaries, seat availability and other calculated values can be computed from relevant database records where implemented.

---

## Database Design & Normalization Principles

FestFlow follows a hybrid data-modelling approach inspired by relational database normalization principles.

### Reference-Based Modelling

Related entities are stored in separate collections and connected using ObjectId references.

Examples include:

- Events referencing Clubs and Venues.
- Registrations referencing Users and Events.
- Payments referencing Registrations and Users.
- Certificates referencing Users and Events.

This reduces unnecessary duplication and allows shared entity information to be maintained centrally.

### Embedded Document Modelling

Certain closely related data is stored within parent documents instead of maintaining separate collections.

Examples include:

- Catering menu items embedded within catering documents.
- Team member details embedded within team documents.

This makes related information easier to retrieve together when appropriate.

### Relational Normalization Reference

The project also maintains a relational SQL reference schema to demonstrate database normalization concepts, including 1NF, 2NF and 3NF, as part of the academic coursework.

The MongoDB implementation and relational SQL reference serve different purposes: the former supports the application's document-oriented data model, while the latter demonstrates relational database design principles.

---

## Directory Index & Documentation Structure

This directory provides technical documentation covering both the MongoDB application implementation and the relational SQL reference.

### A. MongoDB Implementation (Application Runtime)

- [`schema.md`](./schema.md) — Technical specification of Mongoose models, attributes, validation rules and relationships.
- [`collections.md`](./collections.md) — Overview of MongoDB collections, their purposes, indexing strategies and access patterns.
- [`sample_data.md`](./sample_data.md) — Representative JSON documents illustrating the database structure.
- [`queries.js`](./queries.js) — Practical MongoDB and Mongoose queries, including aggregation pipelines and common database operations.

### B. Relational SQL Reference (Coursework Alignment)

- [`schema.sql`](./schema.sql) — SQL DDL defining the relational reference schema.
- [`sample_data.sql`](./sample_data.sql) — SQL DML statements containing representative test records.
- [`queries.sql`](./queries.sql) — Analytical SQL queries demonstrating equivalent relational business operations, such as net profit, seat availability and leaderboards.

---

## Database Connection & Environment Configuration

The MongoDB connection is managed centrally through:

`server/src/config/db.js`

The application uses Mongoose to establish the database connection.

Example connection implementation:

```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(
      `Database Connected successfully: ${conn.connection.name}`
    );
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
```

### Environment Variables

The MongoDB connection string is configured through the `MONGODB_URI` environment variable.

For a local MongoDB deployment, the connection string follows this format:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/festflow
```

Environment variables are maintained in `server/.env` and excluded from Git tracking to prevent sensitive configuration details from being exposed in the public repository.

---

## Database Security & Integrity

FestFlow incorporates database-level and application-level measures to maintain data integrity and protect user information.

- **Password Security:** User passwords are hashed using `bcryptjs` rather than being stored as plain text.
- **Schema Validation:** Mongoose schemas define field types, required attributes and validation rules.
- **Unique Constraints:** Unique indexes help prevent duplicate records for fields and combinations that require uniqueness.
- **Relationship Management:** ObjectId references connect related collections.
- **Environment Protection:** Database credentials and other sensitive configuration values are maintained in environment variables rather than committed to GitHub.

---

## Conclusion

FestFlow uses MongoDB and Mongoose to implement a flexible document-oriented database architecture for managing college events and associated activities.

By combining reference-based relationships with embedded document structures, the system supports organized data management while reducing unnecessary duplication.

The accompanying relational SQL reference further demonstrates the application of database design and normalization concepts, providing both a practical MongoDB implementation and an academic relational database reference.
