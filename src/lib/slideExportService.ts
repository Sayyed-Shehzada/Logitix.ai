import { jsPDF } from 'jspdf';
import pptxgen from 'pptxgenjs';
import { PresentationDeckPlan, SlideItem, ColorPaletteSuggestion, TypographyStyleSuggestion } from '../types';

export interface ExportOptions {
  includeNotes?: boolean;
  includeFooter?: boolean;
  authorName?: string;
}

// Color palette map for PDF and PPTX export styling
const THEME_PALETTES: Record<
  string,
  {
    primary: string; // Hex without # for pptx, with # for pdf
    primaryHex: string;
    secondaryHex: string;
    bgHex: string;
    cardBgHex: string;
    textPrimaryHex: string;
    textSecondaryHex: string;
    accentHex: string;
    isDark: boolean;
  }
> = {
  'Modern Indigo': {
    primary: '1A146B',
    primaryHex: '#1a146b',
    secondaryHex: '#4f46e5',
    bgHex: '#f8fafc',
    cardBgHex: '#ffffff',
    textPrimaryHex: '#0f172a',
    textSecondaryHex: '#475569',
    accentHex: '#6366f1',
    isDark: false,
  },
  'Executive Obsidian': {
    primary: '9333EA',
    primaryHex: '#0f0f12',
    secondaryHex: '#a855f7',
    bgHex: '#09090b',
    cardBgHex: '#18181b',
    textPrimaryHex: '#f4f4f5',
    textSecondaryHex: '#a1a1aa',
    accentHex: '#c084fc',
    isDark: true,
  },
  'Emerald Growth': {
    primary: '065F46',
    primaryHex: '#064e3b',
    secondaryHex: '#059669',
    bgHex: '#f0fdf4',
    cardBgHex: '#ffffff',
    textPrimaryHex: '#064e3b',
    textSecondaryHex: '#374151',
    accentHex: '#10b981',
    isDark: false,
  },
  'Cobalt Enterprise': {
    primary: '0284C7',
    primaryHex: '#0c4a6e',
    secondaryHex: '#0284c7',
    bgHex: '#f0f9ff',
    cardBgHex: '#ffffff',
    textPrimaryHex: '#082f49',
    textSecondaryHex: '#334155',
    accentHex: '#38bdf8',
    isDark: false,
  },
  'Minimalist Coral': {
    primary: 'E11D48',
    primaryHex: '#881337',
    secondaryHex: '#e11d48',
    bgHex: '#fff1f2',
    cardBgHex: '#ffffff',
    textPrimaryHex: '#4c0519',
    textSecondaryHex: '#4b5563',
    accentHex: '#f43f5e',
    isDark: false,
  },
};

function getThemePalette(themeName?: string, customPalette?: ColorPaletteSuggestion) {
  if (customPalette) {
    return {
      primary: customPalette.primaryAccent.replace('#', ''),
      primaryHex: customPalette.primaryAccent,
      secondaryHex: customPalette.secondaryAccent,
      bgHex: customPalette.surfaceBg,
      cardBgHex: customPalette.cardBg,
      textPrimaryHex: customPalette.titleColor,
      textSecondaryHex: customPalette.bodyColor,
      accentHex: customPalette.primaryAccent,
      isDark: customPalette.isDark,
    };
  }
  if (themeName && THEME_PALETTES[themeName]) {
    return THEME_PALETTES[themeName];
  }
  return THEME_PALETTES['Modern Indigo'];
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_') || 'Presentation_Deck';
}

/**
 * Exports a presentation deck plan to a high-fidelity Microsoft PowerPoint (.pptx) file
 */
