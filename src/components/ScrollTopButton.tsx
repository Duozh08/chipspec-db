import { useEffect, useState } from 'react';

/** 滚轮下移阈值（px）——行业通用标准，通常为 400px 或一屏高度 */
const SHOW_THRESHOLD = 400;

/**
 * 回到顶部按钮：页面滚动超过阈值后固定在右下角显示，
 * 点击平滑滚动回顶部。
 */
export default function ScrollTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_THRESHOLD);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-700 active:bg-blue-800"
      title="回到顶部"
      aria-label="回到顶部"
    >
      <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10.5l5-5 5 5" />
      </svg>
    </button>
  );
}
