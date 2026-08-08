import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { allChips } from '../data';
import type { Chip } from '../data/types';
import { allLaptops } from '../data/laptops';
import { LAPTOP_BRAND_LABELS } from '../data/types';
import NewsTicker from '../components/NewsTicker';

/** 芯片小知识条目 */
interface KnowledgeItem {
  icon: string;
  title: string;
  /** 卡片摘要 */
  text: string;
  /** 弹框详细段落 */
  detail: string[];
}

const KNOWLEDGE_ITEMS: KnowledgeItem[] = [
  {
    icon: '🧩',
    title: '什么是 Die（裸片）？',
    text: 'Die 是从晶圆上切割出的单个芯片单元，是 CPU/GPU 真正执行计算的核心。',
    detail: [
      'Die（裸片）是从硅晶圆上切割下来的单个芯片单元，上面蚀刻着晶体管电路，是 CPU / GPU 真正执行计算的核心区域。',
      '同一代产品中，Die 尺寸越小 → 单片晶圆能切出的芯片越多 → 单位成本越低；但尺寸过小会导致散热面积不足。',
      'Die 面积 × 制程工艺密度 = 晶体管集成度。例如 AMD 锐龙 9 9950X 的 CCD Die 面积约 71mm²，集成约 83 亿晶体管。',
      '多 Die 设计（如 Intel Arrow Lake、AMD Chiplet）把计算核心、I/O、核显拆成多颗 Die，用高级封装互连，可提升良率并灵活组合。',
    ],
  },
  {
    icon: '📦',
    title: '什么是封装？',
    text: '封装把脆弱的 Die 固定在基板上，引出引脚与主板连接，并用顶盖保护。',
    detail: [
      '封装（Package）将脆弱的 Die 固定在基板上，把 Die 上密集的触点引到更容易焊接的引脚 / 焊球，并通过金属顶盖保护内部。',
      '常见形式：LGA（Land Grid Array，主板针脚，如 Intel 桌面）、PGA（CPU 带针，旧 AMD 桌面）、BGA（焊球直接焊在主板上，笔记本/显卡）。',
      '封装尺寸通常是散热器和主板扣具的安装基准，与 Die 尺寸没有必然关系——同一颗 Die 可以有不同封装。',
      '笔记本 CPU/GPU 普遍使用 BGA，无法单独更换 CPU，这也是"板载 CPU 坏只能换主板"的原因。',
    ],
  },
  {
    icon: '🌡️',
    title: '什么是 TDP？',
    text: 'TDP（热设计功耗）指散热系统需要处理的热量上限，而非实际峰值功耗。',
    detail: [
      'TDP（Thermal Design Power，热设计功耗）指散热系统需要能带走的热量上限，通常以瓦（W）计，但它并不等于芯片实际功耗。',
      '实际功耗受"功耗墙（Power Limit）"控制：PL1 为持续功耗、PL2 为短时峰值功耗，厂商可自由设定。',
      '笔记本领域常说的"满血功耗"（如 RTX 4060 140W）指散热模具能支撑的最大功耗释放；同一颗 GPU 在不同机型上可跑出 90W~140W 的差异。',
      '选游戏本时，同配置下"功耗释放更高"的机型通常性能更强，代价是噪音和发热更大。',
    ],
  },
  {
    icon: '🏷️',
    title: 'Intel Core 命名规则',
    text: 'i9-14900K 逐段解读：品牌 + 等级 + 代次 + 型号 + 后缀。',
    detail: [
      '以 i9-14900K 为例：',
      '· i9 —— 产品等级：i3 入门 / i5 主流 / i7 高端 / i9 旗舰',
      '· 14 —— 代次：第 14 代酷睿（数字越大越新，13→第13代，15→第15代等）',
      '· 900 —— 型号位：数字越大规格越高（如 900 > 700 > 500）',
      '· K —— 后缀：K=可超频（解锁倍频）；F=无核显；KF=可超频无核显；T=低功耗版；S=标准版；无后缀=锁频',
      '移动端后缀：HX=顶级可超频移动、H=高性能（45W）、P=主流性能（28W）、U=低功耗（15W）、G=带核显（如 i7-1165G7）。',
      '酷睿 Ultra 系列（如 Core Ultra 9 285H）：Ultra 为新一代旗舰品牌，9=等级，285=型号，H=移动高性能。',
    ],
  },
  {
    icon: '🏷️',
    title: 'AMD Ryzen 命名规则',
    text: 'Ryzen 9 9950X3D 逐段解读：品牌 + 等级 + 代次 + 型号 + 后缀。',
    detail: [
      '以 Ryzen 9 9950X3D 为例：',
      '· Ryzen —— 品牌（锐龙）',
      '· 9 —— 等级：3 / 5 / 7 / 9（对应入门到旗舰，同 Intel i3/i5/i7/i9）',
      '· 9 —— 代次：第 9 代锐龙（9000 系对应第 9 代，8000 系第 8 代…）',
      '· 50 —— 型号位：数字越大规格越高（9950 > 9900 > 9700 > 9600）',
      '· X3D —— 后缀：X3D=3D V-Cache 大缓存（游戏神 U）；X=高性能加强版；G=带核显（如 8600G）；无后缀=标准版',
      '移动端：HX=旗舰高性能、HS=高性能低功耗、H=高性能、U=低功耗、Z1/Z2=掌机定制（如 Z1 Extreme）。',
      'AMD 桌面还分 AM4/AM5 平台（插槽代际），同代 CPU 需匹配对应主板芯片组（如 B650/X670 支持 AM5）。',
    ],
  },
  {
    icon: '🎮',
    title: 'NVIDIA RTX 命名规则',
    text: 'RTX 4090 逐段解读：前缀 + 代次 + 档位 + 后缀。',
    detail: [
      '以 GeForce RTX 4090 为例：',
      '· RTX —— 系列前缀（支持光线追踪；GTX 为无光追老系列）',
      '· 4 —— 代次：RTX 40 系（30 系、50 系依此类推，数字越大越新）',
      '· 90 —— 档位：50=入门 / 60=主流 / 70=高端 / 80=次旗舰 / 90=旗舰（Titan 已并入 90 档）',
      '· 后缀：Ti=增强版（如 4080 Ti）、Super=中期升级版（如 4070 Super）、无后缀=标准版',
      '移动版（Laptop）：编号相同但功耗受模具限制，如 RTX 4090 Laptop 实为桌面 RTX 4080 同款 AD103 Die；140W 以上才叫"满血"。',
      'AMD 对位：RX 7900 XTX / RX 7600M XT —— RX=系列，7=第 7 代（对应 7000 系），90=档位，M=移动端，XT=增强版。',
    ],
  },
  {
    icon: '💻',
    title: '移动端 CPU 后缀速查',
    text: 'HX / H / HS / U / P：笔记本处理器功耗档位一目了然。',
    detail: [
      '笔记本处理器后缀决定功耗与性能档位：',
      '· Intel：HX=顶级（55W+，可超频，游戏本旗舰）；H=高性能（45W，游戏本主流）；P=主流性能（28W，全能本）；U=低功耗（15W，轻薄本）；G=带锐炬核显',
      '· AMD：HX=旗舰高性能；HS=高性能低功耗（如 R9 8945HS）；H=高性能（45W）；U=低功耗（15-28W）；E=超低功耗（嵌入式）',
      '同一型号数字（如 i7-13650HX vs i7-13620H）后缀不同规格不同：HX 版本核心更多、频率更高。',
      '选本建议：轻薄办公选 U/P；创作全能选 H/HS；游戏发烧选 HX。',
    ],
  },
  {
    icon: '🔬',
    title: '制程工艺（nm）是什么',
    text: 'nm 越小晶体管越密，同面积性能越强、功耗越低。',
    detail: [
      '制程工艺（如 5nm、4nm、3nm）描述晶体管的最小特征尺寸，数字越小代表晶体管做得越小、越密集。',
      '更小制程 → 相同面积集成更多晶体管 → 性能更强；相同性能下功耗更低、发热更小。',
      '注意：各厂商的"nm"数字已不完全是物理尺寸，而是营销代际命名（如台积电 4N 实际是 5nm 级改良），对比时看晶体管密度更客观。',
      '当前主流：Intel 桌面 Arrow Lake 用台积电 N3B（3nm 级）、AMD Zen5 用台积电 4N、NVIDIA RTX 40/50 系用台积电 4N/4NP。',
    ],
  },
  {
    icon: '⚡',
    title: '满血功耗 / 功耗墙',
    text: '同一颗芯片在不同笔记本上功耗差异巨大，"满血"才是关键。',
    detail: [
      '功耗墙（Power Limit）是厂商设定的芯片功耗上限：PL1=持续功耗、PL2=短时峰值功耗，可在 BIOS / 控制中心调整。',
      '游戏本"满血"指散热模具能支撑显卡最高标称功耗（如 RTX 4060 满血 140W）；散热不足的机型只能跑 90-105W，性能缩水。',
      '双烤（CPU+GPU 同时满载）看的是整机散热能力，常见标称如"整机 200W 性能释放"。',
      '本站游戏本详情页的"烤机测试数据"即实测功耗/温度，可用来判断机型散热水平。',
    ],
  },
];

