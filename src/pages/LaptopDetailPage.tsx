import { Link, useNavigate, useParams } from 'react-router-dom';
import { getLaptopById } from '../data/laptops';
import { LAPTOP_BRAND_LABELS } from '../data/types';

export default function LaptopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const laptop = id ? getLaptopById(id) : undefined;
  const navigate = useNavigate();

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

  const specs: [string, string][] = [
    ['品牌', LAPTOP_BRAND_LABELS[laptop.brand]],
    ['系列', laptop.series],
    ['中文名称', laptop.displayName ?? '—'],
    ['型号', laptop.model],
    ['发布时间', laptop.release ?? '暂无数据'],
    ['处理器', laptop.cpu],
    ['显卡', laptop.gpu],
    ['内存', laptop.ram],
    ['硬盘', laptop.storage],
    ['屏幕', laptop.display],
    ['重量', laptop.weightKg != null ? `${laptop.weightKg} kg` : '暂无数据'],
    ['参考售价', laptop.priceCny != null ? `¥${laptop.priceCny.toLocaleString()}` : '暂无数据'],
  ];

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
          {laptop.displayName || laptop.series}
          {laptop.release ? ` ${laptop.release.slice(0, 4)}款` : ''}
        </h1>
        <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-medium text-white">
          {LAPTOP_BRAND_LABELS[laptop.brand]}
        </span>
        <span className="rounded-full border border-slate-300 px-2.5 py-0.5 text-xs text-slate-600">
          {laptop.model}
        </span>
        {laptop.priceCny && (
          <span className="ml-auto text-lg font-semibold text-slate-800">
            ¥{laptop.priceCny.toLocaleString()}
          </span>
        )}
      </div>

      {/* 规格表 */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
          配置参数
        </div>
        <dl className="divide-y divide-slate-100">
          {specs.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[8.5rem_1fr] gap-4 px-4 py-2.5 text-sm">
              <dt className="text-slate-500">{label}</dt>
              <dd className="text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* 烤机测试 */}
      {laptop.stressTest && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
            烤机测试数据
          </div>
          <div className="grid divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {/* 单烤 CPU */}
            <div className="p-4">
              <div className="mb-2 text-xs font-medium text-slate-500">单烤 CPU</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">功耗</span>
                  <span className="text-slate-800">{laptop.stressTest.cpuPowerW != null ? `${laptop.stressTest.cpuPowerW} W` : '暂无'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">温度</span>
                  <span className="text-slate-800">{laptop.stressTest.cpuTempC != null ? `${laptop.stressTest.cpuTempC} °C` : '暂无'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">频率</span>
                  <span className="text-slate-800">{laptop.stressTest.cpuFreqGHz != null ? `${laptop.stressTest.cpuFreqGHz} GHz` : '暂无'}</span>
                </div>
              </div>
            </div>
            {/* 单烤 GPU */}
            <div className="p-4">
              <div className="mb-2 text-xs font-medium text-slate-500">单烤 GPU</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">功耗</span>
                  <span className="text-slate-800">{laptop.stressTest.gpuPowerW != null ? `${laptop.stressTest.gpuPowerW} W` : '暂无'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">温度</span>
                  <span className="text-slate-800">{laptop.stressTest.gpuTempC != null ? `${laptop.stressTest.gpuTempC} °C` : '暂无'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">频率</span>
                  <span className="text-slate-800">{laptop.stressTest.gpuFreqMHz != null ? `${laptop.stressTest.gpuFreqMHz} MHz` : '暂无'}</span>
                </div>
              </div>
            </div>
            {/* 双烤 */}
            <div className="p-4">
              <div className="mb-2 text-xs font-medium text-slate-500">双烤</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">CPU 功耗</span>
                  <span className="text-slate-800">{laptop.stressTest.dualCpuPowerW != null ? `${laptop.stressTest.dualCpuPowerW} W` : '暂无'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">GPU 功耗</span>
                  <span className="text-slate-800">{laptop.stressTest.dualGpuPowerW != null ? `${laptop.stressTest.dualGpuPowerW} W` : '暂无'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">CPU 温度</span>
                  <span className="text-slate-800">{laptop.stressTest.dualCpuTempC != null ? `${laptop.stressTest.dualCpuTempC} °C` : '暂无'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">GPU 温度</span>
                  <span className="text-slate-800">{laptop.stressTest.dualGpuTempC != null ? `${laptop.stressTest.dualGpuTempC} °C` : '暂无'}</span>
                </div>
              </div>
            </div>
          </div>
          {laptop.stressTest.note && (
            <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
              {laptop.stressTest.note}
            </div>
          )}
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
