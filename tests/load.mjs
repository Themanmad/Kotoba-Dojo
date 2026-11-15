/* Loads chosen app source files into a sandbox with small stand-ins for the browser,
   so pure logic (scheduling, conjugation, data checks) can be tested in Node without a browser. */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export function load(files, extra = {}) {
  const mem = {};
  const ctx = {
    console, Math, Date, JSON, Object, Array, Set, Map, String, Number, RegExp,
    DAY: 86400e3,
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v); } },
    today: () => new Date().toISOString().slice(0, 10),
    gameAnswer: () => {}, levelTotal: () => 0,
    ...extra
  };
  vm.createContext(ctx);
  const code = files.map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n')
    // top-level const/let/function become reachable from the test
    + '\n;globalThis.__get = n => eval(n);';
  vm.runInContext(code, ctx, { filename: files.join('+') });
  return { ctx, get: n => ctx.__get(n) };
}
