export type Brand = 'intel' | 'amd' | 'nvidia';
export type Category = 'cpu' | 'gpu';
export type FormFactor = 'desktop' | 'mobile';
export type DataQuality = 'official' | 'measured' | 'estimated';

/** 单个 Die（裸片）信息 */
export interface DieInfo {
  /** Die 名称，如 "Compute Die"、"CCD0"、"IOD"、"GCD"、"MCD0" */
  name: string;
  /** Die 角色，用于示意图配色 */
  role: 'compute' | 'io' | 'graphics' | 'cache' | 'soc' | 'other';
  /** 该 Die 的制程（Chiplet 各 Die 制程常不同，如 Zen4 CCD=N5、IOD=N6） */
  process: string | null;
  /** Die 面积 mm²，无公开数据则 null */
  areaMm2: number | null;
  /** Die 长（水平方向）mm；只有面积无长宽时为 null，示意图按正方形近似 */
  lengthMm: number | null;
  /** Die 宽（垂直方向）mm */
  widthMm: number | null;
  /** 该 Die 晶体管数（百万），无数据则 null */
  transistorsMillions: number | null;
  /** 示意图布局：Die 中心在封装内部区域的相对坐标（0~1，0,0=左上）。缺省时自动排列 */
  layout?: { x: number; y: number };
  /** 该 Die 数据来源说明，如 "WikiChip 实测" */
  note?: string;
}

/** 封装信息 */
export interface PackageInfo {
  /** 封装型号，如 "FCLGA1700"、"AM5 (LGA1718)"、"BGA-3328" */
  type: string;
  /** 封装形态，用于示意图视觉区分（触点阵列 vs 焊球阵列纹理） */
  style: 'lga' | 'pga' | 'bga';
  /** 封装物理长（水平）mm。桌面 CPU 有公开数据；GPU BGA 封装基本无公开 → null */
  lengthMm: number | null;
  /** 封装物理宽（垂直）mm */
  widthMm: number | null;
}

/** 数据来源 */
export interface Source {
  label: string;
  url: string;
}

/** 一颗芯片（SKU） */
export interface Chip {
  /** URL slug，全局唯一，如 "intel-core-i9-13900k" */
  id: string;
  brand: Brand;
  category: Category;
  /** 形态：桌面端 / 移动端（笔记本） */
  formFactor: FormFactor;
  /** 型号名，如 "Core i9-13900K"、"GeForce RTX 4090" */
  model: string;
  /** 核心代号，如 "Raptor Lake"、"AD102"、"Navi 31"、"Raphael" */
  codename: string;
  /** 代际分组（筛选用），如 "13th Gen Core"、"RTX 40"、"Ryzen 7000" */
  generation: string;
  /** 主制程描述，如 "Intel 7 (10nm ESF)"、"TSMC 4N (5nm 级)" */
  process: string;
  /** 发布时间 "YYYY-MM"；只有年份则 "YYYY" */
  release: string | null;
  package: PackageInfo;
  dies: DieInfo[];
  /** 芯片级晶体管总数（百万）；多 Die 时可由 dies 汇总，官方总数优先 */
  transistorsMillions: number | null;
  /** 备注：数据争议、估算依据、特殊结构说明等 */
  notes: string | null;
  /** TDP / 热设计功耗（W），官方 PL1/PPT 值；无数据则 null */
  tdp: number | null;
  /** 满载温度区间（°C），如 "70-85°C"，来自第三方评测典型值；无数据则 null */
  loadTempRange: string | null;
  /** 数据质量：official=官方数据 / measured=第三方实测 / estimated=估算 */
  dataQuality: DataQuality;
  sources: Source[];
}

export const BRAND_LABELS: Record<Brand, string> = {
  intel: 'Intel',
  amd: 'AMD',
  nvidia: 'NVIDIA',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  cpu: '处理器 CPU',
  gpu: '显卡 GPU',
};

export const FORM_FACTOR_LABELS: Record<FormFactor, string> = {
  desktop: '桌面端',
  mobile: '移动端（笔记本）',
};

export const DATA_QUALITY_LABELS: Record<DataQuality, string> = {
  official: '官方数据',
  measured: '第三方实测',
  estimated: '估算值',
};

/** Die 总面积（仅统计有面积数据的 Die） */
export function totalDieArea(chip: Chip): number | null {
  const areas = chip.dies.map((d) => d.areaMm2).filter((a): a is number => a != null);
  if (areas.length === 0) return null;
  return Math.round(areas.reduce((s, a) => s + a, 0) * 10) / 10;
}

/** 格式化 mm² 面积 */
export function fmtArea(a: number | null): string {
  return a == null ? '暂无数据' : `${a} mm²`;
}

