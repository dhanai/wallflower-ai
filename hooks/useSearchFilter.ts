'use client';

import { useMemo } from 'react';

interface UseSearchFilterOptions<T> {
  fields?: (keyof T & string)[];
  predicate?: (item: T, normalizedQuery: string) => boolean;
  caseSensitive?: boolean;
}

export function useSearchFilter<T>(items: T[], query: string, options: UseSearchFilterOptions<T> = {}): T[] {
  const { fields, predicate, caseSensitive = false } = options;
  const fieldsKey = Array.isArray(fields) ? fields.join('|') : 'none';

  return useMemo(() => {
    if (!query.trim()) {
      return items;
    }

    const normalizedQuery = caseSensitive ? query.trim() : query.trim().toLowerCase();

    const matches = (value: unknown): boolean => {
      if (value == null) return false;
      const text = String(value);
      return caseSensitive ? text.includes(normalizedQuery) : text.toLowerCase().includes(normalizedQuery);
    };

    return items.filter((item) => {
      if (predicate) {
        return predicate(item, normalizedQuery);
      }

      if (!fields || fields.length === 0) {
        return matches(item);
      }

      return fields.some((field) => {
        const value = (item as Record<string, unknown>)[field];
        return matches(value);
      });
    });
  }, [caseSensitive, fieldsKey, items, predicate, query]);
}


