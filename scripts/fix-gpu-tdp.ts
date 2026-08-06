/**
 * 修复 GPU 数据文件中 nv/amdMono/arc 调用的 TDP/temp 参数。
 * 因为 first-run regex 有 bug（未匹配小数面积），调用处未传 tdpVal/tempVal。
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CHIPS_DIR = path.resolve(__dirname, '../src/data/chips');

const tdpTemp: Record<string, { tdp: number | null; temp: string | null }> = {
  'nvidia-geforce-gtx-1080-ti': { tdp: 250, temp: '70-84°C' },
  'nvidia-geforce-gtx-1080': { tdp: 180, temp: '65-82°C' },
  'nvidia-geforce-gtx-1070': { tdp: 150, temp: '65-80°C' },
  'nvidia-geforce-gtx-1060-6gb': { tdp: 120, temp: '60-75°C' },
  'nvidia-geforce-gtx-1060-3gb': { tdp: 120, temp: '60-75°C' },
  'nvidia-geforce-gtx-1050-ti': { tdp: 75, temp: '55-70°C' },
  'nvidia-geforce-gtx-1660-ti': { tdp: 120, temp: '60-75°C' },
  'nvidia-geforce-gtx-1660-super': { tdp: 125, temp: '60-75°C' },
  'nvidia-geforce-gtx-1650-super': { tdp: 100, temp: '55-70°C' },
  'nvidia-geforce-gtx-1650': { tdp: 75, temp: '55-70°C' },
  'nvidia-geforce-rtx-2060': { tdp: 160, temp: '65-80°C' },
  'nvidia-geforce-rtx-2060-super': { tdp: 175, temp: '65-80°C' },
  'nvidia-geforce-rtx-2070': { tdp: 175, temp: '65-80°C' },
  'nvidia-geforce-rtx-2070-super': { tdp: 215, temp: '65-80°C' },
  'nvidia-geforce-rtx-2080': { tdp: 215, temp: '65-80°C' },
  'nvidia-geforce-rtx-2080-super': { tdp: 250, temp: '70-84°C' },
  'nvidia-geforce-rtx-2080-ti': { tdp: 250, temp: '70-84°C' },
  'nvidia-geforce-rtx-3060': { tdp: 170, temp: '65-80°C' },
  'nvidia-geforce-rtx-3060-ti': { tdp: 200, temp: '65-80°C' },
  'nvidia-geforce-rtx-3070': { tdp: 220, temp: '70-83°C' },
  'nvidia-geforce-rtx-3070-ti': { tdp: 290, temp: '70-83°C' },
  'nvidia-geforce-rtx-3080': { tdp: 320, temp: '72-83°C' },
  'nvidia-geforce-rtx-3080-ti': { tdp: 350, temp: '72-83°C' },
  'nvidia-geforce-rtx-3090': { tdp: 350, temp: '72-83°C' },
  'nvidia-geforce-rtx-3090-ti': { tdp: 450, temp: '72-83°C' },
  'nvidia-geforce-rtx-3050': { tdp: 130, temp: '60-73°C' },
  'nvidia-geforce-rtx-4060': { tdp: 115, temp: '60-73°C' },
  'nvidia-geforce-rtx-4060-ti': { tdp: 160, temp: '65-75°C' },
  'nvidia-geforce-rtx-4070': { tdp: 200, temp: '65-75°C' },
  'nvidia-geforce-rtx-4070-super': { tdp: 220, temp: '65-78°C' },
  'nvidia-geforce-rtx-4070-ti': { tdp: 285, temp: '70-80°C' },
  'nvidia-geforce-rtx-4070-ti-super': { tdp: 285, temp: '70-80°C' },
  'nvidia-geforce-rtx-4080': { tdp: 320, temp: '70-80°C' },
  'nvidia-geforce-rtx-4080-super': { tdp: 320, temp: '70-80°C' },
  'nvidia-geforce-rtx-4090': { tdp: 450, temp: '70-80°C' },
  'nvidia-geforce-rtx-5070': { tdp: 250, temp: '65-75°C' },
  'nvidia-geforce-rtx-5070-ti': { tdp: 300, temp: '68-78°C' },
  'nvidia-geforce-rtx-5080': { tdp: 360, temp: '70-80°C' },
  'nvidia-geforce-rtx-5090': { tdp: 575, temp: '72-82°C' },
  'nvidia-geforce-rtx-5060-ti': { tdp: 180, temp: '65-75°C' },
  'nvidia-geforce-rtx-5060': { tdp: 150, temp: '60-73°C' },

  // AMD GPUs (monolithic)
  'amd-radeon-rx-5500-xt': { tdp: 130, temp: '65-80°C' },
  'amd-radeon-rx-5600-xt': { tdp: 150, temp: '65-80°C' },
  'amd-radeon-rx-5700': { tdp: 180, temp: '70-85°C' },
  'amd-radeon-rx-5700-xt': { tdp: 225, temp: '75-90°C' },
  'amd-radeon-rx-6600': { tdp: 132, temp: '60-75°C' },
  'amd-radeon-rx-6600-xt': { tdp: 160, temp: '65-80°C' },
  'amd-radeon-rx-6700-xt': { tdp: 230, temp: '70-85°C' },
  'amd-radeon-rx-6800': { tdp: 250, temp: '70-85°C' },
  'amd-radeon-rx-6800-xt': { tdp: 300, temp: '75-90°C' },
  'amd-radeon-rx-6900-xt': { tdp: 300, temp: '75-90°C' },
  'amd-radeon-rx-6950-xt': { tdp: 335, temp: '75-90°C' },
  'amd-radeon-rx-6750-xt': { tdp: 250, temp: '70-85°C' },
  'amd-radeon-rx-6650-xt': { tdp: 180, temp: '65-80°C' },
  'amd-radeon-rx-6500-xt': { tdp: 107, temp: '55-70°C' },
  'amd-radeon-rx-6400': { tdp: 53, temp: '50-65°C' },
  'amd-radeon-rx-7600': { tdp: 165, temp: '60-75°C' },
  'amd-radeon-rx-7600-xt': { tdp: 190, temp: '65-78°C' },
  'amd-radeon-rx-9060-xt': { tdp: 190, temp: '65-78°C' },

  // Intel Arc GPUs
  'intel-arc-a770': { tdp: 225, temp: '65-80°C' },
  'intel-arc-a750': { tdp: 225, temp: '65-80°C' },
  'intel-arc-a580': { tdp: 185, temp: '60-75°C' },
  'intel-arc-a380': { tdp: 75, temp: '50-65°C' },
  'intel-arc-a310': { tdp: 75, temp: '50-65°C' },
  'intel-arc-b580': { tdp: 190, temp: '60-75°C' },
  'intel-arc-b570': { tdp: 150, temp: '55-70°C' },
};

/**
 * 修复辅助函数调用，在闭合 ) 前插入 tdp/temp。
 * 假设调用格式为：func('id', ..., 'notes') — 最后两个引号字符串后直接 )
 */
