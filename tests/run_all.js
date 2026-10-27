/**
 * FestFlow Master Test Suite Runner
 * Executes all automated test suites against the MongoDB Atlas cluster
 */

const { spawnSync } = require('child_process');
const path = require('path');

const suites = [
  { name: 'Faculty & Club Hierarchy Test Suite', file: 'tests/faculty_and_clubs.test.js' },
  { name: 'Multi-Club Scoped Permissions Suite', file: 'tests/permissions.test.js' },
  { name: 'Comprehensive 14-Module Integration Suite', file: 'tests/runServerTest.js' }
];

const serverDir = path.resolve(__dirname, '../server');
console.log('🧪 Starting FestFlow Master Test Suite Runner...\n');

let allPassed = true;
const results = [];

for (const suite of suites) {
  console.log(`====================================================`);
  console.log(`▶ Running: ${suite.name}`);
  console.log(`====================================================`);

  const start = Date.now();
  const res = spawnSync('node', [suite.file], {
    cwd: serverDir,
    stdio: 'inherit'
  });
  const duration = ((Date.now() - start) / 1000).toFixed(2);

  const passed = res.status === 0;
  if (!passed) allPassed = false;

  results.push({
    name: suite.name,
    passed,
    exitCode: res.status,
    duration: `${duration}s`
  });
  console.log('\n');
}

console.log('====================================================');
console.log('MASTER TEST SUITE SUMMARY');
console.log('====================================================');
results.forEach((r) => {
  const statusStr = r.passed ? '✅ PASSED' : '❌ FAILED';
  console.log(`${statusStr} [${r.duration}] - ${r.name}`);
});
console.log('====================================================');

process.exit(allPassed ? 0 : 1);
