import { useEffect, useRef, useState } from 'react';
import { apiNews } from '../utils/apiClient';
import type { NewsItem } from '../utils/apiClient';

/** 轮播间隔（毫秒） */
const INTERVAL_MS = 5000;

/** 云端新闻不可用时的站内信息兜底（均为站内真实动态，不编造新闻） */
const STANDBY: NewsItem[] = [
  { title: '站内已收录 345 款主流品牌游戏本配置，支持截图识别快速查询', link: '#/laptops', source: '本站' },
  { title: 'Intel / AMD / NVIDIA 桌面与移动端芯片规格持续更新中', link: '#/browse', source: '本站' },
  { title: '截图识别支持粘贴图片自动匹配型号，识别引擎已大幅加速', link: '#/', source: '本站' },
  { title: '维修社区欢迎分享芯片级维修经验与故障案例', link: '#/repair', source: '本站' },
];

/** RFC 822 时间 → "MM-DD HH:mm"（解析失败返回空） */
function formatPubDate(pubDate?: string): string {
  if (!pubDate) return '';
  const d = new Date(pubDate);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 首页 Hero 卡片内的行业新闻轮播条（自动播放 / 悬停暂停 / 手动切换） */
export default function NewsTicker() {
  const [items, setItems] = useState<NewsItem[]>(STANDBY);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [source, setSource] = useState<'cloud' | 'standby'>('standby');
  const timerRef = useRef<number | null>(null);

  // 拉取云端新闻（失败保持站内兜底）
  useEffect(() => {
    let alive = true;
    apiNews()
      .then((list) => {
        if (alive && list.length > 0) {
          setItems(list);
          setIdx(0);
          setSource('cloud');
        }
      })
      .catch(() => {
        /* 保持兜底 */
      });
    return () => {
      alive = false;
    };
  }, []);

  // 自动轮播（悬停暂停）
  useEffect(() => {
    if (paused || items.length <= 1) return;
    timerRef.current = window.setInterval(() => {
      setIdx((i) => (i + 1) % items.length);
    }, INTERVAL_MS);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, [paused, items.length]);

  if (items.length === 0) return null;
  const current = items[idx];
  const time = formatPubDate(current.pubDate);

  return (
    <div
      className="mt-5 overflow-hidden rounded-xl bg-white/10 shadow-inner backdrop-blur"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-center gap-2 px-3.5 pt-2.5 text-[11px] font-medium text-blue-100/90">
        <span className="text-sm">📰</span>
        <span>行业快讯</span>
        <span className="rounded-full bg-white/15 px-1.5 py-px text-[10px] text-blue-100/80">
          {current.source}
        </span>
        {time && <span className="text-[10px] text-blue-200/60">{time}</span>}
        <span className="ml-auto text-[10px] text-blue-200/50">
          {source === 'cloud' ? '实时抓取 · 30 分钟更新' : '站内动态'}
        </span>
      </div>

      <div className="flex items-center gap-1.5 px-2.5 pb-2 pt-1.5">
        {/* 左箭头 */}
        <button
          type="button"
          onClick={() => setIdx((i) => (i - 1 + items.length) % items.length)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-blue-100/80 transition hover:bg-white/15 hover:text-white"
          aria-label="上一条"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 3L5 8l5 5" />
          </svg>
        </button>

        {/* 当前新闻标题 */}
        <a
          key={`${current.title}-${idx}`}
          href={current.link}
          target={current.link.startsWith('#') ? undefined : '_blank'}
          rel={current.link.startsWith('#') ? undefined : 'noreferrer'}
          className="min-w-0 flex-1 truncate text-sm font-medium text-white transition hover:text-blue-100 hover:underline"
          title={current.title}
        >
          {current.title}
        </a>

        {/* 右箭头 */}
        <button
          type="button"
          onClick={() => setIdx((i) => (i + 1) % items.length)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-blue-100/80 transition hover:bg-white/15 hover:text-white"
          aria-label="下一条"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3l5 5-5 5" />
          </svg>
        </button>
      </div>

      {/* 指示点 */}
      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1 pb-2">
          {items.slice(0, 12).map((it, i) => (
            <button
              key={`${it.title.slice(0, 12)}-${i}`}
              type="button"
              onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? 'w-4 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
              }`}
              aria-label={`第 ${i + 1} 条`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
