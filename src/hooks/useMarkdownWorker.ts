import { useEffect, useRef, useState, useCallback } from 'react';
import { ParsedBlock, WorkerInputMessage, WorkerOutputMessage } from '../workers/markdownWorker.js';

export function useMarkdownWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [parsedBlocksMap, setParsedBlocksMap] = useState<Record<string, ParsedBlock[]>>({});
  const [isWorkerActive, setIsWorkerActive] = useState<boolean>(false);
  const pendingRequestsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      // Initialize Web Worker using standard Vite URL import pattern
      const worker = new Worker(
        new URL('../workers/markdownWorker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (e: MessageEvent<WorkerOutputMessage>) => {
        const { type, id, blocks } = e.data;
        if (type === 'MARKDOWN_PARSED') {
          setParsedBlocksMap((prev) => ({
            ...prev,
            [id]: blocks,
          }));
          pendingRequestsRef.current.delete(id);
        }
      };

      worker.onerror = (err) => {
        console.warn('Markdown Web Worker error, falling back to sync:', err);
      };

      workerRef.current = worker;
      setIsWorkerActive(true);

      return () => {
        worker.terminate();
        workerRef.current = null;
      };
    } catch (err) {
      console.warn('Web Workers not supported or blocked in current environment:', err);
      setIsWorkerActive(false);
    }
  }, []);

  const parseMarkdown = useCallback((id: string, content: string) => {
    if (!content) return;

    if (workerRef.current && isWorkerActive) {
      pendingRequestsRef.current.add(id);
      const msg: WorkerInputMessage = {
        type: 'PARSE_MARKDOWN',
        id,
        content,
      };
      workerRef.current.postMessage(msg);
    }
  }, [isWorkerActive]);

  return {
    parsedBlocksMap,
    parseMarkdown,
    isWorkerActive,
  };
}