export async function exportDeckToPPTX(
  deck: PresentationDeckPlan,
  options: ExportOptions = { includeNotes: true, includeFooter: true }
): Promise<void> {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = options.authorName || 'LOGITIX AI Studio';
  pptx.company = 'LOGITIX AI';
  pptx.title = deck.title;
  pptx.subject = deck.subtitle || 'Generated Presentation Deck';

  const palette = getThemePalette(
    deck.conditions?.theme,
    deck.conditions?.customPalette || deck.palette
  );
  const headlineFontFace = deck.conditions?.customTypography?.headlineFont || deck.typography?.headlineFont || 'Helvetica';
  const bodyFontFace = deck.conditions?.customTypography?.bodyFont || deck.typography?.bodyFont || 'Helvetica';
  const cleanHex = (h: string) => h.replace('#', '').toUpperCase();

  const primaryCol = cleanHex(palette.primaryHex);
  const secondaryCol = cleanHex(palette.secondaryHex);
  const bgCol = cleanHex(palette.bgHex);
  const cardBgCol = cleanHex(palette.cardBgHex);
  const textCol = cleanHex(palette.textPrimaryHex);
  const mutedCol = cleanHex(palette.textSecondaryHex);
  const accentCol = cleanHex(palette.accentHex);

  deck.slides.forEach((slideItem, index) => {
    const slide = pptx.addSlide();
    slide.background = { color: bgCol };

    // Slide Top Banner Accent Line
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: '100%',
      h: 0.1,
      fill: { color: primaryCol },
      line: { color: primaryCol, width: 0 },
    });

    // Header Slide Category Badge
    slide.addText(`SLIDE ${index + 1} OF ${deck.slides.length} • ${slideItem.layout.replace(/_/g, ' ')}`, {
      x: 0.8,
      y: 0.35,
      w: 8.4,
      h: 0.25,
      fontSize: 9,
      fontFace: 'Helvetica',
      bold: true,
      color: secondaryCol,
    });

    // Slide Title
    slide.addText(slideItem.title, {
      x: 0.8,
      y: 0.6,
      w: 8.4,
      h: 0.65,
      fontSize: 22,
      fontFace: 'Helvetica',
      bold: true,
      color: textCol,
      valign: 'top',
    });

    // Subtitle
    if (slideItem.subtitle) {
      slide.addText(slideItem.subtitle, {
        x: 0.8,
        y: 1.25,
        w: 8.4,
        h: 0.35,
        fontSize: 12,
        fontFace: 'Helvetica',
        italic: true,
        color: mutedCol,
      });
    }

    const contentStartY = slideItem.subtitle ? 1.65 : 1.35;

    // Layout Specific Elements
    switch (slideItem.layout) {
      case 'TITLE': {
        // Large Center Card
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: contentStartY,
          w: 8.4,
          h: 2.8,
          rectRadius: 0.15,
          fill: { color: cardBgCol },
          line: { color: secondaryCol, width: 1.5 },
        });

        const bullets = slideItem.bullets || [];
        if (bullets.length > 0) {
          const bulletObjs = bullets.map((b) => ({
            text: b,
            options: {
              fontSize: 13,
              fontFace: 'Helvetica',
              color: textCol,
              bullet: true,
              breakLine: true,
              paraSpaceAfter: 12,
            },
          }));

          slide.addText(bulletObjs, {
            x: 1.2,
            y: contentStartY + 0.35,
            w: 7.6,
            h: 2.1,
            valign: 'middle',
          });
        }
        break;
      }

      case 'TWO_COLUMNS': {
        // Column 1 Box
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: contentStartY,
          w: 4.0,
          h: 3.1,
          rectRadius: 0.15,
          fill: { color: cardBgCol },
          line: { color: secondaryCol, width: 1 },
        });

        slide.addText('Core Architecture & Context', {
          x: 1.0,
          y: contentStartY + 0.2,
          w: 3.6,
          h: 0.3,
          fontSize: 12,
          fontFace: 'Helvetica',
          bold: true,
          color: primaryCol,
        });

        const leftBullets = (slideItem.leftColumn || slideItem.bullets?.slice(0, 3) || []).map((b) => ({
          text: b,
          options: {
            fontSize: 10.5,
            fontFace: 'Helvetica',
            color: textCol,
            bullet: true,
            breakLine: true,
            paraSpaceAfter: 10,
          },
        }));

        slide.addText(leftBullets, {
          x: 1.0,
          y: contentStartY + 0.6,
          w: 3.6,
          h: 2.3,
          valign: 'top',
        });

        // Column 2 Box
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 5.2,
          y: contentStartY,
          w: 4.0,
          h: 3.1,
          rectRadius: 0.15,
          fill: { color: cardBgCol },
          line: { color: accentCol, width: 1 },
        });

        slide.addText('Impact & Strategic Capabilities', {
          x: 5.4,
          y: contentStartY + 0.2,
          w: 3.6,
          h: 0.3,
          fontSize: 12,
          fontFace: 'Helvetica',
          bold: true,
          color: secondaryCol,
        });

        const rightBullets = (slideItem.rightColumn || slideItem.bullets?.slice(3) || []).map((b) => ({
          text: b,
          options: {
            fontSize: 10.5,
            fontFace: 'Helvetica',
            color: textCol,
            bullet: true,
            breakLine: true,
            paraSpaceAfter: 10,
          },
        }));

        slide.addText(rightBullets, {
          x: 5.4,
          y: contentStartY + 0.6,
          w: 3.6,
          h: 2.3,
          valign: 'top',
        });
        break;
      }

      case 'METRIC_HIGHLIGHT': {
        // KPI Callout Card
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: contentStartY,
          w: 3.4,
          h: 3.1,
          rectRadius: 0.15,
          fill: { color: cardBgCol },
          line: { color: primaryCol, width: 2 },
        });

        slide.addText(slideItem.metric?.value || '99.9%', {
          x: 0.9,
          y: contentStartY + 0.3,
          w: 3.2,
          h: 0.9,
          fontSize: 34,
          fontFace: 'Helvetica',
          bold: true,
          color: primaryCol,
          align: 'center',
        });

        slide.addText(slideItem.metric?.label || 'Key Performance Benchmark', {
          x: 0.9,
          y: contentStartY + 1.25,
          w: 3.2,
          h: 0.45,
          fontSize: 12,
          fontFace: 'Helvetica',
          bold: true,
          color: textCol,
          align: 'center',
        });

        if (slideItem.metric?.trend) {
          slide.addShape(pptx.ShapeType.roundRect, {
            x: 1.2,
            y: contentStartY + 1.85,
            w: 2.6,
            h: 0.4,
            rectRadius: 0.1,
            fill: { color: bgCol },
            line: { color: secondaryCol, width: 0.5 },
          });

          slide.addText(`▲ ${slideItem.metric.trend}`, {
            x: 1.2,
            y: contentStartY + 1.88,
            w: 2.6,
            h: 0.35,
            fontSize: 10,
            fontFace: 'Helvetica',
            bold: true,
            color: secondaryCol,
            align: 'center',
          });
        }

        // Supporting Evidence Card
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 4.5,
          y: contentStartY,
          w: 4.7,
          h: 3.1,
          rectRadius: 0.15,
          fill: { color: cardBgCol },
          line: { color: mutedCol, width: 0.5 },
        });

        slide.addText('Quantitative Evidence & Validation', {
          x: 4.8,
          y: contentStartY + 0.25,
          w: 4.1,
          h: 0.3,
          fontSize: 12,
          fontFace: 'Helvetica',
          bold: true,
          color: primaryCol,
        });

        const metricBullets = (slideItem.bullets || []).map((b) => ({
          text: b,
          options: {
            fontSize: 10.5,
            fontFace: 'Helvetica',
            color: textCol,
            bullet: true,
            breakLine: true,
            paraSpaceAfter: 12,
          },
        }));

        slide.addText(metricBullets, {
          x: 4.8,
          y: contentStartY + 0.65,
          w: 4.1,
          h: 2.2,
          valign: 'top',
        });
        break;
      }

      case 'TIMELINE': {
        const milestones = slideItem.bullets || [
          'Phase 1: Architecture Ingress and Partitioning',
          'Phase 2: Redis Deduplication Layer Integration',
          'Phase 3: Production Rollout and SLA Monitoring',
        ];

        const cardWidth = 8.4 / Math.min(milestones.length, 3);
        milestones.slice(0, 3).forEach((milestone, mIdx) => {
          const cardX = 0.8 + mIdx * (cardWidth + 0.15);
          slide.addShape(pptx.ShapeType.roundRect, {
            x: cardX,
            y: contentStartY,
            w: cardWidth - 0.15,
            h: 3.1,
            rectRadius: 0.15,
            fill: { color: cardBgCol },
            line: { color: mIdx === 0 ? primaryCol : secondaryCol, width: 1.5 },
          });

          slide.addText(`STAGE 0${mIdx + 1}`, {
            x: cardX + 0.2,
            y: contentStartY + 0.2,
            w: cardWidth - 0.55,
            h: 0.25,
            fontSize: 10,
            fontFace: 'Helvetica',
            bold: true,
            color: secondaryCol,
          });

          slide.addText(milestone, {
            x: cardX + 0.2,
            y: contentStartY + 0.55,
            w: cardWidth - 0.55,
            h: 2.3,
            fontSize: 11,
            fontFace: 'Helvetica',
            color: textCol,
            valign: 'top',
          });
        });
        break;
      }

      case 'CONCLUSION':
      default: {
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: contentStartY,
          w: 8.4,
          h: 3.1,
          rectRadius: 0.15,
          fill: { color: cardBgCol },
          line: { color: primaryCol, width: 1.5 },
        });

        slide.addText('Executive Recommendations & Immediate Actions', {
          x: 1.1,
          y: contentStartY + 0.2,
          w: 7.8,
          h: 0.35,
          fontSize: 13,
          fontFace: 'Helvetica',
          bold: true,
          color: primaryCol,
        });

        const conclusionBullets = (slideItem.bullets || []).map((b) => ({
          text: b,
          options: {
            fontSize: 11.5,
            fontFace: 'Helvetica',
            color: textCol,
            bullet: true,
            breakLine: true,
            paraSpaceAfter: 12,
          },
        }));

        slide.addText(conclusionBullets, {
          x: 1.1,
          y: contentStartY + 0.65,
          w: 7.8,
          h: 2.2,
          valign: 'top',
        });
        break;
      }
    }

    // Embedded AI Visual / Business Chart (if present)
    if (slideItem.imageUrl && slideItem.imageUrl.startsWith('data:image')) {
      try {
        slide.addImage({
          data: slideItem.imageUrl,
          x: 5.6,
          y: contentStartY + 0.15,
          w: 3.6,
          h: 2.8,
        });
      } catch (imgErr) {
        console.warn('Could not embed slide image into PPTX:', imgErr);
      }
    }

    // Callout Footer Card (if present)
    if (slideItem.callout) {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8,
        y: 4.88,
        w: 8.4,
        h: 0.42,
        rectRadius: 0.08,
        fill: { color: primaryCol },
        line: { color: primaryCol, width: 0 },
      });

      slide.addText(`💡 ${slideItem.callout}`, {
        x: 1.0,
        y: 4.93,
        w: 8.0,
        h: 0.32,
        fontSize: 9.5,
        fontFace: 'Helvetica',
        bold: true,
        color: 'FFFFFF',
        valign: 'middle',
      });
    }

    // Footer Branding
    if (options.includeFooter) {
      slide.addText(`LOGITIX AI • ${deck.title}`, {
        x: 0.8,
        y: 5.35,
        w: 6.0,
        h: 0.2,
        fontSize: 8,
        fontFace: 'Helvetica',
        color: mutedCol,
      });

      slide.addText(`${index + 1}`, {
        x: 8.4,
        y: 5.35,
        w: 0.8,
        h: 0.2,
        fontSize: 8,
        fontFace: 'Helvetica',
        bold: true,
        color: secondaryCol,
        align: 'right',
      });
    }

    // Speaker Notes
    if (options.includeNotes && slideItem.notes) {
      slide.addNotes(slideItem.notes);
    }
  });

  const filename = `${sanitizeFilename(deck.title)}.pptx`;
  await pptx.writeFile({ fileName: filename });
}

