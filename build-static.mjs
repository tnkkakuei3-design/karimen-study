// Package the existing app for Cloudflare Pages without development dependencies.
import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(root, 'dist');
const files = [
  'index.html', 'styles.css', 'app.js', 'model.js', 'questions.js',
  'learning-content.js', 'visuals.js', 'home-install.js',
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
console.log('Cloudflare Pages files are ready in dist/.');
