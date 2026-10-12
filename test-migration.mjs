// Compatibility check for bookmarks and cached pages after migration retirement.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const code = readFileSync('migration.js', 'utf8');
for (const href of ['https://tnkkakuei3-design.github.io/karimen-study/migration.html#transfer=old', 'https://karimen-study.pages.dev/migration']) {
  let target;
  vm.runInNewContext(code, { URL, location: { href, replace(value) { target = value; } } });
  assert.equal(target, new URL('./', href).href);
}
vm.runInNewContext(readFileSync('migration-entry.js', 'utf8'), {});
assert.doesNotMatch(readFileSync('index.html', 'utf8'), /src=["']\.\/migration-entry/);
assert.doesNotMatch(readFileSync('migration.html', 'utf8'), /transfer-|<button/);
console.log('Retired migration routes: OK');
