const path = require('path');
const fs = require('fs');
require('dotenv').config();
const mongoose = require('mongoose');

async function inspectModelIndexes() {
  const modelsDir = path.join(__dirname, '..', 'models');
  fs.readdirSync(modelsDir).forEach(f => {
    if (f.endsWith('.js')) require(path.join(modelsDir, f));
  });

  const domainModels = [
    'User', 'Venue', 'Club', 'Event', 'ClubMembership', 'Registration',
    'Catering', 'Budget', 'Expense', 'Revenue', 'EventSponsor', 'Competition',
    'Feedback', 'Volunteer', 'Certificate', 'Payment', 'Team', 'Judge',
    'JudgingCriteria', 'Prize', 'JudgeScore', 'Result', 'Sponsor'
  ];

  const indexReport = {};

  for (const modelName of domainModels) {
    const model = mongoose.models[modelName];
    if (!model) continue;

    const collName = model.collection.name;
    const indexes = [];

    // Path level unique indexes
    model.schema.eachPath((pathname, schematype) => {
      if (schematype._index) {
        indexes.push({
          fields: { [pathname]: 1 },
          options: schematype._index
        });
      }
    });

    // Schema level indexes
    const schemaIndexes = model.schema.indexes();
    for (const [fields, options] of schemaIndexes) {
      indexes.push({
        fields,
        options: options || {}
      });
    }

    indexReport[collName] = {
      model: modelName,
      indexes: indexes.map(idx => ({
        fields: idx.fields,
        name: idx.options.name || Object.keys(idx.fields).map(k => `${k}_${idx.fields[k]}`).join('_'),
        unique: !!idx.options.unique,
        sparse: !!idx.options.sparse,
        partialFilterExpression: idx.options.partialFilterExpression || null,
        collation: idx.options.collation || null
      }))
    };
  }

  const outPath = 'C:\\Users\\sathy\\.gemini\\antigravity\\brain\\e3f3f7d5-8631-4102-85df-696e1a9851c1\\scratch\\model_indexes_audit.json';
  fs.writeFileSync(outPath, JSON.stringify(indexReport, null, 2), 'utf8');
  console.log(`Audited ${Object.keys(indexReport).length} domain models and saved to ${outPath}`);
}

inspectModelIndexes().catch(err => {
  console.error('Index audit failed:', err);
  process.exit(1);
});
