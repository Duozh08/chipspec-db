import { useEffect, useState } from 'react';
import { loadLocalCatalog, type LocalCatalogItem } from '../utils/localCatalog';

/**
 * 本地 AI 收录条目（跨标签页同步 + 每分钟刷新）。
 * 列表页用它把新收录数据合并进正常列表，并让顶部 New 区块在满 24 小时后自动消失。
 */
export function useLocalCatalogItems(category: 'chip' | 'laptop'): LocalCatalogItem[] {
  const [items, setItems] = useState<LocalCatalogItem[]>(() =>
    loadLocalCatalog().filter((i) => i.category === category)
  );

  useEffect(() => {
    const refresh = () => setItems(loadLocalCatalog().filter((i) => i.category === category));
    window.addEventListener('storage', refresh);
    window.addEventListener('chipspec-local-catalog', refresh);
    // 每分钟刷新：保证 New 徽章在满 24 小时后自动消失
    const timer = setInterval(refresh, 60000);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('chipspec-local-catalog', refresh);
      clearInterval(timer);
    };
  }, [category]);

  return items;
}
