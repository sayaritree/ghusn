// Static-only publish staging for the independent Ghusn Netlify site.
// Never publish repository metadata, operator notes, or .deployment files.
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const dir = 'ghusn-site';
const files = [
  'index.html',
  'ghusn-core.html',
  'ghusn-admin-live.js',
  'ghusn-admin-login.js',
  'ghusn-telegram-client.js',
  'ghusn-washaij-canonical.js',
  'og-ghusn.png'
];

await mkdir(dir, { recursive: true });
for (const filename of files) await copyFile(filename, join(dir, filename));

const shellPath = join(dir, 'index.html');
const shell = await readFile(shellPath, 'utf8');
const canonicalScript = '<script src="/ghusn-washaij-canonical.js" defer></script>';
if (!shell.includes('id="ghusn-app"') || !shell.includes('ws-launch')) {
  throw new Error('Unexpected Ghusn shell structure; refusing a potentially broken deployment');
}
if (!shell.includes(canonicalScript)) {
  if (!shell.includes('</body>')) throw new Error('Missing closing body tag');
  await writeFile(shellPath, shell.replace('</body>', canonicalScript + '</body>'));
}
console.log('Ghusn static site prepared, with canonical Washaij portal link.');