function fixHelperCalls(content: string, funcName: string, lookup: Record<string, { tdp: number | null; temp: string | null }>): string {
  // Match: func('id', ...rest...     'notes text'),
  // We need to find the closing ) after notes
  const lines = content.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    // Check if this line starts a func() call
    const callMatch = line.match(new RegExp(`^\\s*${funcName}\\('([^']+)'`));
    if (!callMatch) {
      result.push(line);
      i++;
      continue;
    }
    const chipId = callMatch[1];
    const info = lookup[chipId];

    // If no TDP info, just pass through but add nulls
    const tdpV = info?.tdp ?? 'null';
    const tempV = info?.temp ? `'${info.temp}'` : 'null';

    // Find the closing ) — it might be on this line or the next
    if (line.trimEnd().endsWith(')') || line.trimEnd().endsWith('),')) {
      // Closing paren on same line
      const insertAt = line.lastIndexOf(')');
      const before = line.slice(0, insertAt);
      const after = line.slice(insertAt);
      result.push(`${before}, ${tdpV}, ${tempV}${after}`);
    } else if (i + 1 < lines.length && lines[i + 1].trim().endsWith(')') || (i + 1 < lines.length && lines[i + 1].trim().endsWith('),'))) {
      // Closing paren on next line
      result.push(line);
      i++;
      const nextLine = lines[i];
      const insertAt = nextLine.lastIndexOf(')');
      const before = nextLine.slice(0, insertAt);
      const after = nextLine.slice(insertAt);
      result.push(`${before}, ${tdpV}, ${tempV}${after}`);
    } else {
      result.push(line);
    }
    i++;
  }

  return result.join('\n');
}

function fixFile(filename: string, funcName: string) {
  const filePath = path.join(CHIPS_DIR, filename);
  let content = fs.readFileSync(filePath, 'utf-8');
  const before = content;
  content = fixHelperCalls(content, funcName, tdpTemp);
  if (content !== before) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  ✅ ${filename} fixed (${funcName} calls)`);
  } else {
    console.log(`  ⚠ ${filename}: no changes`);
  }
}

console.log('🔧 Fixing GPU file TDP/temp call args...\n');
fixFile('nvidia-gpu.ts', 'nv');
fixFile('amd-gpu.ts', 'amdMono');
fixFile('intel-gpu.ts', 'arc');
console.log('\n✅ Done. Run validate to check.');
