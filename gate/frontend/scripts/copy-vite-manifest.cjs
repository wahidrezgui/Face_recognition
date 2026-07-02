const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', '..', 'backend', 'public', 'build');
const source = path.join(buildDir, '.vite', 'manifest.json');
const target = path.join(buildDir, 'manifest.json');

if (fs.existsSync(source)) {
    fs.copyFileSync(source, target);
    console.log('Copied Vite manifest to backend/public/build/manifest.json');
} else {
    console.warn('Vite manifest not found at', source);
}
