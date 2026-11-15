#!/usr/bin/env node
/* Builds the single-file app (index.html) from src/.
   src/index.html is the page skeleton; each line "@@include path" is replaced by that file's contents.
   No dependencies. Usage:
     node build.mjs          write index.html
     node build.mjs --check  fail if index.html is out of date (used in CI) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(root, 'src');
const tpl = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
const seen = new Set();
const out = tpl.replace(/^@@include (\S+)\n/gm, (_, rel) => {
  const file = path.join(srcDir, rel);
  if (!file.startsWith(srcDir + path.sep)) throw new Error('include outside src/: ' + rel);
  if (seen.has(rel)) throw new Error('included twice: ' + rel);
  seen.add(rel);
  return fs.readFileSync(file, 'utf8');
});
for (const dir of ['css', 'js']) for (const f of fs.readdirSync(path.join(srcDir, dir)))
  if (!seen.has(`${dir}/${f}`)) throw new Error(`src/${dir}/${f} is not included in src/index.html`);
const target = path.join(root, 'index.html');
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
  if (cur !== out) { console.error('index.html is out of date: run node build.mjs'); process.exit(1); }
  console.log('index.html is up to date');
} else {
  fs.writeFileSync(target, out);
  console.log(`index.html written (${(out.length / 1024).toFixed(0)} KB, ${seen.size} source files)`);
}
