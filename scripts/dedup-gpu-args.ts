/**
 * 去除 GPU 文件中的重复 TDP/temp 调用参数。
 * 模式：..., X, 'str', Y, 'str'), → ..., Y, 'str'),
 *       ..., null, null, X, 'str'), → ..., X, 'str'),
 */
import * as fs from 'fs';
import * as path from 'path';

const CHIPS_DIR = path.resolve('src/data/chips');
const files = ['nvidia-gpu.ts', 'amd-gpu.ts', 'intel-gpu.ts'];

for (const file of files) {
  const filePath = path.join(CHIPS_DIR, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Pattern 1: ..., VAL, 'TEMP', VAL, 'TEMP'), → ..., VAL, 'TEMP'),
  // Match two consecutive arg pairs where both VAL match
  content = content.replace(
    /,\s*(\d+|null)\s*,\s*('(?:\d+-\d+)°C')\s*,\s*(\1)\s*,\s*(\2)\s*\)/g,
    (_, val, temp) => `, ${val}, ${temp})`
  );

  // Pattern 2: ..., null, null, VAL, 'TEMP'), → ..., VAL, 'TEMP'),
  content = content.replace(
    /,\s*null\s*,\s*null\s*,\s*(\d+)\s*,\s*('(?:\d+-\d+)°C')\s*\)/g,
    (_, val, temp) => `, ${val}, ${temp})`
  );

  // Pattern 3: edge case: ..., null, null, null, null), → ..., null, null)
  content = content.replace(
    /,\s*null\s*,\s*null\s*,\s*null\s*,\s*null\s*\)/g,
    ', null, null)'
  );

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  ✅ ${file} cleaned`);
}

console.log('\nDone.');
