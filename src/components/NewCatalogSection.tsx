import { useLocalCatalogItems } from '../hooks/useLocalCatalogItems';
import { isNewItem, removeLocalCatalogItem, type LocalCatalogItem } from '../utils/localCatalog';

const CATEGORY_STYLE: Record<string, string> = {
  chip: 'border-blue-100 bg-blue-50/40',
  laptop: 'border-violet-100 bg-violet-50/40',
};
const CATEGORY_LABEL: Record<string, string> = { chip: '芯片', laptop: '游戏本' };

/** 列表页顶部"新收录"区块：自动收录的条目，24 小时内显示（含 New 徽章），
 *  过期后区块自动消失，该记录已永久保存在下方正常列表中（按发布时间排序） */
export default function NewCatalogSection({ category }: { category: 'chip' | 'laptop' }) {
  const items = useLocalCatalogItems(category);
  const freshItems = items.filter(isNewItem);

  if (freshItems.length === 0) return null;

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 shadow-sm">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-700">📌 新收录（自动识别入库）</span>
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-500">New 标记 24 小时后自动消失，记录永久保留在下方列表</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {freshItems.map((item: LocalCatalogItem) => (
          <div
            key={item.id}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${CATEGORY_STYLE[item.category] ?? ''}`}
          >
            <span className="inline-flex items-center rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              NEW
            </span>
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
              onClick={() => removeLocalCatalogItem(item.id)}
              className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] text-slate-300 transition hover:bg-slate-100 hover:text-red-500"
              title="移除该收录"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
