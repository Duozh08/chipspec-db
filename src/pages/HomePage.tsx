import { Link } from 'react-router-dom';
import { allChips } from '../data';
import type { Chip } from '../data/types';
import { allLaptops } from '../data/laptops';
import { LAPTOP_BRAND_LABELS } from '../data/types';

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
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 text-white shadow-lg sm:p-12">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">ChipSpec DB</h1>
            <p className="mt-3 max-w-2xl text-base text-blue-100 sm:text-lg">
              芯片规格数据库 — 收录 Intel、AMD、NVIDIA 消费级处理器与显卡的封装尺寸、芯片本体（Die）尺寸、TDP 功耗等详细规格，主流品牌游戏本配置参数查询，以及维修经验交流社区。
            </p>
          </div>

          {/* 必应中文搜索 */}
          <form
            action="https://cn.bing.com/search"
            method="get"
            target="_blank"
            rel="noreferrer"
            className="w-full max-w-sm shrink-0 rounded-2xl bg-white/10 p-3.5 shadow-inner backdrop-blur"
          >
            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-100">
              <span className="text-sm">🔍</span> 必应中文搜索
            </div>
            <div className="mt-2 flex overflow-hidden rounded-lg bg-white shadow-sm">
              <input
                name="q"
                type="search"
                placeholder="搜索芯片 / 技术资料 / 行业资讯…"
                className="min-w-0 flex-1 px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="shrink-0 bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-600 active:bg-sky-700"
              >
                搜索
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-blue-200/70">在新窗口打开 cn.bing.com 搜索结果</p>
          </form>
        </div>
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">
            📊 {allChips.length} 颗芯片
          </span>
          <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">
            🎮 {allLaptops.length} 款游戏本
          </span>
          <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">
            🔧 维修社区
          </span>
        </div>
      </div>

      {/* 三大模块 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* 行业小知识 */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">💡 芯片小知识</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: '🧩',
              title: '什么是 Die（裸片）？',
              text: 'Die 是从晶圆上切割出的单个芯片单元，是 CPU/GPU 真正执行计算的核心。同一代产品中 Die 尺寸越小，单片晶圆可切出的芯片越多，成本越低；Die 面积与制程工艺共同决定晶体管集成度。',
            },
            {
              icon: '📦',
              title: '什么是封装？',
              text: '封装将脆弱的 Die 固定在基板上，引出引脚或焊球与主板连接，并通过顶盖保护。封装尺寸通常远大于 Die，也是散热器和主板扣具的安装基准。LGA 是触点、BGA 是焊球。',
            },
            {
              icon: '🌡️',
              title: '什么是 TDP？',
              text: 'TDP（热设计功耗）指散热系统需要处理的热量上限，而非实际峰值功耗。笔记本 CPU/GPU 的"满血功耗"与散热模具密切相关，同一颗芯片在不同机型上功耗表现差异很大。',
            },
          ].map((k) => (
            <div key={k.title} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <div className="text-2xl">{k.icon}</div>
              <h3 className="mt-2 text-sm font-semibold text-slate-800">{k.title}</h3>
              <p className="mt-1.5 text-xs leading-5 text-slate-500">{k.text}</p>
            </div>
          ))}
        </div>
      </div>

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