/** 知识弹框 */
function KnowledgeModal({ item, onClose }: { item: KnowledgeItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{item.icon}</span>
            <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" aria-label="关闭">
            <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-5 py-4">
          {item.detail.map((p, i) => (
            <p key={i} className="text-sm leading-6 text-slate-700">{p}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

// 热门芯片推荐（桌面 + 移动）
const FEATURED_CHIPS = [
  'intel-core-i9-14900k',
  'amd-ryzen-9-9950x',
  'nvidia-geforce-rtx-4090',
  'amd-radeon-rx-7800-xt',
  'core-i9-14900hx',
  'ryzen-ai-9-hx-370',
  'nvidia-geforce-rtx-4090-laptop',
  'ryzen-9-9955hx',
];

// 热门游戏本推荐
const FEATURED_LAPTOPS = [
  'lenovo-y9000p-16irx9',
  'lenovo-y7000p-16irx9',
  'asus-rog-8-g614j',
  'asus-rog-9-g615w',
  'hp-9-omen-16-wf0000',
  'dell-alienwarem18r2-m18-r2',
];

function ChipBadge({ chip }: { chip: Chip }) {
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-xs font-medium text-white ${
        chip.brand === 'intel' ? 'bg-blue-600' : chip.brand === 'amd' ? 'bg-red-600' : 'bg-lime-600'
      }`}
    >
      {chip.brand.toUpperCase()}
    </span>
  );
}

export default function HomePage() {
  const knowledgeRef = useRef<HTMLDivElement>(null);
  const [selectedKnowledge, setSelectedKnowledge] = useState<KnowledgeItem | null>(null);
  // 数据统计（全部来自站内数据，真实可靠）
  const desktopCount = allChips.filter((c) => c.formFactor === 'desktop').length;
  const mobileCount = allChips.filter((c) => c.formFactor === 'mobile').length;
  const cpuCount = allChips.filter((c) => c.category === 'cpu').length;
  const gpuCount = allChips.filter((c) => c.category === 'gpu').length;
  const generationCount = new Set(allChips.map((c) => c.generation)).size;

  const brandDist = (['intel', 'amd', 'nvidia'] as const).map((b) => ({
    brand: b,
    count: allChips.filter((c) => c.brand === b).length,
  }));
  const brandMax = Math.max(...brandDist.map((b) => b.count), 1);

  const laptopBrandCount = Object.keys(LAPTOP_BRAND_LABELS).length;
  const laptopSeriesCount = new Set(allLaptops.map((l) => l.series)).size;

  return (
    <div className="space-y-8">
      {/* Hero：深色科技风 */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-8 text-white shadow-2xl sm:p-12">
        {/* 背景层：深蓝渐变 + 网格 + 霓虹光晕 */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />
        <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-blue-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl" />

        <div className="relative">
          {/* 顶部状态标签（独立于左右布局，保证搜索框与标题水平对齐） */}
          <div className="flex items-center gap-2 text-[11px] font-medium tracking-wide text-blue-300/90">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            芯片规格数据库 · ChipSpec DB · 数据持续更新中
          </div>

          <div className="mt-6 flex flex-wrap items-start justify-between gap-8">
            <div className="min-w-0 max-w-2xl flex-1">
              <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl">
                芯片规格
                <span className="bg-gradient-to-r from-sky-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">
                  一查便知
                </span>
              </h1>
              <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
                Intel · AMD · NVIDIA 消费级处理器与显卡的
                <span className="font-semibold text-white">封装尺寸、Die 拓扑、TDP 功耗</span>
                ，主流品牌游戏本配置参数查询，截图识别秒匹配，维修经验社区。
              </p>
              {/* 特性标签 */}
              <div className="mt-5 flex flex-wrap gap-2">
                {['📐 封装 / Die 尺寸', '⚡ TDP 功耗', '🎮 345 款游戏本', '📷 截图识别'].map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 backdrop-blur"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* 必应中文搜索（纯白搜索框，与左侧标题垂直居中对齐） */}
            <form
              action="https://cn.bing.com/search"
              method="get"
              target="_blank"
              rel="noreferrer"
              className="w-full max-w-sm shrink-0 sm:mt-2.5"
            >
              <div className="flex overflow-hidden rounded-xl bg-white shadow-lg">
                <input
                  name="q"
                  type="search"
                  placeholder="搜索芯片 / 技术资料 / 行业资讯…"
                  className="min-w-0 flex-1 px-3.5 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  className="shrink-0 bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:from-sky-400 hover:to-blue-500 active:brightness-95"
                >
                  搜索
                </button>
              </div>
            </form>
          </div>

          {/* 数据统计（深色玻璃卡） */}
          <div className="mt-7 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 backdrop-blur transition hover:bg-white/10">
              <div className="text-lg font-bold leading-tight">{allChips.length}</div>
              <div className="mt-0.5 text-[11px] text-blue-200/70">颗芯片收录</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 backdrop-blur transition hover:bg-white/10">
              <div className="text-lg font-bold leading-tight">{allLaptops.length}</div>
              <div className="mt-0.5 text-[11px] text-blue-200/70">款游戏本配置</div>
            </div>
            <Link
              to="/repair"
              className="group rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-left backdrop-blur transition hover:bg-white/10"
            >
              <div className="text-lg font-bold leading-tight">🔧 维修社区</div>
              <div className="mt-0.5 text-[11px] text-blue-200/70 group-hover:text-white">经验交流与技术分享 →</div>
            </Link>
          </div>

          {/* 行业快讯轮播（云端 RSS 实时抓取，不可用时降级站内动态） */}
          <NewsTicker />
        </div>
      </div>

      {/* 自媒体平台（刘大师兄笔记本维修，与下方三大模块同列宽对齐） */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <a
          href="https://www.douyin.com/user/MS4wLjABAAAAXxwzsmWiioeygg3wmT0ZFQ_AIZh2SzCOOuLKs7Jsmo0?from_tab_name=main"
          target="_blank"
          rel="noreferrer"
          className="group flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-black" fill="currentColor" aria-label="抖音">
            <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-1.73-2.44V9.8a5.66 5.66 0 1 0 4.88 5.6V9.9a7.35 7.35 0 0 0 4.3 1.35V8.16a4.3 4.3 0 0 1-3.3-2.34z" />
          </svg>
          <span className="truncate text-sm font-medium text-slate-800 group-hover:text-blue-600">刘大师兄笔记本维修</span>
        </a>

        <a
          href="https://space.bilibili.com/486984223"
          target="_blank"
          rel="noreferrer"
          className="group flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-pink-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="B站">
            <rect x="3" y="7" width="18" height="13" rx="3" />
            <path d="M8 7l-3-4M16 7l3-4" />
            <path d="M9.5 13.5l5-3-5-3v6z" fill="currentColor" stroke="none" />
          </svg>
          <span className="truncate text-sm font-medium text-slate-800 group-hover:text-blue-600">刘大师兄笔记本维修</span>
        </a>

        {/* 视频号：预留位置 */}
        <div className="flex cursor-not-allowed items-center gap-2.5 rounded-xl border border-dashed border-slate-200 bg-white p-4 opacity-60">
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-emerald-500" fill="currentColor" aria-label="视频号">
            <path d="M6 3.5h12a2.5 2.5 0 0 1 2.5 2.5v12a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 18V6A2.5 2.5 0 0 1 6 3.5zm3.2 4.6v7.8a.8.8 0 0 0 1.22.68l6.3-3.9a.8.8 0 0 0 0-1.36l-6.3-3.9a.8.8 0 0 0-1.22.68z" />
          </svg>
          <span className="truncate text-sm font-medium text-slate-600">刘大师兄笔记本维修</span>
          <span className="ml-auto shrink-0 text-xs text-slate-400">敬请期待</span>
        </div>
      </div>

      {/* 三大模块 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/laptops"
          className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
        >
          <div className="mb-3 text-3xl">🎮</div>
          <h3 className="font-semibold text-slate-800 group-hover:text-blue-600">游戏本配置</h3>
          <p className="mt-1 text-sm text-slate-500">
            联想 / 华硕 / 惠普 / 戴尔 等主流品牌游戏本配置查询
          </p>
          <span className="mt-2 inline-block text-xs text-blue-500 opacity-0 transition group-hover:opacity-100">
            浏览 {allLaptops.length} 款 →
          </span>
        </Link>

        <Link
          to="/browse"
          className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
        >
          <div className="mb-3 text-3xl">📊</div>
          <h3 className="font-semibold text-slate-800 group-hover:text-blue-600">芯片规格</h3>
          <p className="mt-1 text-sm text-slate-500">
            Intel / AMD / NVIDIA 桌面端 & 移动端处理器与显卡规格
          </p>
          <span className="mt-2 inline-block text-xs text-blue-500 opacity-0 transition group-hover:opacity-100">
            浏览 {allChips.length} 颗 →
          </span>
        </Link>

        <Link
          to="/repair"
          className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
        >
          <div className="mb-3 text-3xl">🔧</div>
          <h3 className="font-semibold text-slate-800 group-hover:text-blue-600">维修社区</h3>
          <p className="mt-1 text-sm text-slate-500">
            芯片级维修经验分享、故障排查、技术交流
          </p>
          <span className="mt-2 inline-block text-xs text-blue-500 opacity-0 transition group-hover:opacity-100">
            进入社区 →
          </span>
        </Link>
      </div>

      {/* 数据概览 */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">📊 数据概览</h2>
          <span className="text-xs text-slate-400">数据实时统计自站内数据库</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: '芯片总数', value: allChips.length, sub: '颗' },
            { label: '桌面端芯片', value: desktopCount, sub: '颗' },
            { label: '移动端芯片', value: mobileCount, sub: '颗' },
            { label: '处理器 CPU', value: cpuCount, sub: '颗' },
            { label: '显卡 GPU', value: gpuCount, sub: '颗' },
            { label: '代际分组', value: generationCount, sub: '个' },
            { label: '游戏本', value: allLaptops.length, sub: '款' },
            { label: '游戏本品牌', value: laptopBrandCount, sub: '个' },
            { label: '游戏本系列', value: laptopSeriesCount, sub: '个' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg bg-slate-50 p-3 text-center">
              <div className="text-xl font-bold text-slate-800">
                {s.value}
                <span className="ml-0.5 text-xs font-normal text-slate-400">{s.sub}</span>
              </div>
              <div className="mt-0.5 text-xs text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* 品牌分布条 */}
        <div className="mt-4 space-y-2">
          {brandDist.map((b) => (
            <div key={b.brand} className="flex items-center gap-3 text-sm">
              <span
                className={`w-16 shrink-0 rounded px-1.5 py-0.5 text-center text-xs font-medium text-white ${
                  b.brand === 'intel' ? 'bg-blue-600' : b.brand === 'amd' ? 'bg-red-600' : 'bg-lime-600'
                }`}
              >
                {b.brand.toUpperCase()}
              </span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${
                    b.brand === 'intel' ? 'bg-blue-500' : b.brand === 'amd' ? 'bg-red-500' : 'bg-lime-500'
                  }`}
                  style={{ width: `${(b.count / brandMax) * 100}%` }}
                />
              </div>
              <span className="w-16 shrink-0 text-right text-xs text-slate-500">{b.count} 颗</span>
            </div>
          ))}
        </div>
      </div>

      {/* 热门速览 */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-slate-800">🔥 热门速览</h2>

        {/* 热门芯片 */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-500">热门芯片推荐</h3>
            <Link to="/browse" className="text-xs text-blue-500 hover:underline">
              查看全部 →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURED_CHIPS.map((id) => {
              const chip = allChips.find((c) => c.id === id);
              if (!chip) return null;
              return (
                <Link
                  key={chip.id}
                  to={`/chip/${chip.id}`}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm shadow-sm transition hover:border-blue-300 hover:shadow"
                >
                  <ChipBadge chip={chip} />
                  <span className="flex-1 truncate font-medium text-slate-700">{chip.model}</span>
                  <span className="shrink-0 text-[11px] text-slate-400">
                    {chip.formFactor === 'desktop' ? '桌面' : '移动'}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 热门游戏本 */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-500">热门游戏本推荐</h3>
            <Link to="/laptops" className="text-xs text-blue-500 hover:underline">
              查看全部 →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED_LAPTOPS.map((id) => {
              const laptop = allLaptops.find((l) => l.id === id);
              if (!laptop) return null;
              const year = laptop.release ? laptop.release.slice(0, 4) : '';
              return (
                <Link
                  key={laptop.id}
                  to={`/laptop/${laptop.id}`}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm shadow-sm transition hover:border-blue-300 hover:shadow"
                >
                  <span className="shrink-0 rounded-md bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                    {laptop.brand.toUpperCase()}
                  </span>
                  <span className="flex-1 truncate font-medium text-slate-700">
                    {laptop.displayName}
                    {year ? ` ${year}款` : ''}
                  </span>
                  <span className="shrink-0 text-[11px] text-slate-400">
                    {laptop.cpuOptions.length} CPU · {laptop.gpuOptions.length} GPU
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* 行业小知识（可左右滑动，点击卡片查看详情） */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">💡 芯片小知识</h2>
          <div className="flex items-center gap-1.5">
            <span className="mr-1 hidden text-xs text-slate-400 sm:inline">共 {KNOWLEDGE_ITEMS.length} 篇 · 点击卡片查看详情</span>
            <button
              type="button"
              onClick={() => knowledgeRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-blue-300 hover:text-blue-600"
              aria-label="向左滑动"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 3L5 8l5 5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => knowledgeRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-blue-300 hover:text-blue-600"
              aria-label="向右滑动"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3l5 5-5 5" />
              </svg>
            </button>
          </div>
        </div>
        <div ref={knowledgeRef} className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
          {KNOWLEDGE_ITEMS.map((k) => (
            <button
              key={k.title}
              type="button"
              onClick={() => setSelectedKnowledge(k)}
              className="group w-72 shrink-0 snap-start rounded-lg border border-slate-100 bg-slate-50 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/50 hover:shadow"
            >
              <div className="flex items-start justify-between">
                <span className="text-2xl">{k.icon}</span>
                <span className="text-xs text-slate-300 transition group-hover:text-blue-500">查看 →</span>
              </div>
              <h3 className="mt-2 text-sm font-semibold text-slate-800 group-hover:text-blue-600">{k.title}</h3>
              <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-slate-500">{k.text}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 知识详情弹框 */}
      {selectedKnowledge && (
        <KnowledgeModal item={selectedKnowledge} onClose={() => setSelectedKnowledge(null)} />
      )}

      {/* About */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
        <p>
          <strong className="text-slate-700">数据说明：</strong>
          芯片封装/Die 尺寸部分来自 TechPowerUp GPU Database、WikiChip、厂商官方规格页等公开来源，部分为第三方开盖实测值或估算值。标注"暂无数据"的字段表示暂无可靠公开来源。示意图为按比例绘制的 SVG 示意图，非实物照片。
        </p>
      </div>
    </div>
  );
}
