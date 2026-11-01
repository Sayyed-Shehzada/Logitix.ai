import { useState, useEffect, useCallback, useRef } from 'react';

export interface ReadingProgressInfo {
  progress: number; // 0 to 100
  title?: string;
  type?: 'response' | 'artifact' | 'research' | 'code' | 'general';
  isComplete: boolean;
}

/**
 * Custom hook to track reading progress of scrollable long-form content.
 * Uses requestAnimationFrame throttling for fluid 60fps updates.
 */
export function useReadingProgress(initialTitle = 'Generated Response') {
  const [readingInfo, setReadingInfo] = useState<ReadingProgressInfo>({
    progress: 0,
    title: initialTitle,
    type: 'response',
    isComplete: false,
  });

  const rafRef = useRef<number | null>(null);

  const updateProgress = useCallback(
    (progress: number, meta?: { title?: string; type?: 'response' | 'artifact' | 'research' | 'code' | 'general' }) => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        const clamped = Math.min(100, Math.max(0, Math.round(progress)));
        setReadingInfo((prev) => ({
          progress: clamped,
          title: meta?.title !== undefined ? meta.title : prev.title,
          type: meta?.type !== undefined ? meta.type : prev.type,
          isComplete: clamped >= 98,
        }));
      });
    },
    []
  );

  const resetProgress = useCallback((title?: string) => {
    setReadingInfo({
      progress: 0,
      title: title || initialTitle,
      type: 'response',
      isComplete: false,
    });
  }, [initialTitle]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return {
    readingInfo,
    updateProgress,
    resetProgress,
    setReadingInfo,
  };
}

/**
 * Computes the reading scroll percentage of an HTML element.
 */
export function getElementScrollProgress(el: HTMLElement): number {
  const { scrollTop, scrollHeight, clientHeight } = el;
  const maxScroll = scrollHeight - clientHeight;
  if (maxScroll <= 0) return 0;
  const rawProgress = (scrollTop / maxScroll) * 100;
  return Math.min(100, Math.max(0, rawProgress));
}
