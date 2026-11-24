import { cp, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packName = 'zebar-widgets';
const target = join(homedir(), '.glzr', 'zebar', packName);

await mkdir(target, { recursive: true });
await cp(join(root, 'zpack.json'), join(target, 'zpack.json'));
await cp(join(root, 'dist'), join(target, 'dist'), {
  recursive: true,
  force: true,
});

console.log(`deployed -> ${target}`);
console.log('open the Zebar tray icon -> Empty cache & reload configs');
