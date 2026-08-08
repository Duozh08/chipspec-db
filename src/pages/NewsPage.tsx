import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiNews } from '../utils/apiClient';
import type { NewsItem } from '../utils/apiClient';

/** 新闻来源颜色 */
const SOURCE_COLORS: Record<string, string> = {
  'IT之家': 'bg-blue-100 text-blue-700',
  爱范儿: 'bg-emerald-100 text-emerald-700',
  雷峰网: 'bg-violet-100 text-violet-700',
  本站: 'bg-slate-100 text-slate-600',
};

function formatPubDate(pubDate?: string): string {
  if (!pubDate) return '';
  const d = new Date(pubDate);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (sameDay) return `今天 ${time}`;
  const yesterday = new Date(now.getTime() - 86400000);
  if (d.toDateString() === yesterday.toDateString()) return `昨天 ${time}`;
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${time}`;
}

/** 行业资讯页：抓取 IT之家/爱范儿/雷峰网 RSS，按来源筛选 */
export default function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [sourceFilter, setSourceFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const list = await apiNews(15000);
      if (list.length > 0) {
        setItems(list);
        setUpdatedAt(new Date());
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sources = useMemo(() => {
    const set = new Set(items.map((i) => i.source).filter(Boolean));
    return ['', ...Array.from(set)] as string[];
  }, [items]);

  const filtered = useMemo(
    () => (sourceFilter ? items.filter((i) => i.source === sourceFilter) : items),
    [items, sourceFilter]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">📰 行业资讯</h1>
          <p className="mt-1 text-sm text-slate-500">
            芯片 / 显卡 / 游戏本 / 半导体行业快讯，实时抓取于 IT之家、爱范儿、雷峰网
          </p>
        </div>
        <div className="flex items-center gap-2">
          {updatedAt && (
            <span className="text-xs text-slate-400">更新于 {updatedAt.toLocaleTimeString('zh-CN')}</span>
          )}
          <button
            onClick={() => load()}
            disabled={loading}
            className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-100 disabled:opacity-50"
          >
            {loading ? '加载中…' : '↻ 刷新'}
          </button>
        </div>
      </div>

      {/* 来源筛选 */}
      {sources.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {sources.map((s) => (
            <button
              key={s || 'all'}
              onClick={() => setSourceFilter(s)}
              className={`rounded-full px-3 py-1 text-sm transition ${
                sourceFilter === s
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {s || '全部'}
            </button>
          ))}
        </div>
      )}

      {/* 新闻列表 */}
      {loading && items.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-slate-100 bg-slate-50" />
          ))}
        </div>
      ) : error && items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <div className="text-3xl">📡</div>
          <p className="mt-2 text-sm text-slate-500">新闻源暂时不可用，请稍后刷新重试</p>
          <Link to="/" className="mt-3 inline-block text-sm text-blue-500 hover:underline">
            ← 返回首页
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-400">
          该来源暂无新闻
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item, i) => (
            <a
              key={`${item.title.slice(0, 24)}-${i}`}
              href={item.link}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-blue-300 hover:shadow"
            >
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${SOURCE_COLORS[item.source] ?? 'bg-slate-100 text-slate-600'}`}
              >
                {item.source}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 group-hover:text-blue-600">
                {item.title}
              </span>
              <span className="shrink-0 text-xs text-slate-400">{formatPubDate(item.pubDate)}</span>
              <span className="shrink-0 text-xs text-blue-500 opacity-0 transition group-hover:opacity-100">→</span>
            </a>
          ))}
          <p className="pt-2 text-center text-xs text-slate-400">
            内容版权归各来源网站所有，点击条目在新窗口打开原文 · 数据每 30 分钟更新
          </p>
        </div>
      )}
    </div>
  );
}
