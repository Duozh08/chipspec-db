import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getChipById } from '../data';
import type { Chip } from '../data/types';
import { loadLocalChips } from '../utils/localCatalog';

const MAX_COMPARE = 4;
const STORAGE_KEY = 'chipspec-compare';

interface CompareContextValue {
  ids: string[];
  chips: Chip[];
  add: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
  isFull: boolean;
}

const CompareContext = createContext<CompareContextValue | null>(null);

/** 按 id 查找芯片：站内静态库 + 本地 AI 收录库 */
function findChipById(id: string): Chip | undefined {
  return getChipById(id) ?? loadLocalChips().find((c) => c.id === id);
}

function loadInitial(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string').filter((id) => findChipById(id) != null).slice(0, MAX_COMPARE);
  } catch {
    return [];
  }
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      /* 隐私模式等场景忽略 */
    }
  }, [ids]);

  const add = useCallback((id: string) => {
    setIds((prev) => (prev.includes(id) || prev.length >= MAX_COMPARE ? prev : [...prev, id]));
  }, []);
  const remove = useCallback((id: string) => {
    setIds((prev) => prev.filter((x) => x !== id));
  }, []);
  const clear = useCallback(() => setIds([]), []);
  const has = useCallback((id: string) => ids.includes(id), [ids]);

  const value = useMemo<CompareContextValue>(
    () => ({
      ids,
      chips: ids.map(findChipById).filter((c): c is Chip => c != null),
      add,
      remove,
      clear,
      has,
      isFull: ids.length >= MAX_COMPARE,
    }),
    [ids, add, remove, clear, has],
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare(): CompareContextValue {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare 必须在 CompareProvider 内使用');
  return ctx;
}
