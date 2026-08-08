import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFavoritesGet, apiFavoritesSet, cloudbaseEnabled } from '../utils/apiClient';

const STORAGE_KEY = 'chipspec-favorites';
const DEVICE_KEY = 'chipspec-device-id';
/** 云端写入防抖间隔（ms） */
const SYNC_DEBOUNCE_MS = 800;

function readStore(): Record<string, true> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStore(data: Record<string, true>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

/** 设备 ID（localStorage 持久化；首次生成随机 UUID） */
function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return 'dev-unknown';
  }
}

/** 全局收藏（关注）hook，芯片和游戏本共用同一个 localStorage key；CloudBase 可用时自动云端同步 */
export function useFavorites() {
  const [favs, setFavs] = useState<Record<string, true>>(readStore);
  const deviceIdRef = useRef<string>(getDeviceId());
  const syncTimerRef = useRef<number | null>(null);
  const syncedRef = useRef(false);

  // 首次挂载：从云端拉取收藏并合并到本地（本地优先，云端补充）
  useEffect(() => {
    if (!cloudbaseEnabled) return;
    let alive = true;
    apiFavoritesGet(deviceIdRef.current)
      .then((cloudIds) => {
        if (!alive || cloudIds.length === 0) return;
        setFavs((prev) => {
          const next = { ...prev };
          let changed = false;
          for (const id of cloudIds) {
            if (!next[id]) {
              next[id] = true;
              changed = true;
            }
          }
          if (changed) writeStore(next);
          return next;
        });
      })
      .catch(() => undefined)
      .finally(() => {
        syncedRef.current = true;
      });
    return () => {
      alive = false;
    };
  }, []);

  // 卸载前立即同步一次（防抖定时器可能未触发）
  useEffect(() => {
    return () => {
      if (syncTimerRef.current !== null) window.clearTimeout(syncTimerRef.current);
    };
  }, []);

  /** 防抖写云端 */
  const scheduleCloudSync = useCallback(() => {
    if (!cloudbaseEnabled) return;
    if (syncTimerRef.current !== null) window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(() => {
      const ids = Object.keys(readStore());
      apiFavoritesSet(deviceIdRef.current, ids).catch(() => undefined);
    }, SYNC_DEBOUNCE_MS);
  }, []);

  const toggle = useCallback(
    (id: string) => {
      setFavs((prev) => {
        const next = { ...prev };
        if (next[id]) delete next[id];
        else next[id] = true;
        writeStore(next);
        return next;
      });
      scheduleCloudSync();
    },
    [scheduleCloudSync]
  );

  const has = useCallback((id: string) => !!favs[id], [favs]);

  return { has, toggle, favs };
}

/** 判断 id 是否被收藏 */
export function isFavorited(id: string): boolean {
  return !!readStore()[id];
}

/** 排序：收藏的排在前面 */
export function sortWithFavorites<T extends { id: string }>(items: T[]): T[] {
  const store = readStore();
  return [...items].sort((a, b) => {
    const af = store[a.id] ? 1 : 0;
    const bf = store[b.id] ? 1 : 0;
    return bf - af;
  });
}

/** 按发布时间年份从近到远排序（最新在前；无年份的排最后） */
export function sortByReleaseYearDesc<T extends { release: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ay = a.release ? Number(a.release.slice(0, 4)) || 0 : 0;
    const by = b.release ? Number(b.release.slice(0, 4)) || 0 : 0;
    return by - ay;
  });
}

/** 组合排序：先按年份倒序，再按收藏置顶（收藏组内仍保持年份倒序） */
export function sortByYearThenFavorites<T extends { id: string; release: string | null }>(items: T[]): T[] {
  return sortWithFavorites(sortByReleaseYearDesc(items));
}
