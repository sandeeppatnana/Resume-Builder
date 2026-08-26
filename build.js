const { execSync } = require('child_process');
const fs = require('fs');

try {
    const out = execSync('npm run build', { encoding: 'utf8', stdio: 'pipe' });
    fs.writeFileSync('error.log', out);
} catch (e) {
    fs.writeFileSync('error.log', e.stdout + '\n' + e.stderr);
}
