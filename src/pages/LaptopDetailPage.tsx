import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { allLaptops, getLaptopById } from '../data/laptops';
import { stressTests } from '../data/stress-tests';
import { allChips } from '../data';
import type { Chip } from '../data/types';
import { LAPTOP_BRAND_LABELS, cpuPlatform, fmtDieDims } from '../data/types';
import { useFavorites } from '../hooks/useFavorites';
import { getLaptopChipAdditions, addLaptopChipAddition, notifyChipAdditionsChanged } from '../utils/laptopChipAdditions';
import { apiCollect } from '../utils/apiClient';
import { addLocalCatalogItem } from '../utils/localCatalog';
import { addPendingItem, guessBrand } from '../utils/pendingStore';

/** 从显卡方案字符串解析功耗，如 "RTX 4060 (140W)" → "140W" */
function parsePower(s: string): string | null {
  const m = s.match(/\((\d+)\s*W\)/i);
  return m ? `${m[1]} W` : null;
}

function normModel(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** 匹配 CPU 芯片（精确 → 直接包含 → 核心编号，命中多个时取最短型号）。formFactor 可选，默认全部（含桌面端） */
function matchCpu(query: string, formFactor?: 'mobile' | 'desktop'): Chip | undefined {
  let cpus = allChips.filter((c) => c.category === 'cpu');
  if (formFactor) cpus = cpus.filter((c) => c.formFactor === formFactor);
  const q = normModel(query);
  if (q.length >= 4) {
    const exact = cpus.find((c) => normModel(c.model) === q);
    if (exact) return exact;
    const inc = cpus.find((c) => normModel(c.model).includes(q));
    if (inc) return inc;
  }
  // 提取核心型号标识：如 "i9-14900HX" → "14900hx"、"R7 7745HX" → "7745hx"（要求 ≥4 位数字避免误匹配）
  const core = query.toLowerCase().match(/(\d{4,}[a-z]*\s*hx|\d{4,})/i)?.[0]?.replace(/\s+/g, '');
  if (core) {
    const hits = cpus.filter((c) => normModel(c.model).includes(core));
    if (hits.length > 0) {
      return hits.sort((a, b) => normModel(a.model).length - normModel(b.model).length)[0];
    }
  }
  return undefined;
}

/** 匹配 GPU 芯片（RTX/GTX/RX 编号提取；区分 Ti 版本）。formFactor 可选，默认全部 */
function matchGpu(query: string, formFactor?: 'mobile' | 'desktop'): Chip | undefined {
  const lower = query.toLowerCase();
  const m = lower.match(/(rtx\s*\d+)/) ?? lower.match(/(gtx\s*\d+)/) ?? lower.match(/(rx\s*\d+)/);
  if (!m) return undefined;
  const key = m[1].replace(/\s+/g, '');
  let cands = allChips.filter((c) => c.category === 'gpu' && normModel(c.model).includes(key));
  if (formFactor) cands = cands.filter((c) => c.formFactor === formFactor);
  if (cands.length === 0) return undefined;
  const isTi = /\bti\b/i.test(lower.replace(/\s+/g, ' '));
  if (isTi) return cands.find((c) => normModel(c.model).includes('ti')) ?? cands[0];
  return cands.find((c) => !normModel(c.model).includes('ti')) ?? cands[0];
}

/** 芯片 Die 长宽摘要（多 Die 显示首 Die + 总数） */
function dieDimsSummary(chip: Chip): string {
  if (chip.dies.length === 0) return '暂无数据';
  const first = fmtDieDims(chip.dies[0]);
  return chip.dies.length > 1 ? `${first}（共${chip.dies.length} Die）` : first;
}

export default function LaptopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const laptop = id ? getLaptopById(id) : undefined;
  const navigate = useNavigate();
  const { has: hasFav, toggle: toggleFav } = useFavorites();

  if (!laptop) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
        <p className="text-slate-500">未找到该游戏本（id: {id}）</p>
        <Link to="/laptops" className="mt-3 inline-block text-blue-600 hover:underline">
          ← 返回游戏本列表
        </Link>
      </div>
    );
  }

  const inFav = hasFav(laptop.id);
  const year = laptop.release ? laptop.release.slice(0, 4) : '';
  const stress = stressTests[laptop.id];

  // 本地补充方案（用户手动提交的处理器/显卡）
  const [additions, setAdditions] = useState<{ cpus: string[]; gpus: string[] }>(() => getLaptopChipAdditions(laptop.id));
  // 提交表单状态
  const [chipType, setChipType] = useState<'cpu' | 'gpu'>('cpu');
  const [chipInput, setChipInput] = useState('');
  const [chipMsg, setChipMsg] = useState<{ kind: 'ok' | 'info' | 'err'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 合并后的方案（站内静态 + 本地补充，去重）
  const allCpuOptions = [...laptop.cpuOptions, ...additions.cpus.filter((c) => !laptop.cpuOptions.some((x) => x.toLowerCase() === c.toLowerCase()))];
  const allGpuOptions = [...laptop.gpuOptions, ...additions.gpus.filter((g) => !laptop.gpuOptions.some((x) => x.toLowerCase() === g.toLowerCase()))];

  // 按平台分组 CPU 方案
  const intelCpus = allCpuOptions.filter((c) => cpuPlatform(c) === 'intel');
  const amdCpus = allCpuOptions.filter((c) => cpuPlatform(c) === 'amd');
  const hasIntel = intelCpus.length > 0;
  const hasAmd = amdCpus.length > 0;

  // 最大显卡功耗（解析 gpuOptions 中的功耗标注）
  const gpuPowers = allGpuOptions
    .map((g) => g.match(/\((\d+)\s*W\)/i)?.[1])
    .filter(Boolean)
    .map(Number);
  const maxGpuPowerW = gpuPowers.length > 0 ? Math.max(...gpuPowers) : null;

  // 屏幕解析：刷新率 / 分辨率
  const refreshMatch = laptop.display?.match(/(\d+)\s*(?:Hz|HZ)/i);
  const refreshHz = refreshMatch ? Number(refreshMatch[1]) : null;
  const resText = laptop.display?.match(/(\d{3,4})\s*[x×]\s*(\d{3,4})/i);
  const resPixels = resText ? Number(resText[1]) * Number(resText[2]) : null;
  const isHighRes = resPixels != null && resPixels >= 3686400; // ≥2560x1440

  // 双烤总功耗
  const dualTotal = stress?.dualCpuPowerW != null && stress?.dualGpuPowerW != null ? stress.dualCpuPowerW + stress.dualGpuPowerW : null;

  // 特性标签（行业卖点）
  const features: string[] = [];
  if (hasIntel && hasAmd) features.push('双平台可选');
  else if (hasAmd) features.push('AMD 平台');
  else features.push('Intel 平台');
  if (maxGpuPowerW != null) {
    if (maxGpuPowerW >= 140) features.push('满血显卡');
    else if (maxGpuPowerW >= 100) features.push('高功耗显卡');
    else features.push('标准功耗显卡');
  }
  if (refreshHz != null && refreshHz >= 165) features.push('高刷电竞屏');
  if (isHighRes) features.push('高分屏');
  if (stress) features.push('第三方烤机实测');
  if (dualTotal != null && dualTotal >= 200) features.push('性能释放激进');

  // 同品牌相关机型（排除自身，年份倒序取 6 款）
  const related = allLaptops
    .filter((l) => l.brand === laptop.brand && l.id !== laptop.id)
    .sort((a, b) => (b.release ?? '').localeCompare(a.release ?? ''))
    .slice(0, 6);

  // 品牌主色（用于基本规格中处理器/显卡方案的强调显示）
  const BRAND_COLOR: Record<string, string> = {
    lenovo: 'text-red-600',
    asus: 'text-blue-700',
    hp: 'text-blue-600',
    dell: 'text-sky-700',
    acer: 'text-emerald-600',
    msi: 'text-rose-600',
    razer: 'text-green-600',
    colorful: 'text-fuchsia-600',
    mechrevo: 'text-indigo-600',
    hasee: 'text-amber-600',
    xiaomi: 'text-orange-600',
    honor: 'text-cyan-600',
    gigabyte: 'text-violet-600',
    huawei: 'text-red-600',
    machenike: 'text-teal-600',
    thunderobot: 'text-sky-600',
  };
  const brandColor = BRAND_COLOR[laptop.brand] ?? 'text-blue-600';

  // 基本规格：处理器方案 / 显卡方案置顶并强调显示
  const specs: [string, string, boolean?][] = [
    ['处理器方案', `${allCpuOptions.length} 种（${allCpuOptions.join(' / ')}）`, true],
    ['显卡方案', `${allGpuOptions.length} 种（${allGpuOptions.join(' / ')}）`, true],
    ['品牌', LAPTOP_BRAND_LABELS[laptop.brand]],
    ['系列', laptop.series],
    ['中文名称', laptop.displayName],
    ['型号', laptop.model],
    ['发布时间', laptop.release ?? '暂无数据'],
    ['处理器平台', hasAmd && hasIntel ? 'Intel + AMD 双平台' : hasAmd ? 'AMD' : 'Intel'],
    ['最大显卡功耗', maxGpuPowerW != null ? `${maxGpuPowerW} W` : '暂无数据'],
    ['内存', laptop.ram],
    ['硬盘', laptop.storage],
    ['屏幕', laptop.display],
  ];

  /** 提交处理器/显卡方案：站内有芯片数据 → 直接加入；没有 → 触发 AI 补录 */
  const handleSubmitChip = async () => {
    const name = chipInput.trim();
    if (!name) {
      setChipMsg({ kind: 'err', text: '请输入型号名称' });
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    setChipMsg(null);
    try {
      // 查站内芯片库：游戏本场景优先移动端，未命中再回退桌面端
      const chipInfo =
        chipType === 'cpu'
          ? (matchCpu(name, 'mobile') ?? matchCpu(name, 'desktop'))
          : (matchGpu(name, 'mobile') ?? matchGpu(name, 'desktop'));
      if (chipInfo) {
        // 站内已有该芯片 → 直接加入本地补充方案
        addLaptopChipAddition(laptop.id, chipType, name);
        setAdditions(getLaptopChipAdditions(laptop.id));
        notifyChipAdditionsChanged();
        setChipMsg({ kind: 'ok', text: `站内已有该芯片（${chipInfo.model}），已加入本机方案` });
      } else {
        // 站内没有 → 触发 AI 补录
        const brand = guessBrand(name);
        let backend = false;
        try {
          await apiCollect(name, 'chip', brand);
          backend = true;
        } catch {
          backend = false;
        }
        await addLocalCatalogItem(name, 'chip', brand);
        addPendingItem({
          name,
          category: 'chip',
          brand,
          note: backend ? '游戏本方案补录，已提交后端 AI 补全' : '游戏本方案补录（本地）',
        });
        addLaptopChipAddition(laptop.id, chipType, name);
        setAdditions(getLaptopChipAdditions(laptop.id));
        notifyChipAdditionsChanged();
        setChipMsg({
          kind: 'info',
          text: backend ? '站内暂无该芯片，已触发 AI 自动补录（芯片列表将显示 NEW），并加入本机方案' : '站内暂无该芯片，已本地收录（芯片列表显示 NEW），并加入本机方案',
        });
      }
    } catch (err) {
      console.error(err);
      setChipMsg({ kind: 'err', text: '提交失败，请重试' });
    } finally {
      setSubmitting(false);
    }
  };

  // 跨页同步：其他标签页提交了补充方案后本页自动刷新
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'chipspec-laptop-chip-additions') {
        setAdditions(getLaptopChipAdditions(laptop.id));
      }
    };
    const onCustom = () => setAdditions(getLaptopChipAdditions(laptop.id));
    window.addEventListener('storage', onStorage);
    window.addEventListener('chipspec-laptop-chip-additions', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('chipspec-laptop-chip-additions', onCustom);
    };
  }, [laptop.id]);

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate(-1)}
        className="inline-block text-sm text-slate-500 hover:text-blue-600"
      >
        ← 返回游戏本列表
      </button>

      {/* 标题区 */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">
          {laptop.displayName}
          {year && !laptop.displayName.includes(year) ? ` ${year}款` : ''}
        </h1>
        <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-medium text-white">
          {LAPTOP_BRAND_LABELS[laptop.brand]}
        </span>
        <span className="rounded-full border border-slate-300 px-2.5 py-0.5 text-xs text-slate-600">
          {laptop.series}
        </span>
        <span className="rounded-full border border-slate-300 px-2.5 py-0.5 text-xs text-slate-600">
          {laptop.model}
        </span>
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => toggleFav(laptop.id)}
            className={`rounded-lg border px-3.5 py-1.5 text-sm font-medium transition ${
              inFav
                ? 'border-red-500 bg-red-500 text-white hover:bg-red-600'
                : 'border-slate-300 text-slate-600 hover:border-red-400 hover:text-red-600'
            }`}
          >
            {inFav ? '★ 已关注' : '☆ 关注'}
          </button>
        </div>
      </div>

      {/* 特性标签（行业卖点） */}
      {features.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {features.map((f) => (
            <span key={f} className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              {f}
            </span>
          ))}
        </div>
      )}

      {/* 左右两列：左=示意图+速览，右=规格+方案 */}
      <div className="grid items-stretch gap-5 lg:grid-cols-[300px_1fr]">
        {/* 左列 */}
        <div className="flex flex-col gap-3">
          {/* 笔记本示意图 */}
          <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-6 shadow-sm">
            <svg viewBox="0 0 120 100" className="h-28 w-32 text-slate-400" fill="none" stroke="currentColor">
              <rect x="15" y="10" width="90" height="55" rx="3" strokeWidth="2" />
              <rect x="20" y="15" width="80" height="45" rx="1" strokeWidth="1" opacity="0.4" />
              <path d="M8 72 L112 72 L108 82 L12 82 Z" strokeWidth="2" strokeLinejoin="round" />
              <line x1="55" y1="77" x2="65" y2="77" strokeWidth="1.5" />
            </svg>
          </div>

          {/* 关键参数速览 */}
          <div className="flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-semibold text-slate-700">关键参数速览</div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-lg bg-slate-50 p-2.5">
                <div className="text-xs text-slate-500">处理器平台</div>
                <div className="mt-0.5 text-sm font-medium text-slate-800">
                  {hasAmd && hasIntel ? 'Intel+AMD' : hasAmd ? 'AMD' : 'Intel'}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5">
                <div className="text-xs text-slate-500">处理器方案</div>
                <div className="mt-0.5 text-sm font-medium text-slate-800">{allCpuOptions.length} 种</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5">
                <div className="text-xs text-slate-500">最大显卡功耗</div>
                <div className="mt-0.5 text-sm font-medium text-slate-800">
                  {maxGpuPowerW != null ? `${maxGpuPowerW} W` : '暂无数据'}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5">
                <div className="text-xs text-slate-500">屏幕刷新率</div>
                <div className="mt-0.5 text-sm font-medium text-slate-800">
                  {refreshHz != null ? `${refreshHz} Hz` : '暂无数据'}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5">
                <div className="text-xs text-slate-500">内存</div>
                <div className="mt-0.5 truncate text-sm font-medium text-slate-800">{laptop.ram}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5">
                <div className="text-xs text-slate-500">硬盘</div>
                <div className="mt-0.5 truncate text-sm font-medium text-slate-800">{laptop.storage}</div>
              </div>
              {stress && dualTotal != null && (
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <div className="text-xs text-slate-500">双烤总功耗</div>
                  <div className="mt-0.5 text-sm font-medium text-slate-800">{dualTotal} W</div>
                </div>
              )}
              <div className="rounded-lg bg-slate-50 p-2.5">
                <div className="text-xs text-slate-500">发布年份</div>
                <div className="mt-0.5 text-sm font-medium text-slate-800">{year || '暂无数据'}</div>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              示意图为通用笔记本外观示意，非实物照片；具体配置以厂商官方为准。
            </p>
          </div>
        </div>

        {/* 右列 */}
        <div className="flex min-w-0 flex-col gap-5">
          {/* 基本规格表 */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
              基本规格
            </div>
            <dl className="divide-y divide-slate-100">
              {specs.map(([label, value, highlight]) => (
                <div
                  key={label}
                  className={`grid grid-cols-[8.5rem_1fr] gap-4 px-4 py-2.5 text-sm ${
                    highlight ? 'bg-slate-50/80' : ''
                  }`}
                >
                  <dt className={`${highlight ? 'font-bold ' + brandColor : 'text-slate-500'}`}>{label}</dt>
                  <dd className={`${highlight ? 'font-bold ' + brandColor : 'text-slate-800'}`}>{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* 处理器方案 */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
              处理器方案（共 {allCpuOptions.length} 种）<span className="ml-2 text-xs font-normal text-slate-400">点击可查看芯片详情</span>
            </div>
            <div className="p-4">
              {/* Intel 方案 */}
              {intelCpus.length > 0 && (
                <div className="mb-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">Intel</span>
                    <span className="text-xs text-slate-400">{intelCpus.length} 种方案</span>
                  </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {intelCpus.map((cpu, i) => {
                  const chipInfo = matchCpu(cpu, 'mobile');
                  const isAdd = additions.cpus.some((c) => c.toLowerCase() === cpu.toLowerCase());
                  const inner = (
                    <>
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{cpu}</span>
                      {isAdd && (
                        <span className="shrink-0 rounded bg-blue-600/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">补充</span>
                      )}
                      {chipInfo && (
                        <>
                          <span className="shrink-0 rounded bg-white/70 px-1.5 py-0.5 text-[10px] text-slate-500">
                            Die 长×宽 {dieDimsSummary(chipInfo)}
                          </span>
                          <span className="shrink-0 text-xs text-blue-500" aria-hidden>↗</span>
                        </>
                      )}
                    </>
                  );
                  return chipInfo ? (
                    <Link
                      key={i}
                      to={`/chip/${chipInfo.id}`}
                      title={`查看 ${chipInfo.model} 芯片详情`}
                      className="rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 transition hover:border-blue-400 hover:bg-blue-100/60 hover:shadow-md"
                    >
                      <div className="flex items-center gap-2">{inner}</div>
                    </Link>
                  ) : (
                    <div key={i} className="rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2">
                      <div className="flex items-center gap-2">{inner}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* AMD 方案 */}
          {amdCpus.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">AMD</span>
                <span className="text-xs text-slate-400">{amdCpus.length} 种方案</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {amdCpus.map((cpu, i) => {
                  const chipInfo = matchCpu(cpu, 'mobile');
                  const isAdd = additions.cpus.some((c) => c.toLowerCase() === cpu.toLowerCase());
                  const inner = (
                    <>
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{cpu}</span>
                      {isAdd && (
                        <span className="shrink-0 rounded bg-red-600/10 px-1.5 py-0.5 text-[10px] font-medium text-red-600">补充</span>
                      )}
                      {chipInfo && (
                        <>
                          <span className="shrink-0 rounded bg-white/70 px-1.5 py-0.5 text-[10px] text-slate-500">
                            Die 长×宽 {dieDimsSummary(chipInfo)}
                          </span>
                          <span className="shrink-0 text-xs text-red-500" aria-hidden>↗</span>
                        </>
                      )}
                    </>
                  );
                  return chipInfo ? (
                    <Link
                      key={i}
                      to={`/chip/${chipInfo.id}`}
                      title={`查看 ${chipInfo.model} 芯片详情`}
                      className="rounded-lg border border-red-100 bg-red-50/50 px-3 py-2 transition hover:border-red-400 hover:bg-red-100/60 hover:shadow-md"
                    >
                      <div className="flex items-center gap-2">{inner}</div>
                    </Link>
                  ) : (
                    <div key={i} className="rounded-lg border border-red-100 bg-red-50/50 px-3 py-2">
                      <div className="flex items-center gap-2">{inner}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 显卡方案 */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
          显卡方案（共 {allGpuOptions.length} 种）
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {allGpuOptions.map((gpu, i) => {
              const power = parsePower(gpu);
              const chipInfo = matchGpu(gpu, 'mobile');
              const isAdd = additions.gpus.some((g) => g.toLowerCase() === gpu.toLowerCase());
              const inner = (
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{gpu}</span>
                  {isAdd && (
                    <span className="shrink-0 rounded bg-green-600/10 px-1.5 py-0.5 text-[10px] font-medium text-green-700">补充</span>
                  )}
                  {power && (
                    <span className="shrink-0 rounded-full bg-green-600/10 px-2 py-0.5 text-xs font-medium text-green-700">
                      {power}
                    </span>
                  )}
                  {chipInfo && (
                    <>
                      <span className="shrink-0 rounded bg-white/70 px-1.5 py-0.5 text-[10px] text-slate-500">
                        Die 长×宽 {dieDimsSummary(chipInfo)}
                      </span>
                      <span className="shrink-0 text-xs text-green-500" aria-hidden>↗</span>
                    </>
                  )}
                </div>
              );
              return chipInfo ? (
                <Link
                  key={i}
                  to={`/chip/${chipInfo.id}`}
                  title={`查看 ${chipInfo.model} 芯片详情`}
                  className="rounded-lg border border-green-100 bg-green-50/50 px-3 py-2 transition hover:border-green-400 hover:bg-green-100/60 hover:shadow-md"
                >
                  {inner}
                </Link>
              ) : (
                <div key={i} className="rounded-lg border border-green-100 bg-green-50/50 px-3 py-2">
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      </div>
        </div>
      </div>

      {/* 烤机测试（v3 历史实测数据恢复；按型号匹配，部分机型无数据） */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
          烤机测试数据
        </div>
        {stress ? (
          <>
            <div className="grid divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="p-4">
                <div className="mb-2 text-xs font-medium text-slate-500">单烤 CPU</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">功耗</span><span className="text-slate-800">{stress.cpuPowerW != null ? `${stress.cpuPowerW} W` : '暂无'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">温度</span><span className="text-slate-800">{stress.cpuTempC != null ? `${stress.cpuTempC} °C` : '暂无'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">频率</span><span className="text-slate-800">{stress.cpuFreqGHz != null ? `${stress.cpuFreqGHz} GHz` : '暂无'}</span></div>
                </div>
              </div>
              <div className="p-4">
                <div className="mb-2 text-xs font-medium text-slate-500">单烤 GPU</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">功耗</span><span className="text-slate-800">{stress.gpuPowerW != null ? `${stress.gpuPowerW} W` : '暂无'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">温度</span><span className="text-slate-800">{stress.gpuTempC != null ? `${stress.gpuTempC} °C` : '暂无'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">频率</span><span className="text-slate-800">{stress.gpuFreqMHz != null ? `${stress.gpuFreqMHz} MHz` : '暂无'}</span></div>
                </div>
              </div>
              <div className="p-4">
                <div className="mb-2 text-xs font-medium text-slate-500">双烤</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">CPU 功耗</span><span className="text-slate-800">{stress.dualCpuPowerW != null ? `${stress.dualCpuPowerW} W` : '暂无'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">GPU 功耗</span><span className="text-slate-800">{stress.dualGpuPowerW != null ? `${stress.dualGpuPowerW} W` : '暂无'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">CPU 温度</span><span className="text-slate-800">{stress.dualCpuTempC != null ? `${stress.dualCpuTempC} °C` : '暂无'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">GPU 温度</span><span className="text-slate-800">{stress.dualGpuTempC != null ? `${stress.dualGpuTempC} °C` : '暂无'}</span></div>
                </div>
              </div>
            </div>
            {stress.note && (
              <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">{stress.note}</div>
            )}
          </>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-slate-400">
            暂无该机型的第三方烤机实测数据（数据来源：笔吧评测室等评测，当前已收录 92 款热门机型的单烤/双烤数据）
          </p>
        )}
      </div>

      {/* 提交缺失的处理器/显卡方案 */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
          ➕ 补充缺失的处理器 / 显卡方案
        </div>
        <div className="p-4">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="flex shrink-0 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setChipType('cpu')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  chipType === 'cpu' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white'
                }`}
              >
                处理器 CPU
              </button>
              <button
                type="button"
                onClick={() => setChipType('gpu')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  chipType === 'gpu' ? 'bg-green-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white'
                }`}
              >
                显卡 GPU
              </button>
            </div>
            <input
              value={chipInput}
              onChange={(e) => setChipInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmitChip();
              }}
              placeholder={chipType === 'cpu' ? '如 i9-14900HX、R9 7945HX' : '如 RTX 5060 (140W)、RTX 4080 Laptop'}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="button"
              onClick={handleSubmitChip}
              disabled={submitting}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
                chipType === 'cpu' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {submitting ? '提交中…' : '提交并收录'}
            </button>
          </div>
          {chipMsg && (
            <div
              className={`mt-2.5 rounded-lg border px-3 py-2 text-xs leading-5 ${
                chipMsg.kind === 'ok'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : chipMsg.kind === 'info'
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-red-200 bg-red-50 text-red-600'
              }`}
            >
              {chipMsg.kind === 'ok' ? '✅' : chipMsg.kind === 'info' ? '🔄' : '⚠️'} {chipMsg.text}
            </div>
          )}
          <p className="mt-2 text-[11px] leading-5 text-slate-400">
            若站内芯片库已有该型号，将直接加入本机方案（可点击查看芯片详情）；若没有，将自动触发 AI 补录并在芯片列表显示 NEW。补充数据保存在本机，站长核对后可并入正式库。
          </p>
        </div>
      </div>

      {/* 同品牌相关机型 */}
      {related.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
            同品牌其他机型（{LAPTOP_BRAND_LABELS[laptop.brand]}）
          </div>
          <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.id}
                to={`/laptop/${r.id}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm transition hover:border-blue-300 hover:bg-blue-50"
              >
                <span className="min-w-0 truncate font-medium text-slate-700">
                  {r.displayName}
                  {r.release && !r.displayName.includes(r.release.slice(0, 4)) ? ` ${r.release.slice(0, 4)}款` : ''}
                </span>
                <span className="shrink-0 text-xs text-slate-400">{r.model}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 来源 */}
      {laptop.sources.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 text-sm font-semibold text-slate-700">数据来源 / 购买参考</div>
          <ul className="space-y-1 text-sm">
            {laptop.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  {s.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
