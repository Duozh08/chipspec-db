/**
 * 清理 GPU 数据文件中的重复 TDP/temp 参数。
 * 问题：migrate-v2 对无 TDP 数据的条目追加了 null, null，
 *       然后 fix-gpu-tdp 又追加了一遍 → 出现 4 个参数而不是 2 个。
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

  'intel-arc-a770': { tdp: 225, temp: '65-80°C' },
  'intel-arc-a750': { tdp: 225, temp: '65-80°C' },
  'intel-arc-a580': { tdp: 185, temp: '60-75°C' },
  'intel-arc-a380': { tdp: 75, temp: '50-65°C' },
  'intel-arc-a310': { tdp: 75, temp: '50-65°C' },
  'intel-arc-b580': { tdp: 190, temp: '60-75°C' },
  'intel-arc-b570': { tdp: 150, temp: '55-70°C' },
};

/**
 * Remove extra TDP/temp args from helper function calls.
 * Pattern: func('id', ...rest...,  <tdp>, <temp>, <more_tdp>, <more_temp>)
 * After cleanup: func('id', ...rest..., <correct_tdp>, <correct_temp>)
 *
 * We detect duplicate args by looking for patterns like:
 *   , number, 'string', number, 'string')
 * or
 *   , null, null, number, 'string')
 */
function cleanCall(line: string, chipId: string): string {
  const info = tdpTemp[chipId];
  const correctTdp = info?.tdp ?? 'null';
  const correctTemp = info?.temp ? `'${info.temp}'` : 'null';

  // Pattern: 4 consecutive args at the end: , X, Y, Z, W)
  // This means we have duplicate. Replace with single pair.
  const dupPattern = /(\s*,\s*(?:null|\d+)\s*,\s*(?:(?:null)|'[^']*')\s*,\s*(?:null|\d+)\s*,\s*(?:(?:null)|'[^']*')\s*\))\s*,?\s*$/;
  if (dupPattern.test(line)) {
    return line.replace(dupPattern, `, ${correctTdp}, ${correctTemp})`);
  }

  // Check for 2 args ending (normal case) — only fix if values differ from correct
  const normalPattern = /(\s*,\s*(?:null|\d+)\s*,\s*(?:(?:null)|'[^']*')\s*\))\s*,?\s*$/;
  const match = normalPattern.exec(line);
  if (match) {
    return line.slice(0, match.index) + `, ${correctTdp}, ${correctTemp})`;
  }

  return line;
}

function fixFile(filename: string) {
  const filePath = path.join(CHIPS_DIR, filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const result: string[] = [];
  let changed = 0;

  for (const line of lines) {
    // Check if this line ends a function call with extra TDP args
    // Lines ending with ),  or ) — check for duplicate pattern
    const trimmed = line.trimEnd();
    if ((trimmed.endsWith('),') || trimmed.endsWith(')')) && (line.includes("'") || line.includes('null'))) {
      // Try to find the chip ID by looking backward for the function call start
      // We can identify by the pattern: 4 comma-separated values before )
      const parts = trimmed.split(',');
      if (parts.length >= 4) {
        // Check if last args look like TDP/temp values
        const lastFew = parts.slice(-4);
        const hasNum = lastFew.some(p => p.trim().match(/^\d+$/));
        const hasStr = lastFew.some(p => p.trim().match(/^'\d+-\d+°C'$/));
        const hasNull = lastFew.some(p => p.trim() === 'null');

        if ((hasNum || hasNull) && (hasStr || hasNull)) {
          // This line has TDP/temp-like args at the end
          // Now find the chip id from previous line
          if (result.length > 0) {
            const prevLine = result[result.length - 1];
            const idMatch = prevLine.match(/'([a-z0-9-]+)',\s*'[^']+',\s*'/);
            if (idMatch) {
              const chipId = idMatch[1];
              const cleaned = cleanCall(line, chipId);
              if (cleaned !== line) {
                changed++;
              }
              result.push(cleaned);
              continue;
            }
          }
        }
      }
    }
    result.push(line);
  }

  if (changed > 0) {
    fs.writeFileSync(filePath, result.join('\n'), 'utf-8');
    console.log(`  ✅ ${filename}: ${changed} calls fixed`);
  } else {
    console.log(`  ⚠ ${filename}: no changes needed`);
  }
}

console.log('🔧 Cleaning up GPU call args...\n');
fixFile('nvidia-gpu.ts');
fixFile('amd-gpu.ts');
fixFile('intel-gpu.ts');
console.log('\n✅ Done.');
