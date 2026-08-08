/**
 * 收录补全状态轮询：定期调用后端 list 接口，把已补全（filled）的条目
 * 同步到本地待收录清单（pendingStore）与本地收录库（localCatalog），
 * 前端 UI 据此显示「已补全 ✓」标识，并把后端 AI 补全的完整规格（spec）
 * 写回本地条目，使收录的型号能展示处理器/显卡等硬件参数。
 */
import { useEffect, useRef, useState } from 'react';
import { apiList, cloudbaseEnabled } from '../utils/apiClient';
import { markPendingFilled } from '../utils/pendingStore';
import { addLocalCatalogItem, saveLocalCatalogFilled } from '../utils/localCatalog';

export interface SyncState {
  /** 后端返回的已补全条目数 */
  filledCount: number;
  /** 本次轮询是否发现了新增已补全（供调用方触发一次性提示） */
  changed: boolean;
  /** 最近一次同步时间 */
  syncedAt: number | null;
}

/** 每 N 秒轮询一次后端收录状态（默认 2.5s，配合前端主动快轮询实现最快补全闭环） */
export function useCollectSync(intervalMs = 2500) {
  const [state, setState] = useState<SyncState>({ filledCount: 0, changed: false, syncedAt: null });
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!cloudbaseEnabled) return;
    let disposed = false;

    const sync = async () => {
      try {
        const items = await apiList('filled');
        if (disposed) return;
        let changed = false;
        for (const it of items) {
          const hitPending = markPendingFilled(it.name, it.filledAt);
          // 同时把后端补全的 spec 写回本地条目（含处理器/显卡等硬件参数）
          const hitLocal = saveLocalCatalogFilled(it.name, it.spec, it.filledAt);
          if (!hitLocal && it.spec) {
            // 后端有补全但本地无条目（如游戏本收录联动自动补录的芯片）→ 创建本地条目并同步 spec
            const created = await addLocalCatalogItem(it.name, it.category, it.brand);
            await saveLocalCatalogFilled(it.name, it.spec, it.filledAt);
            if (created) changed = true;
          }
          if (hitPending || hitLocal) changed = true;
        }
        setState((prev) => ({
          filledCount: items.length,
          changed: changed || prev.changed,
          syncedAt: Date.now(),
        }));
        // changed 标记只生效一轮（8 秒后复位），供调用方触发一次性提示
        if (changed) {
          setTimeout(() => {
            if (!disposed) setState((p) => ({ ...p, changed: false }));
          }, 8000);
        }
      } catch {
        /* 后端不可用/未配置时静默跳过 */
      }
    };

    sync();
    timerRef.current = window.setInterval(sync, intervalMs);
    return () => {
      disposed = true;
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);

  return state;
}
