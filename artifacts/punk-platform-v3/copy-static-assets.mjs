import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(here, 'imported', 'public');
const destination = path.join(here, 'dist', 'public');

await mkdir(destination, { recursive: true });
await Promise.all([
  cp(path.join(source, 'assets'), path.join(destination, 'assets'), {
    recursive: true,
    force: true,
  }),
  cp(path.join(source, 'reference'), path.join(destination, 'reference'), {
    recursive: true,
    force: true,
  }),
  cp(
    path.join(source, 'original-reference.png'),
    path.join(destination, 'original-reference.png'),
    { force: true },
  ),
]);
