// Package the existing app for Cloudflare Pages without development dependencies.
import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(root, 'dist');
const files = [
  'honmen.html', 'course-switch.css', 'honmen/app.css', 'honmen/app.js', 'honmen/model.js',
  'honmen/storage.js', 'honmen/notes.js', 'honmen/sound.js', 'honmen/ui.js', 'honmen/questions.js', 'honmen/assets',
  'cloud-record.js', 'cloud-sync.js', 'privacy.html',
  'migration.html', 'migration.js', 'migration-entry.js', 'index.html', 'styles.css', 'app.js', 'town.css', 'town-data.js', 'town-config.js', 'town.js', 'model.js', 'questions.js',
  'learning-content.js', 'visuals.js', 'notebook-content.js', 'question-guides.js', 'home-install.js', 'progress-storage.js', 'startup.js',
  'manifest.webmanifest', 'apple-touch-icon.png', 'assets', 'data/assets',
  ...(await readdir(root)).filter(name => /^image-[a-z0-9]+\.(?:png|jpe?g|webp|gif|svg)$/.test(name)),
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of files) {
  const target = path.join(output, file);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(path.join(root, file), target, { recursive: true });
}
await (await import('node:fs/promises')).writeFile(path.join(output, '_routes.json'), JSON.stringify({version:1,include:['/api/*'],exclude:[]}));
console.log('Cloudflare Pages files are ready in dist/.');
