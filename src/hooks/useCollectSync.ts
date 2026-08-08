/**
 * 收录补全状态轮询：定期调用后端 list 接口，把已补全（filled）的条目
 * 同步到本地待收录清单（pendingStore）与本地收录库（localCatalog），
 * 前端 UI 据此显示「已补全 ✓」标识。
 */
import { useEffect, useRef, useState } from 'react';
import { apiList, cloudbaseEnabled } from '../utils/apiClient';
import { markPendingFilled } from '../utils/pendingStore';
import { saveLocalCatalogStatusByName } from '../utils/localCatalog';

export interface SyncState {
  /** 后端返回的已补全条目数 */
  filledCount: number;
  /** 本次轮询是否发现了新增已补全（供调用方触发一次性提示） */
  changed: boolean;
  /** 最近一次同步时间 */
  syncedAt: number | null;
}

/** 每 N 秒轮询一次后端收录状态 */
export function useCollectSync(intervalMs = 5000) {
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
          const hitLocal = saveLocalCatalogStatusByName(it.name, 'filled');
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
