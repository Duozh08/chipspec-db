import { useEffect, useState } from 'react';
import { loadLocalCatalog, isNewItem, removeLocalCatalogItem, type LocalCatalogItem } from '../utils/localCatalog';

const CATEGORY_STYLE: Record<string, string> = {
  chip: 'border-blue-100 bg-blue-50/40',
  laptop: 'border-violet-100 bg-violet-50/40',
};
const CATEGORY_LABEL: Record<string, string> = { chip: '芯片', laptop: '游戏本' };

/** 列表页顶部"新收录"区块：自动收录的条目，24 小时内显示 New 徽章，之后自动消失 */
export default function NewCatalogSection({ category }: { category: 'chip' | 'laptop' }) {
  const [items, setItems] = useState<LocalCatalogItem[]>(() =>
    loadLocalCatalog().filter((i) => i.category === category)
  );

  // 每分钟刷新一次，让 New 徽章在满 24 小时后自动消失
  useEffect(() => {
    const timer = setInterval(() => {
      setItems(loadLocalCatalog().filter((i) => i.category === category));
    }, 60000);
    return () => clearInterval(timer);
  }, [category]);

  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 shadow-sm">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-700">📌 新收录（自动识别入库）</span>
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-500">New 标记 24 小时后自动消失</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const fresh = isNewItem(item);
          return (
            <div
              key={item.id}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${CATEGORY_STYLE[item.category] ?? ''}`}
            >
              {fresh && (
                <span className="inline-flex items-center rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  NEW
                </span>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-800">{item.name}</div>
                <div className="text-[11px] text-slate-400">
                  {CATEGORY_LABEL[item.category]}
                  {item.brand ? ` · ${item.brand}` : ''} · {item.status === 'filled' ? '已补全' : 'AI 补全中'}
                </div>
              </div>
              {item.desc && (
                <div className="hidden max-w-52 truncate text-[11px] text-slate-400 sm:block" title={item.desc}>
                  {item.desc}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  removeLocalCatalogItem(item.id);
                  setItems(loadLocalCatalog().filter((i) => i.category === category));
                }}
                className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] text-slate-300 transition hover:bg-slate-100 hover:text-red-500"
                title="移除该收录"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
