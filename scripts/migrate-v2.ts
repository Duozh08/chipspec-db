/**
 * v2 数据迁移：为所有芯片添加 formFactor / tdp / loadTempRange，增加移动端芯片。
 * 用法：npx tsx scripts/migrate-v2.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CHIPS_DIR = path.resolve(__dirname, '../src/data/chips');

/* ============= TDP & 温度 查找表（按芯片 id） ============= */
const tdpTemp: Record<string, { tdp: number | null; temp: string | null }> = {
  // --- Intel CPU Desktop ---
  'intel-core-i7-8700k': { tdp: 95, temp: '65-80°C' },
  'intel-core-i9-9900k': { tdp: 95, temp: '70-90°C' },
  'intel-core-i7-9700k': { tdp: 95, temp: '65-80°C' },
  'intel-core-i5-9600k': { tdp: 95, temp: '60-75°C' },
  'intel-core-i9-10900k': { tdp: 125, temp: '70-90°C' },
  'intel-core-i7-10700k': { tdp: 125, temp: '65-80°C' },
  'intel-core-i5-10400': { tdp: 65, temp: '55-70°C' },
  'intel-core-i9-11900k': { tdp: 125, temp: '70-90°C' },
  'intel-core-i7-11700k': { tdp: 125, temp: '65-80°C' },
  'intel-core-i5-11600k': { tdp: 125, temp: '60-75°C' },
  'intel-core-i9-12900k': { tdp: 125, temp: '75-95°C' },
  'intel-core-i7-12700k': { tdp: 125, temp: '70-85°C' },
  'intel-core-i5-12600k': { tdp: 125, temp: '65-80°C' },
  'intel-core-i5-12400': { tdp: 65, temp: '50-65°C' },
  'intel-core-i3-12100': { tdp: 60, temp: '45-60°C' },
  'intel-core-i9-13900k': { tdp: 125, temp: '80-100°C' },
  'intel-core-i7-13700k': { tdp: 125, temp: '75-90°C' },
  'intel-core-i5-13600k': { tdp: 125, temp: '70-85°C' },
  'intel-core-i5-13400': { tdp: 65, temp: '55-70°C' },
  'intel-core-i9-14900k': { tdp: 125, temp: '80-100°C' },
  'intel-core-i7-14700k': { tdp: 125, temp: '75-95°C' },
  'intel-core-i5-14600k': { tdp: 125, temp: '70-85°C' },
  'intel-core-ultra-9-285k': { tdp: 125, temp: '70-85°C' },
  'intel-core-ultra-7-265k': { tdp: 125, temp: '65-80°C' },
  'intel-core-ultra-5-245k': { tdp: 125, temp: '60-75°C' },

  // --- AMD CPU Desktop ---
  'amd-ryzen-7-1700': { tdp: 65, temp: '55-70°C' },
  'amd-ryzen-5-1600': { tdp: 65, temp: '50-65°C' },
  'amd-ryzen-7-2700x': { tdp: 105, temp: '60-75°C' },
  'amd-ryzen-5-2600': { tdp: 65, temp: '50-65°C' },
  'amd-ryzen-9-3950x': { tdp: 105, temp: '65-80°C' },
  'amd-ryzen-9-3900x': { tdp: 105, temp: '65-80°C' },
  'amd-ryzen-7-3700x': { tdp: 65, temp: '55-70°C' },
  'amd-ryzen-5-3600': { tdp: 65, temp: '55-70°C' },
  'amd-ryzen-9-5950x': { tdp: 105, temp: '65-80°C' },
  'amd-ryzen-9-5900x': { tdp: 105, temp: '65-80°C' },
  'amd-ryzen-7-5800x': { tdp: 105, temp: '65-80°C' },
  'amd-ryzen-7-5800x3d': { tdp: 105, temp: '70-85°C' },
  'amd-ryzen-5-5600x': { tdp: 65, temp: '55-70°C' },
  'amd-ryzen-5-5600': { tdp: 65, temp: '50-65°C' },
  'amd-ryzen-9-7950x': { tdp: 170, temp: '85-95°C' },
  'amd-ryzen-9-7950x3d': { tdp: 120, temp: '75-89°C' },
  'amd-ryzen-9-7900x': { tdp: 170, temp: '80-95°C' },
  'amd-ryzen-7-7800x3d': { tdp: 120, temp: '75-85°C' },
  'amd-ryzen-7-7700x': { tdp: 105, temp: '70-85°C' },
  'amd-ryzen-5-7600x': { tdp: 105, temp: '70-85°C' },
  'amd-ryzen-5-7600': { tdp: 65, temp: '55-70°C' },
  'amd-ryzen-9-9950x': { tdp: 170, temp: '85-95°C' },
  'amd-ryzen-9-9900x': { tdp: 120, temp: '75-90°C' },
  'amd-ryzen-7-9800x3d': { tdp: 120, temp: '75-85°C' },
  'amd-ryzen-7-9700x': { tdp: 65, temp: '60-75°C' },
  'amd-ryzen-5-9600x': { tdp: 65, temp: '55-70°C' },

  // --- NVIDIA GPU Desktop ---
  'nvidia-geforce-gtx-1080-ti': { tdp: 250, temp: '70-84°C' },
  'nvidia-geforce-gtx-1080': { tdp: 180, temp: '65-82°C' },
  'nvidia-geforce-gtx-1070': { tdp: 150, temp: '65-80°C' },
  'nvidia-geforce-gtx-1060-6gb': { tdp: 120, temp: '60-75°C' },
  'nvidia-geforce-gtx-1060-3gb': { tdp: 120, temp: '60-75°C' },
  'nvidia-geforce-gtx-1050-ti': { tdp: 75, temp: '55-70°C' },
  'nvidia-geforce-gtx-1660-ti': { tdp: 120, temp: '60-75°C' },
  'nvidia-geforce-gtx-1660-super': { tdp: 125, temp: '60-75°C' },
  'nvidia-geforce-gtx-1650-super': { tdp: 100, temp: '55-70°C' },
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

  // --- AMD GPU Desktop ---
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
  'amd-radeon-rx-7600': { tdp: 165, temp: '60-75°C' },
  'amd-radeon-rx-7600-xt': { tdp: 190, temp: '65-78°C' },
  'amd-radeon-rx-7700-xt': { tdp: 245, temp: '68-80°C' },
  'amd-radeon-rx-7800-xt': { tdp: 263, temp: '68-80°C' },
  'amd-radeon-rx-7900-gre': { tdp: 260, temp: '68-80°C' },
  'amd-radeon-rx-7900-xt': { tdp: 315, temp: '72-85°C' },
  'amd-radeon-rx-7900-xtx': { tdp: 355, temp: '75-89°C' },
  'amd-radeon-rx-9070': { tdp: 220, temp: '65-78°C' },
  'amd-radeon-rx-9070-xt': { tdp: 304, temp: '70-82°C' },

  // --- Intel GPU Desktop ---
  'intel-arc-a770': { tdp: 225, temp: '65-80°C' },
  'intel-arc-a750': { tdp: 225, temp: '65-80°C' },
  'intel-arc-a580': { tdp: 185, temp: '60-75°C' },
  'intel-arc-a380': { tdp: 75, temp: '50-65°C' },
  'intel-arc-a310': { tdp: 75, temp: '50-65°C' },
  'intel-arc-b580': { tdp: 190, temp: '60-75°C' },
  'intel-arc-b570': { tdp: 150, temp: '55-70°C' },
};

