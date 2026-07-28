import { useMemo } from 'react';
import { allChips } from '../data';
import type { Brand, Category, Chip, FormFactor } from '../data/types';

export interface ChipFilters {
  brand: Brand | null;
  category: Category | null;
  formFactor: FormFactor | null;
  generation: string | null;
  query: string;
}

export function useChipFilters(filters: ChipFilters): Chip[] {
  const { brand, category, formFactor, generation, query } = filters;
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    return allChips.filter((c) => {
      if (brand && c.brand !== brand) return false;
      if (category && c.category !== category) return false;
      if (formFactor && c.formFactor !== formFactor) return false;
      if (generation && c.generation !== generation) return false;
      if (q) {
        const haystack = `${c.model} ${c.codename} ${c.generation}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [brand, category, formFactor, generation, query]);
}
