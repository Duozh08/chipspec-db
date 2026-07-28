import { useEffect } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import BrowsePage from './pages/BrowsePage';
import DetailPage from './pages/DetailPage';
import ComparePage from './pages/ComparePage';
import LaptopListPage from './pages/LaptopListPage';
import LaptopDetailPage from './pages/LaptopDetailPage';
import CompareTray from './components/CompareTray';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <div className="min-h-screen">
      <ScrollToTop />
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-baseline gap-2">
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
              浏览芯片
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
              to="/compare"
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`
              }
            >
              对比
            </NavLink>
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
