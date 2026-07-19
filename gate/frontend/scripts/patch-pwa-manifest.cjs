const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', '..', 'backend', 'public', 'build', 'manifest.webmanifest');

if (!fs.existsSync(manifestPath)) {
    console.warn('PWA manifest not found at', manifestPath);
    process.exit(0);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.scope = '/';
manifest.start_url = '/gate';
manifest.icons = [
    {
        src: '/pwa-icon.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
    },
    {
        src: '/pwa-icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
    },
    {
        src: '/pwa-icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
    },
];

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`);
console.log('Patched PWA manifest icons and scope');
