const serverCode = require('fs').readFileSync('dist/server.cjs', 'utf-8');
const modCode = serverCode.replace('const PORT = 3e3;', 'const PORT = 3001;');
require('fs').writeFileSync('dist/test-server.cjs', modCode);
