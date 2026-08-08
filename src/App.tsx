import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import BrowsePage from './pages/BrowsePage';
import DetailPage from './pages/DetailPage';
import ComparePage from './pages/ComparePage';
import LaptopListPage from './pages/LaptopListPage';
import LaptopDetailPage from './pages/LaptopDetailPage';
import RepairPage from './pages/RepairPage';
import CompareTray from './components/CompareTray';
import { useRecognize } from './context/RecognizeContext';
import { loadPendingItems } from './utils/pendingStore';
import { useCollectSync } from './hooks/useCollectSync';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const { open: openRecognize, openPending } = useRecognize();
  const [pendingCount, setPendingCount] = useState(loadPendingItems().length);
  const [filledCount, setFilledCount] = useState(0);
  // 轮询后端补全状态（已补全的从"待收录"中移出，展示为绿色已补全）
  const sync = useCollectSync(5000);

  // 待收录清单变化时更新右上角徽标
  useEffect(() => {
    const update = () => setPendingCount(loadPendingItems().length);
    update();
    window.addEventListener('chipspec-pending-updated', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('chipspec-pending-updated', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  // 轮询返回后：统计已补全数量，并让待收录数量实时反映
  useEffect(() => {
    if (sync.syncedAt === null) return;
    const items = loadPendingItems();
    const filled = items.filter((p) => p.status === 'filled').length;
    setFilledCount(filled);
    setPendingCount(items.length - filled);
  }, [sync.syncedAt, sync.filledCount]);

  return (
    <div className="min-h-screen">
      <ScrollToTop />
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-slate-900">芯片规格数据库</span>
            <span className="hidden text-xs text-slate-400 sm:inline">ChipSpec DB</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`
              }
            >
              首页
            </NavLink>
            <NavLink
              to="/browse"
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`
              }
            >
              芯片
            </NavLink>
            <NavLink
              to="/laptops"
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`
              }
            >
              游戏本
            </NavLink>
            <NavLink
              to="/repair"
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`
              }
            >
              维修
            </NavLink>
            <button
              type="button"
              onClick={openRecognize}
              className="rounded-lg px-3 py-1.5 text-slate-600 transition hover:bg-slate-100"
            >
              识别
            </button>
            {/* 已补全提示（右上角，绿色） */}
            {filledCount > 0 && (
              <button
                type="button"
                onClick={openPending}
                title="已补全的收录条目，点击查看明细"
                className="ml-1 flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600"
              >
                ✓ 已补全 {filledCount}
              </button>
            )}
            {/* 待收录提示（右上角） */}
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={openPending}
                title="有待收录的型号，点击查看明细"
                className="relative ml-1 flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-red-600"
              >
                <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                </span>
                待收录 {pendingCount}
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 pb-28">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/chip/:id" element={<DetailPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/laptops" element={<LaptopListPage />} />
          <Route path="/laptop/:id" element={<LaptopDetailPage />} />
          <Route path="/repair" element={<RepairPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>

      <footer className="border-t border-slate-200 py-5 text-center text-xs leading-5 text-slate-400">
        数据整理自 TechPowerUp GPU Database / WikiChip / 厂商官方规格页等公开来源，仅供学习参考；
        示意图为按比例绘制的示意图，非实物照片。
      </footer>

      <CompareTray />
    </div>
  );
}
