import { Link } from 'react-router-dom';
import { useCompare } from '../context/CompareContext';

export default function CompareTray() {
  const { chips, remove, clear } = useCompare();
  if (chips.length === 0) return null;

  const compareUrl = `/compare?ids=${chips.map((c) => c.id).join(',')}`;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
        <span className="text-sm font-medium text-slate-600">对比（{chips.length}/4）</span>
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 py-1 pl-3 pr-1.5 text-xs text-slate-700"
            >
              {c.model}
              <button
                type="button"
                onClick={() => remove(c.id)}
                className="flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                aria-label={`移除 ${c.model}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={clear} className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100">
            清空
          </button>
          {chips.length >= 2 ? (
            <Link
              to={compareUrl}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              开始对比 →
            </Link>
          ) : (
            <span className="rounded-lg bg-slate-200 px-4 py-1.5 text-sm text-slate-400">至少选择 2 颗</span>
          )}
        </div>
      </div>
    </div>
  );
}
