/**
 * 待收录明细弹框：独立展示收录条目与补全状态（与识别弹框分离）
 * 右上角「待收录 / 已补全」徽章点击后打开此界面
 */
import { useEffect, useState } from 'react';
import { exportPendingItems, loadPendingItems, removePendingItem } from '../utils/pendingStore';
import type { PendingItem } from '../utils/pendingStore';
import { useCollectSync } from '../hooks/useCollectSync';

export default function PendingListModal({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<PendingItem[]>(loadPendingItems);
  const sync = useCollectSync(5000);

  // 轮询结果变化时刷新本地清单
  useEffect(() => {
    setItems(loadPendingItems());
  }, [sync.syncedAt]);

  // Esc 关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filled = items.filter((i) => i.status === 'filled');
  const pending = items.filter((i) => i.status !== 'filled');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* 弹框 */}
      <div className="relative flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* 头部 */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div>
            <div className="text-sm font-bold text-slate-900">📋 待收录明细</div>
            <div className="text-[11px] text-slate-400">收录条目与 AI 补全状态（每 5 秒自动刷新）</div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" aria-label="关闭">
            <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        {/* 统计条 */}
        <div className="shrink-0 grid grid-cols-3 gap-2.5 px-5 pt-4">
          {[
            { label: '总收录', value: items.length, cls: 'text-slate-700 bg-slate-50 border-slate-200' },
            { label: '补全中', value: pending.length, cls: 'text-blue-600 bg-blue-50 border-blue-100' },
            { label: '已补全', value: filled.length, cls: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
          ].map((s) => (
            <div key={s.label} className={`rounded-lg border px-3 py-2 text-center ${s.cls}`}>
              <div className="text-lg font-bold">{s.value}</div>
              <div className="text-[11px]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* 明细列表 */}
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-400">
              暂无收录记录
              <div className="mt-1 text-[11px] text-slate-300">通过「截图识别」点击立即收录后，会出现在这里</div>
            </div>
          ) : (
            items.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 ${
                  p.status === 'filled' ? 'border-emerald-100 bg-emerald-50/50' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      p.category === 'chip' ? 'bg-blue-100 text-blue-700' : p.category === 'laptop' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {p.category === 'chip' ? '芯片' : p.category === 'laptop' ? '游戏本' : '未知'}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-800">{p.name}</div>
                    <div className="text-[11px] text-slate-400">
                      {new Date(p.createdAt).toLocaleString('zh-CN')}
                      {p.filledAt && p.status === 'filled' ? ` · 补全于 ${new Date(p.filledAt).toLocaleTimeString('zh-CN')}` : ''}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {p.status === 'filled' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      <span className="text-emerald-600">✓</span> 已补全
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600">
                      <svg viewBox="0 0 24 24" className="h-3 w-3 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M12 3a9 9 0 1 0 9 9" />
                      </svg>
                      AI 补全中
                    </span>
                  )}
                  <button
                    onClick={() => {
                      removePendingItem(p.id);
                      setItems(loadPendingItems());
                    }}
                    className="rounded p-0.5 text-slate-300 transition hover:text-red-500"
                    aria-label="移除"
                    title="从清单移除"
                  >
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 底部：导出 */}
        <div className="shrink-0 border-t border-slate-100 bg-slate-50/70 px-5 py-3">
          {items.length > 0 && (
            <button
              type="button"
              onClick={exportPendingItems}
              className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
            >
              ⬇ 导出待补全清单（JSON）
            </button>
          )}
          <p className="mt-2 text-[11px] leading-5 text-slate-400">
            收录后由后端 AI 自动补全规格（DeepSeek），补全完成后显示 ✓ 已补全。状态每 5 秒自动刷新；导出清单可供数据管道加速处理。
          </p>
        </div>
      </div>
    </div>
  );
}
