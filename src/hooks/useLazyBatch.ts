import { useState, useEffect, useRef, useCallback } from 'react';

const BATCH_SIZE = 48;

/**
 * Progressively renders items in batches as the user scrolls.
 * Returns the visible slice plus a ref to attach to a sentinel element.
 */
export function useLazyBatch<T>(items: T[]): {
  visible: T[];
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  hasMore: boolean;
} {
  const [count, setCount] = useState(BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset count when items change (category switch, filter, etc.)
  useEffect(() => {
    setCount(BATCH_SIZE);
  }, [items.length]);

  const loadMore = useCallback(() => {
    setCount(prev => Math.min(prev + BATCH_SIZE, items.length));
  }, [items.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, count]);

  return {
    visible: items.slice(0, count),
    sentinelRef,
    hasMore: count < items.length,
  };
}