/**
 * Exports a presentation deck plan to a high-fidelity PDF file using jsPDF
 */
export async function exportDeckToPDF(
  deck: PresentationDeckPlan,
  options: ExportOptions = { includeNotes: true, includeFooter: true }
): Promise<void> {
  // 16:9 widescreen format (960pt x 540pt)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: [960, 540],
  });

  const palette = getThemePalette(
    deck.conditions?.theme,
    deck.conditions?.customPalette || deck.palette
  );

  // Helper to parse hex to RGB
  const hexToRgb = (hex: string) => {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  };

  const primaryRgb = hexToRgb(palette.primaryHex);
  const secondaryRgb = hexToRgb(palette.secondaryHex);
  const bgRgb = hexToRgb(palette.bgHex);
  const cardBgRgb = hexToRgb(palette.cardBgHex);
  const textRgb = hexToRgb(palette.textPrimaryHex);
  const mutedRgb = hexToRgb(palette.textSecondaryHex);
  const accentRgb = hexToRgb(palette.accentHex);

  deck.slides.forEach((slideItem, index) => {
    if (index > 0) {
      doc.addPage([960, 540], 'landscape');
    }

    // Background Canvas
    doc.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
    doc.rect(0, 0, 960, 540, 'F');

    // Top Accent Border
    doc.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    doc.rect(0, 0, 960, 8, 'F');

    // Slide Tag & Category
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b);
    doc.text(
      `SLIDE ${index + 1} OF ${deck.slides.length} • ${slideItem.layout.replace(/_/g, ' ')}`,
      50,
      35
    );

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(textRgb.r, textRgb.g, textRgb.b);
    const titleLines = doc.splitTextToSize(slideItem.title, 860);
    doc.text(titleLines, 50, 68);

    const titleHeight = titleLines.length * 26;
    let currentY = 70 + titleHeight;

    // Subtitle
    if (slideItem.subtitle) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(12);
      doc.setTextColor(mutedRgb.r, mutedRgb.g, mutedRgb.b);
      doc.text(slideItem.subtitle, 50, currentY);
      currentY += 24;
    } else {
      currentY += 10;
    }

    // Render by Layout Type
    switch (slideItem.layout) {
      case 'TITLE': {
        // Main Container Card
        doc.setFillColor(cardBgRgb.r, cardBgRgb.g, cardBgRgb.b);
        doc.setDrawColor(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b);
        doc.setLineWidth(1.5);
        doc.roundedRect(50, currentY, 860, 290, 10, 10, 'FD');

        // Bullets
        let bulletY = currentY + 45;
        (slideItem.bullets || []).forEach((b) => {
          doc.setFillColor(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b);
          doc.circle(75, bulletY - 4, 3, 'F');

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(13);
          doc.setTextColor(textRgb.r, textRgb.g, textRgb.b);
          const lines = doc.splitTextToSize(b, 780);
          doc.text(lines, 90, bulletY);
          bulletY += lines.length * 20 + 16;
        });
        break;
      }

      case 'TWO_COLUMNS': {
        const colWidth = 415;
        const colHeight = 290;

        // Left Column Card
        doc.setFillColor(cardBgRgb.r, cardBgRgb.g, cardBgRgb.b);
        doc.setDrawColor(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b);
        doc.setLineWidth(1);
        doc.roundedRect(50, currentY, colWidth, colHeight, 10, 10, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
        doc.text('Core Architecture & Context', 70, currentY + 30);

        let leftY = currentY + 60;
        const leftItems = slideItem.leftColumn || slideItem.bullets?.slice(0, 3) || [];
        leftItems.forEach((item) => {
          doc.setFillColor(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b);
          doc.circle(75, leftY - 3, 2.5, 'F');

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10.5);
          doc.setTextColor(textRgb.r, textRgb.g, textRgb.b);
          const lines = doc.splitTextToSize(item, 355);
          doc.text(lines, 88, leftY);
          leftY += lines.length * 16 + 12;
        });

        // Right Column Card
        doc.setFillColor(cardBgRgb.r, cardBgRgb.g, cardBgRgb.b);
        doc.setDrawColor(accentRgb.r, accentRgb.g, accentRgb.b);
        doc.setLineWidth(1);
        doc.roundedRect(495, currentY, colWidth, colHeight, 10, 10, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b);
        doc.text('Impact & Strategic Capabilities', 515, currentY + 30);

        let rightY = currentY + 60;
        const rightItems = slideItem.rightColumn || slideItem.bullets?.slice(3) || [];
        rightItems.forEach((item) => {
          doc.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b);
          doc.circle(520, rightY - 3, 2.5, 'F');

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10.5);
          doc.setTextColor(textRgb.r, textRgb.g, textRgb.b);
          const lines = doc.splitTextToSize(item, 355);
          doc.text(lines, 533, rightY);
          rightY += lines.length * 16 + 12;
        });
        break;
      }

      case 'METRIC_HIGHLIGHT': {
        // KPI Metric Box
        doc.setFillColor(cardBgRgb.r, cardBgRgb.g, cardBgRgb.b);
        doc.setDrawColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
        doc.setLineWidth(2);
        doc.roundedRect(50, currentY, 320, 290, 10, 10, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(36);
        doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
        doc.text(slideItem.metric?.value || '99.9%', 210, currentY + 90, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(textRgb.r, textRgb.g, textRgb.b);
        doc.text(slideItem.metric?.label || 'Key Performance Benchmark', 210, currentY + 130, {
          align: 'center',
        });

        if (slideItem.metric?.trend) {
          doc.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
          doc.setDrawColor(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b);
          doc.setLineWidth(0.5);
          doc.roundedRect(80, currentY + 160, 260, 36, 6, 6, 'FD');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b);
          doc.text(`▲ ${slideItem.metric.trend}`, 210, currentY + 183, { align: 'center' });
        }

        // Supporting Details Card
        doc.setFillColor(cardBgRgb.r, cardBgRgb.g, cardBgRgb.b);
        doc.setDrawColor(mutedRgb.r, mutedRgb.g, mutedRgb.b);
        doc.setLineWidth(0.5);
        doc.roundedRect(390, currentY, 520, 290, 10, 10, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
        doc.text('Quantitative Evidence & Validation', 415, currentY + 30);

        let metricBulletY = currentY + 65;
        (slideItem.bullets || []).forEach((b) => {
          doc.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
          doc.circle(420, metricBulletY - 3, 2.5, 'F');

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(11);
          doc.setTextColor(textRgb.r, textRgb.g, textRgb.b);
          const lines = doc.splitTextToSize(b, 460);
          doc.text(lines, 435, metricBulletY);
          metricBulletY += lines.length * 17 + 12;
        });
        break;
      }

      case 'TIMELINE': {
        const milestones = slideItem.bullets || [
          'Phase 1: Architecture Ingress and Partitioning',
          'Phase 2: Redis Deduplication Layer Integration',
          'Phase 3: Production Rollout and SLA Monitoring',
        ];
        const cardWidth = (860 - (milestones.slice(0, 3).length - 1) * 20) / Math.min(milestones.length, 3);

        milestones.slice(0, 3).forEach((m, mIdx) => {
          const mX = 50 + mIdx * (cardWidth + 20);
          doc.setFillColor(cardBgRgb.r, cardBgRgb.g, cardBgRgb.b);
          doc.setDrawColor(mIdx === 0 ? primaryRgb.r : secondaryRgb.r, mIdx === 0 ? primaryRgb.g : secondaryRgb.g, mIdx === 0 ? primaryRgb.b : secondaryRgb.b);
          doc.setLineWidth(1.5);
          doc.roundedRect(mX, currentY, cardWidth, 290, 10, 10, 'FD');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b);
          doc.text(`STAGE 0${mIdx + 1}`, mX + 20, currentY + 30);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(11);
          doc.setTextColor(textRgb.r, textRgb.g, textRgb.b);
          const lines = doc.splitTextToSize(m, cardWidth - 40);
          doc.text(lines, mX + 20, currentY + 60);
        });
        break;
      }

      case 'CONCLUSION':
      default: {
        doc.setFillColor(cardBgRgb.r, cardBgRgb.g, cardBgRgb.b);
        doc.setDrawColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
        doc.setLineWidth(1.5);
        doc.roundedRect(50, currentY, 860, 290, 10, 10, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
        doc.text('Executive Recommendations & Immediate Actions', 75, currentY + 30);

        let conclusionBulletY = currentY + 65;
        (slideItem.bullets || []).forEach((b) => {
          doc.setFillColor(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b);
          doc.circle(80, conclusionBulletY - 3, 2.5, 'F');

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(11.5);
          doc.setTextColor(textRgb.r, textRgb.g, textRgb.b);
          const lines = doc.splitTextToSize(b, 780);
          doc.text(lines, 95, conclusionBulletY);
          conclusionBulletY += lines.length * 18 + 14;
        });
        break;
      }
    }

    // Embedded AI Visual / Business Chart (if present)
    if (slideItem.imageUrl && slideItem.imageUrl.startsWith('data:image')) {
      try {
        doc.addImage(slideItem.imageUrl, 'PNG', 560, currentY + 10, 340, 210);
      } catch (imgErr) {
        console.warn('Could not embed slide image into PDF:', imgErr);
      }
    }

    // Callout Footer Card
    if (slideItem.callout) {
      doc.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      doc.roundedRect(50, 475, 860, 32, 6, 6, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(255, 255, 255);
      doc.text(`* ${slideItem.callout}`, 65, 495);
    }

    // Footer Branding
    if (options.includeFooter) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(mutedRgb.r, mutedRgb.g, mutedRgb.b);
      doc.text(`LOGITIX AI • ${deck.title}`, 50, 525);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b);
      doc.text(`${index + 1}`, 900, 525, { align: 'right' });
    }
  });

  const filename = `${sanitizeFilename(deck.title)}.pdf`;
  doc.save(filename);
}

/**
 * Downloads a presentation directly from Google Slides export endpoint
 * format: 'pdf' | 'pptx'
 */
export function getGoogleSlidesExportUrl(presentationId: string, format: 'pdf' | 'pptx'): string {
  return `https://docs.google.com/presentation/d/${presentationId}/export/${format}`;
}
