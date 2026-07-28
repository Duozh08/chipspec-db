import { Link } from 'react-router-dom';
import { allChips } from '../data';
import { allLaptops } from '../data/laptops';

const desktopChips = allChips.filter((c) => c.formFactor === 'desktop');
const mobileChips = allChips.filter((c) => c.formFactor === 'mobile');

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 text-white shadow-lg sm:p-12">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">ChipSpec DB</h1>
        <p className="mt-3 max-w-2xl text-base text-blue-100 sm:text-lg">
          芯片规格数据库 — 收录 Intel、AMD、NVIDIA 消费级处理器与显卡的封装尺寸、芯片本体（Die）尺寸、TDP 功耗等详细规格，以及主流品牌游戏本配置参数查询。
        </p>
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">
            📊 {allChips.length} 颗芯片
          </span>
          <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">
            🖥️ {desktopChips.length} 桌面端
          </span>
          <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">
            💻 {mobileChips.length} 移动端
          </span>
          <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">
            🎮 {allLaptops.length} 款游戏本
          </span>
        </div>
      </div>

      {/* Quick Nav */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/browse"
          className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
        >
          <div className="mb-3 text-3xl">🖥️</div>
          <h3 className="font-semibold text-slate-800 group-hover:text-blue-600">桌面芯片</h3>
          <p className="mt-1 text-sm text-slate-500">
            Intel / AMD / NVIDIA 桌面处理器与显卡规格
          </p>
          <span className="mt-2 inline-block text-xs text-blue-500 opacity-0 transition group-hover:opacity-100">
            浏览 {desktopChips.length} 颗 →
          </span>
        </Link>

        <Link
          to="/browse?ff=mobile"
          className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
        >
          <div className="mb-3 text-3xl">💻</div>
          <h3 className="font-semibold text-slate-800 group-hover:text-blue-600">移动端芯片</h3>
          <p className="mt-1 text-sm text-slate-500">
            笔记本处理器 / 移动显卡规格
          </p>
          <span className="mt-2 inline-block text-xs text-blue-500 opacity-0 transition group-hover:opacity-100">
            浏览 {mobileChips.length} 颗 →
          </span>
        </Link>

        <Link
          to="/laptops"
          className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
        >
          <div className="mb-3 text-3xl">🎮</div>
          <h3 className="font-semibold text-slate-800 group-hover:text-blue-600">游戏本配置</h3>
          <p className="mt-1 text-sm text-slate-500">
            联想 / 华硕 / 惠普 / 外星人 等主流游戏本
          </p>
          <span className="mt-2 inline-block text-xs text-blue-500 opacity-0 transition group-hover:opacity-100">
            浏览 {allLaptops.length} 款 →
          </span>
        </Link>
      </div>

      {/* Featured — 热门速览 */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-slate-800">🔥 热门速览</h2>

        {/* 桌面芯片 */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-500">桌面芯片</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              'intel-core-i9-14900k',
              'amd-ryzen-9-9950x',
              'nvidia-geforce-rtx-4090',
              'amd-radeon-rx-7800-xt',
              'intel-core-i7-13700k',
              'nvidia-geforce-rtx-4070',
            ].map((id) => {
              const chip = allChips.find((c) => c.id === id);
              if (!chip) return null;
              return (
                <Link
                  key={chip.id}
                  to={`/chip/${chip.id}`}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition hover:border-blue-300 hover:shadow"
                >
                  <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-medium text-white">
                    {chip.brand.toUpperCase()}
                  </span>
                  <span className="flex-1 font-medium text-slate-700">{chip.model}</span>
                  <span className="text-xs text-slate-400">{chip.category === 'cpu' ? 'CPU' : 'GPU'}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 移动端芯片 */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-500">移动端芯片</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              'intel-core-i9-14900hx',
              'amd-ryzen-9-7945hx',
              'nvidia-geforce-rtx-4090-laptop',
              'nvidia-geforce-rtx-4070-laptop',
            ].map((id) => {
              const chip = allChips.find((c) => c.id === id);
              if (!chip) return null;
              return (
                <Link
                  key={chip.id}
                  to={`/chip/${chip.id}`}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition hover:border-blue-300 hover:shadow"
                >
                  <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-medium text-white">
                    {chip.brand.toUpperCase()}
                  </span>
                  <span className="flex-1 font-medium text-slate-700">{chip.model}</span>
                  <span className="text-xs text-slate-400">{chip.category === 'cpu' ? 'CPU' : 'GPU'}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 游戏本 */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-500">游戏本</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {allLaptops.slice(0, 6).map((laptop) => (
              <Link
                key={laptop.id}
                to={`/laptop/${laptop.id}`}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition hover:border-blue-300 hover:shadow"
              >
                <span className="rounded-md bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                  {laptop.brand === 'lenovo' ? 'LENOVO' : laptop.brand === 'asus' ? 'ASUS' : laptop.brand === 'hp' ? 'HP' : laptop.brand === 'alienware' ? 'ALIENWARE' : laptop.brand === 'acer' ? 'ACER' : laptop.brand === 'msi' ? 'MSI' : 'RAZER'}
                </span>
                <span className="flex-1 font-medium text-slate-700">{laptop.series}</span>
                <span className="text-xs text-slate-400">{laptop.model}</span>
              </Link>
            ))}
          </div>
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
