const { spawn } = require('child_process');
const path = require('path');

const serverDir = path.resolve(__dirname, '../server');
const child = spawn('node', ['tests/faculty_and_clubs.test.js'], {
  cwd: serverDir,
  stdio: 'inherit'
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
