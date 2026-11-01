const path = require('path');
const fs = require('fs');
const { MongoClient } = require('mongodb');

async function inspectAllActiveDocs() {
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  await client.connect();
  const db = client.db('festflow');

  const domainCollections = [
    'users', 'venues', 'clubs', 'events', 'clubmemberships', 'registrations',
    'caterings', 'budgets', 'expenses', 'revenues', 'eventsponsors',
    'competitions', 'feedbacks', 'volunteers', 'certificates', 'payments',
    'teams', 'judges', 'judgingcriterias', 'prizes', 'judgescores',
    'results', 'sponsors'
  ];

  // Model parent references definition
  const parentRefRules = {
    events: [
      { field: 'club', collection: 'clubs' },
      { field: 'venue', collection: 'venues' },
      { field: 'createdBy', collection: 'users' },
      { field: 'organizers', collection: 'users', isArray: true }
    ],
    clubmemberships: [
      { field: 'club', collection: 'clubs' },
      { field: 'user', collection: 'users' }
    ],
    registrations: [
      { field: 'event', collection: 'events' },
      { field: 'user', collection: 'users' }
    ],
    caterings: [{ field: 'event', collection: 'events' }],
    budgets: [{ field: 'event', collection: 'events' }],
    expenses: [
      { field: 'event', collection: 'events' },
      { field: 'budget', collection: 'budgets' }
    ],
    revenues: [{ field: 'event', collection: 'events' }],
    eventsponsors: [
      { field: 'event', collection: 'events' },
      { field: 'sponsor', collection: 'sponsors' }
    ],
    competitions: [{ field: 'event', collection: 'events' }],
    feedbacks: [
      { field: 'event', collection: 'events' },
      { field: 'user', collection: 'users' }
    ],
    volunteers: [
      { field: 'event', collection: 'events' },
      { field: 'user', collection: 'users' }
    ],
    certificates: [
      { field: 'event', collection: 'events' },
      { field: 'user', collection: 'users' }
    ],
    payments: [
      { field: 'registration', collection: 'registrations' },
      { field: 'event', collection: 'events' },
      { field: 'user', collection: 'users' }
    ],
    teams: [
      { field: 'event', collection: 'events' },
      { field: 'teamLeader', collection: 'users' },
      { field: 'members.user', collection: 'users', isNestedArray: true }
    ],
    judges: [
      { field: 'event', collection: 'events' }
    ],
    judgingcriterias: [{ field: 'competition', collection: 'competitions' }],
    prizes: [{ field: 'competition', collection: 'competitions' }],
    judgescores: [
      { field: 'judge', collection: 'judges' },
      { field: 'team', collection: 'teams' },
      { field: 'competition', collection: 'competitions' }
    ],
    results: [
      { field: 'competition', collection: 'competitions' },
      { field: 'winners.team', collection: 'teams', isNestedArray: true }
    ],
    clubs: [
      { field: 'organizers', collection: 'users', isArray: true },
      { field: 'facultyCoordinator.user', collection: 'users', isNested: true }
    ]
  };

  const inventory = [];

  for (const collName of domainCollections) {
    const docs = await db.collection(collName).find({}).toArray();
    for (const doc of docs) {
      let isEligible = true;
      let exclusionReason = null;

      if (collName === 'users' && doc.email === 'faculty@festflow.edu') {
        isEligible = false;
        exclusionReason = 'Held pending manual identity verification';
      }

      const parentRefs = [];
      const rules = parentRefRules[collName] || [];

      for (const rule of rules) {
        if (rule.isArray) {
          const arr = doc[rule.field] || [];
          for (const pid of arr) {
            const pExists = await db.collection(rule.collection).findOne({ _id: pid });
            parentRefs.push({
              field: rule.field,
              targetColl: rule.collection,
              parentId: pid ? pid.toString() : null,
              existsLocally: !!pExists
            });
          }
        } else if (rule.isNested) {
          const parts = rule.field.split('.');
          const pid = doc[parts[0]] ? doc[parts[0]][parts[1]] : null;
          if (pid) {
            const pExists = await db.collection(rule.collection).findOne({ _id: pid });
            parentRefs.push({
              field: rule.field,
              targetColl: rule.collection,
              parentId: pid ? pid.toString() : null,
              existsLocally: !!pExists
            });
          }
        } else if (rule.isNestedArray) {
          const parts = rule.field.split('.');
          const arr = doc[parts[0]] || [];
          for (const item of arr) {
            const pid = item[parts[1]];
            if (pid) {
              const pExists = await db.collection(rule.collection).findOne({ _id: pid });
              parentRefs.push({
                field: rule.field,
                targetColl: rule.collection,
                parentId: pid ? pid.toString() : null,
                existsLocally: !!pExists
              });
            }
          }
        } else {
          const pid = doc[rule.field];
          if (pid) {
            const pExists = await db.collection(rule.collection).findOne({ _id: pid });
            parentRefs.push({
              field: rule.field,
              targetColl: rule.collection,
              parentId: pid ? pid.toString() : null,
              existsLocally: !!pExists
            });
          }
        }
      }

      inventory.push({
        collection: collName,
        id: doc._id.toString(),
        syncVersion: doc._syncVersion,
        isEligible,
        exclusionReason,
        parentRefs,
        summary: doc.name || doc.title || doc.email || doc.transactionId || doc.certificateNo || doc.type || collName
      });
    }
  }

  const outPath = 'C:\\Users\\sathy\\.gemini\\antigravity\\brain\\e3f3f7d5-8631-4102-85df-696e1a9851c1\\scratch\\active_docs_inventory.json';
  fs.writeFileSync(outPath, JSON.stringify(inventory, null, 2), 'utf8');
  console.log(`Audited ${inventory.length} active documents and saved to ${outPath}`);
  console.log(`- Eligible documents: ${inventory.filter(i => i.isEligible).length}`);
  console.log(`- Excluded documents: ${inventory.filter(i => !i.isEligible).length}`);

  await client.close();
}

inspectAllActiveDocs().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
