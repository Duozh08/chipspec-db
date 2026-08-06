import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'chipspec-favorites';

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

/** 全局收藏（关注）hook，芯片和游戏本共用同一个 localStorage key */
export function useFavorites() {
  const [favs, setFavs] = useState<Record<string, true>>(readStore);

  useEffect(() => {
    const handler = () => setFavs(readStore());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const toggle = useCallback((id: string) => {
    setFavs((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      writeStore(next);
      return next;
    });
  }, []);

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