function migrateCPUFiles() {
  // intel-cpu.ts and amd-cpu.ts: add formFactor, tdp, loadTempRange to each entry
  const cpuFiles = ['intel-cpu.ts', 'amd-cpu.ts'];

  for (const file of cpuFiles) {
    const filePath = path.join(CHIPS_DIR, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    // Step 1: Add formFactor: 'desktop' after category: 'cpu'
    content = content.replace(
      /brand: '(intel|amd)', category: 'cpu',/g,
      "brand: '$1', category: 'cpu', formFactor: 'desktop' as const,"
    );

    // Step 2: Extract each chip id and add tdp/loadTempRange before dataQuality
    // Match pattern: chip id line, then find the dataQuality line after it
    const chipIdRegex = /id: '([^']+)',/g;
    let match;
    const replacements: Array<{ id: string; pos: number }> = [];

    while ((match = chipIdRegex.exec(content)) !== null) {
      const id = match[1];
      const info = tdpTemp[id];
      if (!info) {
        console.warn(`  ⚠ No TDP data for: ${id} (in ${file})`);
        continue;
      }
      // Find the dataQuality line for this chip entry
      // We'll use a different approach: find the position and insert before dataQuality
      // Find the dataQuality line that comes after this id
      const searchStart = match.index;
      const dataQPos = content.indexOf('dataQuality:', searchStart);
      if (dataQPos === -1) continue;
      const lineStart = content.lastIndexOf('\n', dataQPos) + 1;

      // Store position for later insertion

      replacements.push({ id, pos: lineStart });
      // Store replacement for batch processing below
    }

    // Apply replacements in reverse order to preserve positions
    const uniqueReplacements = new Map<number, string>();
    for (const { id, pos } of replacements) {
      const info = tdpTemp[id];
      if (!info) continue;
      const tdpVal = info.tdp ?? 'null';
      const tempVal = info.temp ? `'${info.temp}'` : 'null';
      const insert = `    tdp: ${tdpVal},\n    loadTempRange: ${tempVal},\n`;
      uniqueReplacements.set(pos, insert);
    }

    // Sort positions descending and apply
    const sorted = [...uniqueReplacements.entries()].sort((a, b) => b[0] - a[0]);
    for (const [pos, insert] of sorted) {
      content = content.slice(0, pos) + insert + content.slice(pos);
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  ✅ ${file}: ${sorted.length} entries updated`);
  }
}

function migrateGPUFiles() {
  // For GPU files, we modify the helper functions to include formFactor, tdp, loadTempRange
  // and add the values to each call

  // --- nvidia-gpu.ts ---
  let nvidiaContent = fs.readFileSync(path.join(CHIPS_DIR, 'nvidia-gpu.ts'), 'utf-8');

  // Update the nv() function to include formFactor + tdp + loadTempRange params
  nvidiaContent = nvidiaContent.replace(
    /function nv\(\s*\n\s+id: string,\s*\n\s+model: string,\s*\n\s+codename: string,\s*\n\s+generation: string,\s*\n\s+process: string,\s*\n\s+release: string,\s*\n\s+dieName: string,\s*\n\s+areaMm2: number,\s*\n\s+transistorsMillions: number,\s*\n\s+notes: string,\s*\n\)/,
    `function nv(
  id: string,
  model: string,
  codename: string,
  generation: string,
  process: string,
  release: string,
  dieName: string,
  areaMm2: number,
  transistorsMillions: number,
  notes: string,
  tdpVal: number | null = null,
  tempVal: string | null = null,
)`
  );

  // Add formFactor and tdp/loadTempRange to return object
  nvidiaContent = nvidiaContent.replace(
    /category: 'gpu' as const,\n    model,/g,
    "category: 'gpu' as const, formFactor: 'desktop' as const,\n    model,"
  );

  // Add after notes, before dataQuality
  nvidiaContent = nvidiaContent.replace(
    /(\s+)notes,\n(\s+)dataQuality:/g,
    (_, ws1, ws2) => `${ws1}notes,\n${ws1}tdp: tdpVal,\n${ws1}loadTempRange: tempVal,\n${ws2}dataQuality:`
  );

  // Add tdp/temp to each nv() call
  const nvCallRegex = /nv\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*\n\s*'([^']+)',\s*(\d+(?:\.\d+)?),\s*(\d+),\s*'([^']*)'\)/g;
  nvidiaContent = nvidiaContent.replace(nvCallRegex, (match, id, ..._rest) => {
    const info = tdpTemp[id];
    if (!info) {
      console.warn(`  ⚠ No TDP data for NVIDIA GPU: ${id}`);
      return match.replace(/\)$/, ', null, null)');
    }
    const tdpV = info.tdp ?? 'null';
    const tempV = info.temp ? `'${info.temp}'` : 'null';
    return match.replace(/\)$/, `, ${tdpV}, ${tempV})`);
  });

  fs.writeFileSync(path.join(CHIPS_DIR, 'nvidia-gpu.ts'), nvidiaContent, 'utf-8');
  console.log('  ✅ nvidia-gpu.ts updated');

  // --- amd-gpu.ts ---
  let amdGpuContent = fs.readFileSync(path.join(CHIPS_DIR, 'amd-gpu.ts'), 'utf-8');

  // Update amdMono() function
  amdGpuContent = amdGpuContent.replace(
    /function amdMono\(\s*\n\s+id: string,\s*\n\s+model: string,\s*\n\s+codename: string,\s*\n\s+generation: string,\s*\n\s+process: string,\s*\n\s+release: string,\s*\n\s+dieName: string,\s*\n\s+areaMm2: number,\s*\n\s+transistorsMillions: number,\s*\n\s+notes: string,\s*\n\)/,
    `function amdMono(
  id: string,
  model: string,
  codename: string,
  generation: string,
  process: string,
  release: string,
  dieName: string,
  areaMm2: number,
  transistorsMillions: number,
  notes: string,
  tdpVal: number | null = null,
  tempVal: string | null = null,
)`
  );

  amdGpuContent = amdGpuContent.replace(
    /category: 'gpu' as const,\n    model,/g,
    "category: 'gpu' as const, formFactor: 'desktop' as const,\n    model,"
  );

  amdGpuContent = amdGpuContent.replace(
    /(\s+)notes,\n(\s+)dataQuality:/g,
    (_, ws1, ws2) => `${ws1}notes,\n${ws1}tdp: tdpVal,\n${ws1}loadTempRange: tempVal,\n${ws2}dataQuality:`
  );

  const amdCallRegex = /amdMono\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*\n\s*'([^']+)',\s*(\d+(?:\.\d+)?),\s*(\d+),\s*'([^']*)'\)/g;
  amdGpuContent = amdGpuContent.replace(amdCallRegex, (match, id, ..._rest) => {
    const info = tdpTemp[id];
    if (!info) {
      console.warn(`  ⚠ No TDP data for AMD GPU: ${id}`);
      return match.replace(/\)$/, ', null, null)');
    }
    const tdpV = info.tdp ?? 'null';
    const tempV = info.temp ? `'${info.temp}'` : 'null';
    return match.replace(/\)$/, `, ${tdpV}, ${tempV})`);
  });

  // For multi-die AMD GPUs (Navi 31/32), they're plain objects - need manual tdp/temp insertion
  // RX 7900 XTX, 7900 XT, 7900 GRE, 7800 XT, 7700 XT
  for (const [id, info] of Object.entries(tdpTemp)) {
    if (!id.startsWith('amd-radeon-rx-79') && !id.startsWith('amd-radeon-rx-78') && !id.startsWith('amd-radeon-rx-77')) continue;
    // Skip if already handled by amdMono
    if (id === 'amd-radeon-rx-7600' || id === 'amd-radeon-rx-7600-xt') continue;
    // Check if this chip appears in the file as a raw object (not amdMono call)
    if (!amdGpuContent.includes(`id: '${id}'`)) continue;
    // Find and insert tdp/loadTempRange before dataQuality
    const idx = amdGpuContent.indexOf(`id: '${id}'`);
    const dataQIdx = amdGpuContent.indexOf('dataQuality:', idx);
    if (dataQIdx === -1) continue;
    const lineStart = amdGpuContent.lastIndexOf('\n', dataQIdx) + 1;
    const tdpV = info.tdp ?? 'null';
    const tempV = info.temp ? `'${info.temp}'` : 'null';
    const insert = `    tdp: ${tdpV},\n    loadTempRange: ${tempV},\n`;
    if (!amdGpuContent.includes(insert.trim())) {
      amdGpuContent = amdGpuContent.slice(0, lineStart) + insert + amdGpuContent.slice(lineStart);
    }
  }
  // Also need to add formFactor to multi-die entries
  amdGpuContent = amdGpuContent.replace(
    /brand: 'amd', category: 'gpu',\n/g,
    "brand: 'amd', category: 'gpu', formFactor: 'desktop' as const,\n"
  );

  fs.writeFileSync(path.join(CHIPS_DIR, 'amd-gpu.ts'), amdGpuContent, 'utf-8');
  console.log('  ✅ amd-gpu.ts updated');

  // --- intel-gpu.ts ---
  let intelGpuContent = fs.readFileSync(path.join(CHIPS_DIR, 'intel-gpu.ts'), 'utf-8');

  intelGpuContent = intelGpuContent.replace(
    /function arc\(\s*\n\s+id: string,\s*\n\s+model: string,\s*\n\s+codename: string,\s*\n\s+generation: string,\s*\n\s+process: string,\s*\n\s+release: string,\s*\n\s+dieName: string,\s*\n\s+areaMm2: number,\s*\n\s+transistorsMillions: number,\s*\n\s+notes: string,\s*\n\)/,
    `function arc(
  id: string,
  model: string,
  codename: string,
  generation: string,
  process: string,
  release: string,
  dieName: string,
  areaMm2: number,
  transistorsMillions: number,
  notes: string,
  tdpVal: number | null = null,
  tempVal: string | null = null,
)`
  );

  intelGpuContent = intelGpuContent.replace(
    /category: 'gpu' as const,\n    model,/g,
    "category: 'gpu' as const, formFactor: 'desktop' as const,\n    model,"
  );

  intelGpuContent = intelGpuContent.replace(
    /(\s+)notes,\n(\s+)dataQuality:/g,
    (_, ws1, ws2) => `${ws1}notes,\n${ws1}tdp: tdpVal,\n${ws1}loadTempRange: tempVal,\n${ws2}dataQuality:`
  );

  const arcCallRegex = /arc\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*\n\s*'([^']+)',\s*(\d+(?:\.\d+)?),\s*(\d+),\s*'([^']*)'\)/g;
  intelGpuContent = intelGpuContent.replace(arcCallRegex, (match, id, ..._rest) => {
    const info = tdpTemp[id];
    if (!info) {
      console.warn(`  ⚠ No TDP data for Intel GPU: ${id}`);
      return match.replace(/\)$/, ', null, null)');
    }
    const tdpV = info.tdp ?? 'null';
    const tempV = info.temp ? `'${info.temp}'` : 'null';
    return match.replace(/\)$/, `, ${tdpV}, ${tempV})`);
  });

  fs.writeFileSync(path.join(CHIPS_DIR, 'intel-gpu.ts'), intelGpuContent, 'utf-8');
  console.log('  ✅ intel-gpu.ts updated');
}

// ========== RUN ==========
console.log('🔧 ChipSpec DB v2 数据迁移\n');
console.log('--- CPU 文件 ---');
migrateCPUFiles();
console.log('\n--- GPU 文件 ---');
migrateGPUFiles();
console.log('\n✅ 迁移完成！请运行 npm run validate 检查。');
