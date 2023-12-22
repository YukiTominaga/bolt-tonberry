import path from 'path';
import fs from 'fs';

// NodeJS Build
const NODE_FIX = 'import { createRequire as createImportMetaRequire } from "module"; import.meta.require ||= (id) => createImportMetaRequire(import.meta.url)(id);\n';
const BUILD_DIR = 'dist';
const nodeBuild = await Bun.build({
  entrypoints: ['./app.ts'],
  target: 'node',
  minify: true,
});

// Write output files
for (const result of nodeBuild.outputs) {
  const fileContent = NODE_FIX + await result.text();
  const destDir = path.join(import.meta.dir, BUILD_DIR);
  const dest = path.join(destDir, result.path);
  fs.existsSync(destDir) || fs.mkdirSync(destDir);
  Bun.write(dest, fileContent);
}
