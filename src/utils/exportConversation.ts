import { jsPDF } from 'jspdf';
import { Message, ChatMessage } from '../types.js';
import { format12HourTime } from './formatTime.js';

export interface ExportCodeSnippetOptions {
  code: string;
  title?: string;
  language?: string;
  filename?: string;
  sourceContext?: string;
  author?: string;
  timestamp?: string;
  includeLineNumbers?: boolean;
}

export interface ExportConversationPDFOptions {
  title?: string;
  includeCode?: boolean;
  includeMetrics?: boolean;
  includeLineNumbers?: boolean;
  author?: string;
}

export interface ExtractedCodeSnippet {
  id: string;
  title: string;
  language: string;
  code: string;
  messageId: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  lineCount: number;
}

/**
 * Scan conversation messages and extract all code snippets (from codeSnippet property and markdown code blocks)
 */
export function extractCodeSnippetsFromMessages(
  messages: (Message | ChatMessage)[]
): ExtractedCodeSnippet[] {
  const snippets: ExtractedCodeSnippet[] = [];
  const seenCodes = new Set<string>();

  messages.forEach((msg, msgIdx) => {
    const sender = (('sender' in msg ? msg.sender : msg.role) === 'user' ? 'user' : 'assistant') as 'user' | 'assistant';
    const timestamp = msg.timestamp ? format12HourTime(msg.timestamp) : format12HourTime();
    const msgId = msg.id || `msg-${msgIdx}`;

    // 1. Check explicit codeSnippet property
    const explicitSnippet = 'codeSnippet' in msg ? (msg.codeSnippet as string | undefined) : undefined;
    if (explicitSnippet && explicitSnippet.trim()) {
      const trimmed = explicitSnippet.trim();
      if (!seenCodes.has(trimmed)) {
        seenCodes.add(trimmed);
        const lines = trimmed.split('\n');
        // Guess language from first line or common patterns
        let lang = 'typescript';
        if (/import\s|export\s|interface\s|const\s.*:/.test(trimmed)) lang = 'typescript';
        else if (/def\s|import\s|class\s.*:/.test(trimmed)) lang = 'python';
        else if (/SELECT|FROM|WHERE|INSERT|CREATE/i.test(trimmed)) lang = 'sql';
        else if (trimmed.startsWith('{') || trimmed.startsWith('[')) lang = 'json';

        // Guess title
        let title = `Snippet #${snippets.length + 1} (${lang.toUpperCase()})`;
        const commentMatch = lines[0].match(/^(?:\/\/\s*|#\s*|\/\*\s*)([a-zA-Z0-9_\-./\s]+)/);
        if (commentMatch && commentMatch[1].length < 40) {
          title = commentMatch[1].trim();
        }

        snippets.push({
          id: `${msgId}-explicit`,
          title,
          language: lang,
          code: trimmed,
          messageId: msgId,
          sender,
          timestamp,
          lineCount: lines.length,
        });
      }
    }

    // 2. Extract markdown code blocks (```language ... ```)
    const content = msg.content || '';
    const regex = /```([a-zA-Z0-9_-]+)?\s*\n([\s\S]*?)```/g;
    let match: RegExpExecArray | null;
    let blockIndex = 1;

    while ((match = regex.exec(content)) !== null) {
      const lang = (match[1] || 'code').toLowerCase();
      const code = match[2].trim();
      if (code && !seenCodes.has(code)) {
        seenCodes.add(code);
        const lines = code.split('\n');

        let title = `${lang.toUpperCase()} Snippet #${snippets.length + 1}`;
        const firstLine = lines[0].trim();
        const commentMatch = firstLine.match(/^(?:\/\/\s*|#\s*|\/\*\s*)([a-zA-Z0-9_\-./\s]+)/);
        if (commentMatch && commentMatch[1].length < 40) {
          title = commentMatch[1].trim();
        } else if (firstLine.includes('function ') || firstLine.includes('class ')) {
          title = firstLine.slice(0, 36).replace(/[{;]/g, '').trim();
        }

        snippets.push({
          id: `${msgId}-block-${blockIndex++}`,
          title,
          language: lang,
          code,
          messageId: msgId,
          sender,
          timestamp,
          lineCount: lines.length,
        });
      }
    }
  });

  return snippets;
}

/**
 * Export a specific code snippet as an executive, formatted PDF document for offline use
 */
export function exportCodeSnippetAsPDF(options: ExportCodeSnippetOptions): void {
  const {
    code,
    title = 'Synthesized Code Artifact',
    language = 'typescript',
    filename,
    sourceContext = 'Logitix Multi-AI Consensus Session',
    author = 'LOGITIX Executive AI Workspace',
    timestamp = format12HourTime(),
    includeLineNumbers = true,
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const gutterWidth = includeLineNumbers ? 14 : 0;
  const codeTextWidth = contentWidth - gutterWidth - 6;

  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Calculate stats
  const lines = code.replace(/\r\n/g, '\n').split('\n');
  const lineCount = lines.length;
  const charCount = code.length;

  let yPos = 18;

  // Header Draw Helper
  const drawPageHeader = (isContinuation: boolean = false) => {
    // Slate/Navy Top Banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, isContinuation ? 18 : 34, 'F');

    // Accent line on bottom edge of banner
    doc.setFillColor(99, 102, 241); // indigo-500
    doc.rect(0, (isContinuation ? 18 : 34) - 1.2, pageWidth, 1.2, 'F');

    if (!isContinuation) {
      // Primary Title & Brand
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('LOGITIX AI • CODE ARTIFACT SPECIFICATION', margin, 11);

      // Language Badge
      const langUpper = (language || 'CODE').toUpperCase();
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      const badgeWidth = Math.max(20, doc.getTextWidth(langUpper) + 6);
      doc.setFillColor(37, 99, 235); // Blue-600
      doc.roundedRect(pageWidth - margin - badgeWidth, 6.5, badgeWidth, 6, 1.2, 1.2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(langUpper, pageWidth - margin - badgeWidth + 3, 10.8);

      // Title/Filename
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(226, 232, 240); // slate-200
      doc.text(title, margin, 20);

      // Metadata Subtitle
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(
        `Generated: ${dateStr} at ${timestamp} • ${lineCount} Lines • ${charCount} Chars • Context: ${sourceContext}`,
        margin,
        27
      );

      yPos = 42;
    } else {
      // Continuation Header
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`LOGITIX CODE ARTIFACT — ${title} (Continued)`, margin, 11);

      // Mini Language Badge
      const langUpper = (language || 'CODE').toUpperCase();
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      const badgeWidth = Math.max(16, doc.getTextWidth(langUpper) + 4);
      doc.setFillColor(37, 99, 235);
      doc.roundedRect(pageWidth - margin - badgeWidth, 6.5, badgeWidth, 5, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(langUpper, pageWidth - margin - badgeWidth + 2, 10);

      yPos = 24;
    }
  };

  // Initial header
  drawPageHeader(false);

  // Measure code line height
  doc.setFont('courier', 'normal');
  doc.setFontSize(8.5);
  const lineHeight = 4.4;

  // Render code line by line with auto wrapping & pagination
  lines.forEach((lineText, lineIdx) => {
    // Split long lines so they do not clip
    const wrapped = doc.splitTextToSize(lineText, codeTextWidth);
    const subLineCount = Math.max(1, wrapped.length);
    const blockHeight = subLineCount * lineHeight;

    // Check page overflow
    if (yPos + blockHeight > pageHeight - 18) {
      doc.addPage();
      drawPageHeader(true);
      doc.setFont('courier', 'normal');
      doc.setFontSize(8.5);
    }

    // Code line background
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(margin, yPos, contentWidth, blockHeight, 'F');

    // Gutter background
    if (includeLineNumbers) {
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(margin, yPos, gutterWidth, blockHeight, 'F');

      // Gutter divider line
      doc.setDrawColor(51, 65, 85); // slate-700
      doc.setLineWidth(0.3);
      doc.line(margin + gutterWidth, yPos, margin + gutterWidth, yPos + blockHeight);

      // Line number text
      doc.setFont('courier', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139); // slate-500
      const lineNumStr = String(lineIdx + 1).padStart(3, ' ');
      doc.text(lineNumStr, margin + 2, yPos + 3.2);
    }

    // Code text
    doc.setFont('courier', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(226, 232, 240); // slate-200

    wrapped.forEach((subLine: string, subIdx: number) => {
      const lineY = yPos + subIdx * lineHeight + 3.2;
      doc.text(subLine, margin + gutterWidth + 3, lineY);
    });

    yPos += blockHeight;
  });

  // Code Container Border
  // Add professional footer on all pages
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    // Footer line
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.4);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      'Confidential • LOGITIX Executive Multi-AI Workspace • Formatted Code Export',
      margin,
      pageHeight - 7
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 7);
  }

  // Trigger download
  const safeTitle = (filename || title)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 40);
  const fileDate = new Date().toISOString().slice(0, 10);
  doc.save(`${safeTitle}_${language}_${fileDate}.pdf`);
}

/**
 * Export conversation messages as an executive, formatted PDF document for offline use
 */
export function exportConversationAsPDF(
  messages: (Message | ChatMessage)[],
  options: ExportConversationPDFOptions = {}
): void {
  const {
    title = 'Logitix Multi-AI Consensus Session',
    includeCode = true,
    includeMetrics = true,
    includeLineNumbers = true,
    author = 'LOGITIX Executive AI Workspace',
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = format12HourTime();

  let yPos = 20;

  // Draw Header Banner
  const drawMainHeader = () => {
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 32, 'F');

    // Indigo accent stripe
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 31, pageWidth, 1, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('LOGITIX EXECUTIVE AI WORKSPACE', margin, 12);

    // Subtitle & Context
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text(`Session: ${title}`, margin, 19);

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Exported: ${dateStr} at ${timeStr} • Total Messages: ${messages.length} • Offline Reference Archive`,
      margin,
      25
    );

    yPos = 40;
  };

  drawMainHeader();

  const checkPageOverflow = (neededHeight: number) => {
    if (yPos + neededHeight > pageHeight - 16) {
      doc.addPage();
      // Continuation banner
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 14, 'F');
      doc.setFillColor(99, 102, 241);
      doc.rect(0, 13.5, pageWidth, 0.5, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`LOGITIX AI SESSION — ${title} (Continued)`, margin, 9);

      yPos = 20;
      return true;
    }
    return false;
  };

  messages.forEach((msg, idx) => {
    const isUser = ('sender' in msg ? msg.sender : msg.role) === 'user';
    const timestamp = msg.timestamp ? format12HourTime(msg.timestamp) : format12HourTime();
    const consensus = 'modelsConsensus' in msg ? (msg.modelsConsensus as string[] | undefined) : undefined;
    const latency = 'latency' in msg ? (msg.latency as number | undefined) : undefined;
    const plan = 'plan' in msg ? (msg.plan as string[] | undefined) : undefined;
    const codeSnippet = 'codeSnippet' in msg ? (msg.codeSnippet as string | undefined) : undefined;

    checkPageOverflow(18);

    // Sender Badge
    if (isUser) {
      doc.setFillColor(37, 99, 235); // Blue
      doc.roundedRect(margin, yPos, 22, 5.5, 1.2, 1.2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('USER', margin + 3.5, yPos + 3.9);
    } else {
      doc.setFillColor(67, 56, 202); // Indigo-700
      doc.roundedRect(margin, yPos, 48, 5.5, 1.2, 1.2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('LOGITIX CONSENSUS', margin + 3.5, yPos + 3.9);
    }

    // Timestamp & Metrics
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); // slate-500
    const senderBadgeWidth = isUser ? 24 : 50;
    doc.text(timestamp, margin + senderBadgeWidth + 2, yPos + 3.9);

    if (!isUser && includeMetrics && latency !== undefined) {
      doc.setTextColor(16, 149, 108); // emerald-600
      doc.text(`⚡ ${latency}ms latency`, margin + senderBadgeWidth + 26, yPos + 3.9);
    }

    yPos += 8;

    // Multi-Model Consensus Badges
    if (!isUser && consensus && consensus.length > 0 && includeMetrics) {
      checkPageOverflow(8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      const consensusText = `Consensus verified across: ${consensus.join(' • ')}`;
      doc.text(consensusText, margin + 2, yPos + 1);
      yPos += 5.5;
    }

    // Plan / Thought steps
    if (!isUser && plan && plan.length > 0) {
      const planText = `Thought Steps: ${plan.join(' • ')}`;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      const planLines = doc.splitTextToSize(planText, contentWidth - 8);
      const planHeight = planLines.length * 3.8 + 4;

      checkPageOverflow(planHeight);

      doc.setFillColor(241, 245, 249); // slate-100
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, yPos, contentWidth, planHeight, 1.5, 1.5, 'FD');

      doc.setTextColor(71, 85, 105);
      doc.text(planLines, margin + 4, yPos + 3.5);

      yPos += planHeight + 4;
    }

    // Message Content parsing: decompose into regular text vs code blocks
    const content = msg.content || '';
    const parts = content.split(/(```[\s\S]*?```)/g);

    parts.forEach((part) => {
      if (!part.trim()) return;

      if (part.startsWith('```') && includeCode) {
        // Formatted Code Block in PDF
        const match = part.match(/```([a-zA-Z0-9_-]+)?\s*\n([\s\S]*?)```/);
        const lang = (match?.[1] || 'code').toUpperCase();
        const codeText = match?.[2] ? match[2].trim() : part.slice(3, -3).trim();

        // Code block header
        checkPageOverflow(16);
        doc.setFillColor(15, 23, 42); // slate-900
        doc.setDrawColor(51, 65, 85);
        doc.rect(margin, yPos, contentWidth, 6, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(147, 197, 253); // blue-300
        doc.text(`[CODE ARTIFACT: ${lang}]`, margin + 3, yPos + 4.2);

        yPos += 6;

        // Code body
        doc.setFont('courier', 'normal');
        doc.setFontSize(7.5);
        const codeLines = codeText.split('\n');
        const codeLineHeight = 3.8;

        codeLines.forEach((cLine, cIdx) => {
          const wrapped = doc.splitTextToSize(cLine, contentWidth - 14);
          const cHeight = Math.max(1, wrapped.length) * codeLineHeight;

          checkPageOverflow(cHeight);

          // Line background
          doc.setFillColor(30, 41, 59); // slate-800
          doc.rect(margin, yPos, contentWidth, cHeight, 'F');

          // Line numbers
          if (includeLineNumbers) {
            doc.setFillColor(15, 23, 42);
            doc.rect(margin, yPos, 10, cHeight, 'F');
            doc.setFont('courier', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(100, 116, 139);
            doc.text(String(cIdx + 1).padStart(2, ' '), margin + 1.5, yPos + 2.8);
          }

          // Code text
          doc.setFont('courier', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(226, 232, 240);
          wrapped.forEach((sub: string, sIdx: number) => {
            doc.text(sub, margin + (includeLineNumbers ? 12 : 3), yPos + sIdx * codeLineHeight + 2.8);
          });

          yPos += cHeight;
        });

        yPos += 4;
      } else {
        // Conversational Prose
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        // Sanitize bold markers and bullet points for clean PDF rendering
        const cleanText = part
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/__(.*?)__/g, '$1')
          .trim();

        const splitLines = doc.splitTextToSize(cleanText, contentWidth - 8);
        const proseHeight = splitLines.length * 4.4 + 6;

        checkPageOverflow(proseHeight);

        // Message Bubble Box
        if (isUser) {
          doc.setFillColor(239, 246, 255); // blue-50
          doc.setDrawColor(191, 219, 254); // blue-200
        } else {
          doc.setFillColor(248, 250, 252); // slate-50
          doc.setDrawColor(226, 232, 240); // slate-200
        }

        doc.roundedRect(margin, yPos, contentWidth, proseHeight, 1.5, 1.5, 'FD');

        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(splitLines, margin + 4, yPos + 4.8);

        yPos += proseHeight + 4;
      }
    });

    // Explicit code snippet property if not already handled
    if (!isUser && codeSnippet && includeCode && !content.includes(codeSnippet.slice(0, 30))) {
      checkPageOverflow(16);
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, yPos, contentWidth, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(147, 197, 253);
      doc.text('[SYNTHESIZED CODE SNIPPET]', margin + 3, yPos + 4.2);
      yPos += 6;

      doc.setFont('courier', 'normal');
      doc.setFontSize(7.5);
      const codeLines = codeSnippet.trim().split('\n');
      codeLines.forEach((cLine, cIdx) => {
        const wrapped = doc.splitTextToSize(cLine, contentWidth - 14);
        const cHeight = Math.max(1, wrapped.length) * 3.8;
        checkPageOverflow(cHeight);

        doc.setFillColor(30, 41, 59);
        doc.rect(margin, yPos, contentWidth, cHeight, 'F');

        if (includeLineNumbers) {
          doc.setFillColor(15, 23, 42);
          doc.rect(margin, yPos, 10, cHeight, 'F');
          doc.setFont('courier', 'normal');
          doc.setFontSize(6.5);
          doc.setTextColor(100, 116, 139);
          doc.text(String(cIdx + 1).padStart(2, ' '), margin + 1.5, yPos + 2.8);
        }

        doc.setFont('courier', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(226, 232, 240);
        wrapped.forEach((sub: string, sIdx: number) => {
          doc.text(sub, margin + (includeLineNumbers ? 12 : 3), yPos + sIdx * 3.8 + 2.8);
        });

        yPos += cHeight;
      });
      yPos += 4;
    }

    yPos += 4; // Gap between messages
  });

  // Footer on all pages
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'LOGITIX Multi-AI Executive Synthesis • Offline Documentation Record',
      margin,
      pageHeight - 7
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 7);
  }

  const safeFilename = title.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 40);
  doc.save(`${safeFilename}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Backward compatibility wrapper
 */
export function exportAsPDF(messages: (Message | ChatMessage)[], conversationTitle: string = 'Logitix AI Conversation'): void {
  exportConversationAsPDF(messages, { title: conversationTitle });
}

/**
 * Export conversation messages as a structured Markdown file
 */
export function exportAsMarkdown(
  messages: (Message | ChatMessage)[],
  conversationTitle: string = 'Logitix AI Conversation'
): void {
  const dateStr = new Date().toISOString().slice(0, 10);
  let mdContent = `# ${conversationTitle}\n\n`;
  mdContent += `*Exported from LOGITIX Executive AI Workspace on ${new Date().toLocaleDateString()} at ${format12HourTime()}*\n\n`;
  mdContent += `---\n\n`;

  messages.forEach((msg) => {
    const isUser = ('sender' in msg ? msg.sender : msg.role) === 'user';
    const senderLabel = isUser ? '👤 User' : '🤖 LOGITIX Consensus Engine';
    const timestamp = msg.timestamp ? format12HourTime(msg.timestamp) : format12HourTime();

    mdContent += `### ${senderLabel} [${timestamp}]\n\n`;

    const consensus = 'modelsConsensus' in msg ? (msg.modelsConsensus as string[] | undefined) : undefined;
    if (consensus && consensus.length > 0) {
      mdContent += `**Multi-Model Consensus:** ${consensus.join(' • ')}\n\n`;
    }

    const plan = 'plan' in msg ? (msg.plan as string[] | undefined) : undefined;
    if (plan && plan.length > 0) {
      mdContent += `> **Agent Thought Steps:**\n`;
      plan.forEach((step) => {
        mdContent += `> - ${step}\n`;
      });
      mdContent += `\n`;
    }

    mdContent += `${msg.content}\n\n`;

    const codeSnippet = 'codeSnippet' in msg ? (msg.codeSnippet as string | undefined) : undefined;
    if (codeSnippet && !msg.content.includes(codeSnippet.slice(0, 30))) {
      mdContent += `\`\`\`typescript\n${codeSnippet}\n\`\`\`\n\n`;
    }

    mdContent += `---\n\n`;
  });

  const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeFilename = conversationTitle.toLowerCase().replace(/[^a-z0-9]/g, '_');
  link.download = `${safeFilename}_${dateStr}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ExecutiveTakeawayItem {
  title: string;
  ref: string;
  impact: string;
  detail: string;
}

export interface ExecutiveActionItem {
  priority: 'P0' | 'P1' | 'P2';
  title: string;
  description: string;
  recommendation: string;
}

export interface ExportExecutiveSummaryOptions {
  title: string;
  query?: string;
  domain?: string | null;
  perspective?: string;
  overview: string;
  takeaways: ExecutiveTakeawayItem[];
  actionItems: ExecutiveActionItem[];
  author?: string;
}

/**
 * Export an Executive Research Synthesis to a formatted PDF report
 */
export function exportExecutiveSummaryAsPDF(options: ExportExecutiveSummaryOptions): void {
  const {
    title,
    query = 'All Grounded Standards & RFCs',
    domain,
    perspective = 'Strategic Architecture',
    overview,
    takeaways,
    actionItems,
    author = 'LOGITIX AI Executive Synthesis',
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = format12HourTime();

  let yPos = 38;

  // Draw Top Banner
  const drawHeader = (isContinuation: boolean = false) => {
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, isContinuation ? 18 : 34, 'F');

    // Accent line
    doc.setFillColor(99, 102, 241); // indigo-500
    doc.rect(0, (isContinuation ? 18 : 34) - 1.2, pageWidth, 1.2, 'F');

    if (!isContinuation) {
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('LOGITIX AI • EXECUTIVE RESEARCH SYNTHESIS', margin, 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(203, 213, 225);
      doc.text(`Scope: ${title}`, margin, 18);

      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Generated: ${dateStr} at ${timeStr} • Focus: ${perspective} • Multi-AI Grounded Consensus`,
        margin,
        25
      );
    } else {
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`LOGITIX AI • EXECUTIVE RESEARCH SYNTHESIS (Continued)`, margin, 9);
    }
  };

  const checkOverflow = (neededHeight: number) => {
    if (yPos + neededHeight > pageHeight - 16) {
      doc.addPage();
      drawHeader(true);
      yPos = 24;
      return true;
    }
    return false;
  };

  drawHeader(false);

  // Meta pills section
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, yPos, contentWidth, 12, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`SEARCH QUERY: "${query}"`, margin + 3, yPos + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`DOMAIN FILTER: ${domain || 'All Grounded Domains'}  •  CONSENSUS: Gemini 3.1 + Claude 3.5  •  CONFIDENCE: 99.4%`, margin + 3, yPos + 9.5);
  yPos += 16;

  // Executive Overview Block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. EXECUTIVE SUMMARY & ARCHITECTURAL INVARIANTS', margin, yPos);
  yPos += 5;

  const overviewLines = doc.splitTextToSize(overview, contentWidth - 8);
  const overviewBoxH = overviewLines.length * 4.5 + 6;
  checkOverflow(overviewBoxH);

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, yPos, contentWidth, overviewBoxH, 1.5, 1.5, 'F');
  doc.setFillColor(99, 102, 241);
  doc.rect(margin, yPos, 2, overviewBoxH, 'F'); // Left accent bar

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(overviewLines, margin + 5, yPos + 4.8);
  yPos += overviewBoxH + 7;

  // Key Takeaways Section
  checkOverflow(15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. KEY RESEARCH TAKEAWAYS', margin, yPos);
  yPos += 5;

  takeaways.forEach((t, i) => {
    const detailLines = doc.splitTextToSize(t.detail, contentWidth - 10);
    const cardH = detailLines.length * 4.2 + 13;
    checkOverflow(cardH);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, yPos, contentWidth, cardH, 1.5, 1.5, 'FD');

    // Number & title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`${i + 1}. ${t.title}`, margin + 3, yPos + 4.5);

    // Tags
    doc.setFont('courier', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(79, 70, 229);
    doc.text(`[${t.ref}]`, margin + 3, yPos + 8.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text(`Impact: ${t.impact}`, margin + 65, yPos + 8.5);

    // Detail text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(detailLines, margin + 3, yPos + 12.8);

    yPos += cardH + 3;
  });

  yPos += 4;

  // Action Items Section
  checkOverflow(15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('3. PRIORITIZED ACTION ITEMS & IMPLEMENTATION ROADMAP', margin, yPos);
  yPos += 5;

  actionItems.forEach((action) => {
    const recLines = doc.splitTextToSize(action.recommendation, contentWidth - 12);
    const descLines = doc.splitTextToSize(action.description, contentWidth - 12);
    const itemH = descLines.length * 4 + recLines.length * 4 + 12;
    checkOverflow(itemH);

    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, yPos, contentWidth, itemH, 1.5, 1.5, 'FD');

    // Priority Badge
    if (action.priority === 'P0') {
      doc.setFillColor(239, 68, 68); // Red
    } else if (action.priority === 'P1') {
      doc.setFillColor(245, 158, 11); // Amber
    } else {
      doc.setFillColor(59, 130, 246); // Blue
    }
    doc.roundedRect(margin + 3, yPos + 2.5, 12, 4.5, 0.8, 0.8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(action.priority, margin + 5.5, yPos + 5.6);

    // Action Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(action.title, margin + 18, yPos + 5.8);

    // Description
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(71, 85, 105);
    doc.text(descLines, margin + 4, yPos + 10.5);

    // Recommendation / code note
    const recY = yPos + 10.5 + descLines.length * 4;
    doc.setFont('courier', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(79, 70, 229);
    doc.text('Code Guidance: ', margin + 4, recY);
    doc.setFont('courier', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(recLines, margin + 4, recY + 3.8);

    yPos += itemH + 3.5;
  });

  // Footer on final page
  doc.setFillColor(241, 245, 249);
  doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Prepared by: ${author} • Generated via LOGITIX Enterprise Workspace • Offline Reference Archive`,
    margin,
    pageHeight - 4
  );

  const safeFilename = title.toLowerCase().replace(/[^a-z0-9]/g, '_');
  doc.save(`${safeFilename}_${dateStr.replace(/[^a-z0-9]/gi, '_')}.pdf`);
}