/** 数字保留 1 位小数（整数则不带小数点） */
function trim1(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/**
 * 单个 Die 的长宽尺寸（mm）。
 * 优先实测长宽；缺失时按面积折算为正方形近似（approx=true）；面积也缺失则 null。
 */
export function dieDimsMm(d: DieInfo): { l: number; w: number; approx: boolean } | null {
  if (d.lengthMm != null && d.widthMm != null) return { l: d.lengthMm, w: d.widthMm, approx: false };
  if (d.areaMm2 != null && d.areaMm2 > 0) {
    const side = Math.sqrt(d.areaMm2);
    return { l: side, w: side, approx: true };
  }
  return null;
}

/** 格式化 Die 长×宽（折算值带标注） */
export function fmtDieDims(d: DieInfo): string {
  const dims = dieDimsMm(d);
  if (!dims) return '暂无数据';
  const base = `${trim1(dims.l)} × ${trim1(dims.w)} mm`;
  return dims.approx ? `${base}（按面积折算）` : base;
}

/** 格式化 长×宽 */
export function fmtDims(l: number | null, w: number | null): string {
  if (l == null || w == null) return '暂无数据';
  return `${l} × ${w} mm`;
}

/** 格式化晶体管数（百万 → B / 亿） */
export function fmtTransistors(m: number | null): string {
  if (m == null) return '暂无数据';
  if (m >= 1000) return `${(m / 1000).toFixed(1)}B（${Math.round(m / 100)}亿）`;
  return `${m}M`;
}

/** 格式化 TDP */
export function fmtTdp(w: number | null): string {
  return w == null ? '暂无数据' : `${w} W`;
}

/* ================================================================
 * 游戏本（Laptop）数据类型
 * ================================================================ */

export type LaptopBrand =
  | 'lenovo'
  | 'asus'
  | 'hp'
  | 'alienware'
  | 'acer'
  | 'msi'
  | 'razer'
  | 'colorful'
  | 'mechrevo';

export const LAPTOP_BRAND_LABELS: Record<LaptopBrand, string> = {
  lenovo: '联想 Lenovo',
  asus: '华硕 ASUS',
  hp: '惠普 HP',
  alienware: '外星人 Alienware',
  acer: '宏碁 Acer',
  msi: '微星 MSI',
  razer: '雷蛇 Razer',
  colorful: '七彩虹 Colorful',
  mechrevo: '机械革命 Mechrevo',
};

/** 单烤 / 双烤测试数据 */
export interface StressTestData {
  /** 单烤 CPU：功耗(W) */
  cpuPowerW: number | null;
  /** 单烤 CPU：温度(°C) */
  cpuTempC: number | null;
  /** 单烤 CPU：频率(GHz) */
  cpuFreqGHz: number | null;
  /** 单烤 GPU：功耗(W) */
  gpuPowerW: number | null;
  /** 单烤 GPU：温度(°C) */
  gpuTempC: number | null;
  /** 单烤 GPU：频率(MHz) */
  gpuFreqMHz: number | null;
  /** 双烤 CPU 功耗(W) */
  dualCpuPowerW: number | null;
  /** 双烤 GPU 功耗(W) */
  dualGpuPowerW: number | null;
  /** 双烤 CPU 温度(°C) */
  dualCpuTempC: number | null;
  /** 双烤 GPU 温度(°C) */
  dualGpuTempC: number | null;
  /** 数据说明 / 来源 */
  note?: string;
}

/** 游戏本型号 */
export interface Laptop {
  /** URL slug，全局唯一 */
  id: string;
  brand: LaptopBrand;
  /** 系列名，如 "Legion"、"ROG Strix"、"Omen" */
  series: string;
  /** 中文展示名称，如 "拯救者Y9000P"、"魔霸7 Plus" */
  displayName?: string;
  /** 具体型号，如 "Legion Pro 7 16IRX9" */
  model: string;
  /** 发布时间 "YYYY" 或 "YYYY-MM" */
  release: string | null;
  /** 处理器（型号名称，如 "Core i9-14900HX"） */
  cpu: string;
  /** 显卡（型号名称，如 "GeForce RTX 4070 Laptop"） */
  gpu: string;
  /** 内存（如 "32 GB DDR5-5600"） */
  ram: string;
  /** 硬盘（如 "1 TB PCIe 4.0 NVMe SSD"） */
  storage: string;
  /** 屏幕（如 '16" 2560×1600 240Hz IPS'） */
  display: string;
  /** 重量（kg），精确到 0.01 */
  weightKg: number | null;
  /** 参考售价（人民币元），取主流电商中配价格区间高值 */
  priceCny: number | null;
  /** 烤机测试数据（单烤CPU/单烤GPU/双烤） */
  stressTest?: StressTestData;
  /** 数据来源 */
  sources: Source[];
}

export const LAPTOP_SERIES_BY_BRAND: Record<LaptopBrand, string[]> = {
  lenovo: ['Legion Pro 7', 'Legion Pro 5', 'Legion 7', 'Legion 5'],
  asus: ['ROG Strix Scar', 'ROG Strix G', 'ROG Zephyrus G', 'ROG Zephyrus M', 'TUF Gaming'],
  hp: ['Omen 17', 'Omen 16', 'Omen Transcend'],
  alienware: ['Alienware m18', 'Alienware m16', 'Alienware x16', 'Alienware m15', 'Alienware x15'],
  acer: ['Predator Helios 18', 'Predator Helios 16', 'Predator Helios Neo'],
  msi: ['Raider', 'Stealth', 'Vector', 'Katana', 'GP', 'GE'],
  razer: ['Blade 18', 'Blade 16', 'Blade 14', 'Blade 15'],
  colorful: ['隐星 P16', '隐星 P15'],
  mechrevo: ['蛟龙16', '蛟龙17', '极光Pro', '极光X', '钛钽Plus', '耀世16 Pro', '旷世16'],
};
