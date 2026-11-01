// Web Worker for offloading heavy markdown parsing & stream processing from main UI thread

export type ParsedBlockType = 'code' | 'heading' | 'quote' | 'list' | 'text' | 'image';

export interface ParsedBlock {
  id: string;
  type: ParsedBlockType;
  content: string;
  language?: string;
  level?: number;
  items?: string[];
  imageUrl?: string;
  altText?: string;
}

export interface WorkerInputMessage {
  type: 'PARSE_MARKDOWN';
  id: string;
  content: string;
}

export interface WorkerOutputMessage {
  type: 'MARKDOWN_PARSED';
  id: string;
  blocks: ParsedBlock[];
  processedAt: number;
}

self.onmessage = (e: MessageEvent<WorkerInputMessage>) => {
  const { type, id, content } = e.data;

  if (type === 'PARSE_MARKDOWN') {
    const blocks = parseMarkdownToBlocks(id, content || '');
    const response: WorkerOutputMessage = {
      type: 'MARKDOWN_PARSED',
      id,
      blocks,
      processedAt: Date.now(),
    };
    self.postMessage(response);
  }
};

function parseMarkdownToBlocks(msgId: string, content: string): ParsedBlock[] {
  if (!content) return [];

  const blocks: ParsedBlock[] = [];
  
  // First split by code blocks (```...```)
  const codeBlockRegex = /(```[\s\S]*?```)/g;
  const parts = content.split(codeBlockRegex);

  let blockIdx = 0;

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith('```')) {
      const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
      const language = match?.[1] || 'text';
      const codeText = match?.[2] ?? part.slice(3, part.endsWith('```') ? -3 : undefined);

      blocks.push({
        id: `${msgId}-block-${blockIdx++}`,
        type: 'code',
        language: language.trim().toLowerCase(),
        content: codeText,
      });
    } else {
      // Process text segment line by line or paragraph by paragraph for structured blocks
      const lines = part.split('\n');
      let currentParagraphLines: string[] = [];
      let currentListItems: string[] = [];

      const flushParagraph = () => {
        if (currentParagraphLines.length > 0) {
          const text = currentParagraphLines.join('\n');
          if (text.trim()) {
            blocks.push({
              id: `${msgId}-block-${blockIdx++}`,
              type: 'text',
              content: text,
            });
          }
          currentParagraphLines = [];
        }
      };

      const flushList = () => {
        if (currentListItems.length > 0) {
          blocks.push({
            id: `${msgId}-block-${blockIdx++}`,
            type: 'list',
            content: '',
            items: [...currentListItems],
          });
          currentListItems = [];
        }
      };

      for (const line of lines) {
        const trimmed = line.trim();

        // Check Image Markdown: ![alt](url)
        const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (imgMatch) {
          flushParagraph();
          flushList();
          blocks.push({
            id: `${msgId}-block-${blockIdx++}`,
            type: 'image',
            content: line,
            altText: imgMatch[1] || 'Generated Image',
            imageUrl: imgMatch[2],
          });
          continue;
        }

        // Check Headings
        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
          flushParagraph();
          flushList();
          blocks.push({
            id: `${msgId}-block-${blockIdx++}`,
            type: 'heading',
            level: headingMatch[1].length,
            content: headingMatch[2],
          });
          continue;
        }

        // Check Blockquotes
        if (line.startsWith('> ')) {
          flushParagraph();
          flushList();
          blocks.push({
            id: `${msgId}-block-${blockIdx++}`,
            type: 'quote',
            content: line.slice(2),
          });
          continue;
        }

        // Check Bullet / Numbered lists
        const listMatch = line.match(/^(\*|-|\+|\d+\.)\s+(.+)$/);
        if (listMatch) {
          flushParagraph();
          currentListItems.push(listMatch[2]);
          continue;
        }

        // Normal line
        flushList();
        currentParagraphLines.push(line);
      }

      flushParagraph();
      flushList();
    }
  }

  return blocks;
}
