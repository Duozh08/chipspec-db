/**
 * 芯片数据校验脚本：npm run validate
 * 检查项：
 *  1. id 全局唯一
 *  2. 必填字段非空
 *  3. Die 长×宽 ≈ 面积（容差 15%，不一致警告）
 *  4. 封装长×宽合理性（1~200mm）
 *  5. layout 坐标在 0~1 之间
 *  6. 多 Die 面积总和 vs 芯片级备注（仅提示）
 */
import { allChips } from '../src/data/index';

let errors = 0;
let warnings = 0;

const err = (id: string, msg: string) => {
  errors++;
  console.error(`  [ERROR] ${id}: ${msg}`);
};
const warn = (id: string, msg: string) => {
  warnings++;
  console.warn(`  [WARN]  ${id}: ${msg}`);
};

const ids = new Set<string>();

for (const chip of allChips) {
  // 1. id 唯一 + 格式
  if (ids.has(chip.id)) err(chip.id, 'id 重复');
  ids.add(chip.id);
  if (!/^[a-z0-9-]+$/.test(chip.id)) err(chip.id, 'id 含非法字符（仅允许小写字母/数字/连字符）');

  // 2. 必填字段
  if (!chip.model?.trim()) err(chip.id, 'model 为空');
  if (!chip.codename?.trim()) err(chip.id, 'codename 为空');
  if (!chip.generation?.trim()) err(chip.id, 'generation 为空');
  if (!chip.process?.trim()) err(chip.id, 'process 为空');
  if (!chip.formFactor) err(chip.id, 'formFactor 为空');
  if (!chip.package?.type?.trim()) err(chip.id, 'package.type 为空');
  if (!chip.dies || chip.dies.length === 0) err(chip.id, 'dies 为空');
  if (!chip.sources || chip.sources.length === 0) warn(chip.id, 'sources 为空');

  // 3. Die 检查
  const dieNames = new Set<string>();
  for (const die of chip.dies ?? []) {
    if (dieNames.has(die.name)) warn(chip.id, `Die 名称重复: ${die.name}`);
    dieNames.add(die.name);
    if (die.areaMm2 == null && die.lengthMm == null && die.widthMm == null) {
      warn(chip.id, `Die "${die.name}" 面积与长宽均缺失`);
    }
    if (die.lengthMm != null && die.widthMm != null && die.areaMm2 != null) {
      const product = die.lengthMm * die.widthMm;
      const ratio = product / die.areaMm2;
      if (ratio < 0.85 || ratio > 1.15) {
        warn(chip.id, `Die "${die.name}" 长×宽(${product.toFixed(1)}) 与面积(${die.areaMm2}) 偏差超过 15%`);
      }
    }
    if (die.areaMm2 != null && (die.areaMm2 <= 0 || die.areaMm2 > 2000)) {
      warn(chip.id, `Die "${die.name}" 面积异常: ${die.areaMm2} mm²`);
    }
    if (die.layout) {
      const { x, y } = die.layout;
      if (x < 0 || x > 1 || y < 0 || y > 1) err(chip.id, `Die "${die.name}" layout 坐标越界 (${x}, ${y})`);
    }
  }

  // 4. 封装尺寸
  const pkg = chip.package;
  if (pkg.lengthMm != null && (pkg.lengthMm <= 0 || pkg.lengthMm > 200)) {
    warn(chip.id, `封装长异常: ${pkg.lengthMm}mm`);
  }
  if (pkg.widthMm != null && (pkg.widthMm <= 0 || pkg.widthMm > 200)) {
    warn(chip.id, `封装宽异常: ${pkg.widthMm}mm`);
  }
  if (chip.category === 'gpu' && pkg.lengthMm != null) {
    warn(chip.id, 'GPU 封装有长宽数据（罕见，请确认来源）');
  }
  if (chip.category === 'cpu' && pkg.lengthMm == null) {
    warn(chip.id, 'CPU 封装缺长宽数据');
  }

  // 6. TDP 合理性
  if (chip.tdp != null && (chip.tdp <= 0 || chip.tdp > 1000)) {
    warn(chip.id, `TDP 异常: ${chip.tdp} W`);
  }

  // 7. 多 Die 面积提示
  const dieAreaSum = (chip.dies ?? []).reduce((s, d) => s + (d.areaMm2 ?? 0), 0);
  if (chip.dies.length > 1 && dieAreaSum > 0) {
    console.log(`  [info]  ${chip.id}: ${chip.dies.length} dies, 合计 ${dieAreaSum.toFixed(1)} mm²`);
  }
}

console.log(`\n共 ${allChips.length} 颗芯片：${errors} 个错误，${warnings} 个警告`);

if (errors > 0) {
  throw new Error(`数据校验失败：${errors} 个错误`);
}
