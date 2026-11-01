import {
  PresentationDeckPlan,
  PresentationConditions,
  SlideItem,
  TemplateCategoryType,
  SlideTemplateDefinition,
  ColorPaletteSuggestion,
  TypographyStyleSuggestion,
} from '../types';
import { buildGoogleSlidesThemePalette } from './topicStyleService';

/**
 * Pre-defined professional slide layout templates (Executive, Technical, Creative)
 */
export const SLIDE_TEMPLATES: Record<TemplateCategoryType, SlideTemplateDefinition> = {
  Executive: {
    id: 'Executive',
    title: 'Executive Briefing',
    tagline: 'C-Suite & Boardroom Strategy',
    badge: 'Executive / Board',
    description: 'Tailored for leadership alignment, strategic ROI, capital allocation, high-impact KPI highlights, and clear governance decisions.',
    recommendedTheme: 'Modern Indigo',
    recommendedTone: 'Strategic & Authoritative',
    recommendedAudience: 'Executive / Board',
    accentColor: '#1a146b',
    bgGradient: 'from-[#1a146b]/10 via-[#312e81]/5 to-transparent',
    layoutSequence: [
      { slideNumber: 1, title: 'Strategic Thesis & Executive Mandate', layout: 'TITLE', purpose: 'Frame business context, stakes, and leadership objective.' },
      { slideNumber: 2, title: 'Market Landscape & Strategic Realities', layout: 'TWO_COLUMNS', purpose: 'Synthesize market opportunities vs operational friction.' },
      { slideNumber: 3, title: 'Key Performance Indicators & ROI Metrics', layout: 'METRIC_HIGHLIGHT', purpose: 'Quantifiable operational efficiency and business returns.' },
      { slideNumber: 4, title: 'Execution Milestones & Strategic Horizon', layout: 'TIMELINE', purpose: 'Phased roadmap delivery with accountable dates.' },
      { slideNumber: 5, title: 'Board Decision & Resource Allocation', layout: 'CONCLUSION', purpose: 'Crisp strategic takeaways and approval requests.' },
    ],
    suggestedPrompts: [
      'Distributed Outbox Architecture Executive Review: 50,000 req/s, 16 Shards, and ROI Impact',
      'Enterprise AI Platform Strategy: Multi-Model Consensus and Cost-to-Serve Optimization',
      'Q4 Digital Transformation & Zero-Trust Cloud Migration Blueprint',
    ],
  },
  Technical: {
    id: 'Technical',
    title: 'Technical Architecture',
    tagline: 'Engineering & Systems Topology',
    badge: 'Technical Engineering',
    description: 'Designed for engineering deep dives, distributed systems topologies, throughput & latency SLAs, failure modes, and protocol specifications.',
    recommendedTheme: 'Cobalt Enterprise',
    recommendedTone: 'Technical & Rigorous',
    recommendedAudience: 'Technical Engineering',
    accentColor: '#0284c7',
    bgGradient: 'from-sky-900/10 via-sky-500/5 to-transparent',
    layoutSequence: [
      { slideNumber: 1, title: 'System Architecture Specification', layout: 'TITLE', purpose: 'Establish subsystem scope, interfaces, and throughput envelope.' },
      { slideNumber: 2, title: 'Distributed Topology & Component Pillars', layout: 'TWO_COLUMNS', purpose: 'Contrast ingress layers, sharded databases, and event brokers.' },
      { slideNumber: 3, title: 'Throughput, P99 Latency & SLA Envelopes', layout: 'METRIC_HIGHLIGHT', purpose: 'Telemetry benchmarks: 50k req/s, P99 < 35ms, 99.4% cache hit.' },
      { slideNumber: 4, title: 'End-to-End Processing Pipeline & Event Stream', layout: 'TIMELINE', purpose: 'CDC WAL tailing, sliding window dedup, and consumer partitions.' },
      { slideNumber: 5, title: 'Failure Mode Mitigations & High-Availability Directives', layout: 'CONCLUSION', purpose: 'Automated failover protocols and zero-data-loss guarantees.' },
    ],
    suggestedPrompts: [
      'High-Throughput Idempotent Distributed Outbox Architecture (50k req/s): 16 PostgreSQL Shards, Redis Dedup, and 256 Kafka Partitions',
      'Zero-Trust Distributed Storage Ingestion Engine: RFC-7233 Byte-Range Handlers & Circuit Breakers',
      'Real-Time PostgreSQL CDC Debezium WAL Replication Pipeline & Shard Rebalancing',
    ],
  },
  Creative: {
    id: 'Creative',
    title: 'Creative Pitch Deck',
    tagline: 'Visionary Storytelling & Growth',
    badge: 'Pitch & Innovation',
    description: 'Optimized for product showcases, investor pitch narratives, disruptive problem-solution framing, and visionary momentum.',
    recommendedTheme: 'Emerald Growth',
    recommendedTone: 'Inspiring & Visionary',
    recommendedAudience: 'Investors & VC',
    accentColor: '#059669',
    bgGradient: 'from-emerald-900/10 via-emerald-500/5 to-transparent',
    layoutSequence: [
      { slideNumber: 1, title: 'The Bold Vision: Unlocking Next-Gen AI Velocity', layout: 'TITLE', purpose: 'Hook audience with an inspiring thesis and paradigm shift.' },
      { slideNumber: 2, title: 'The Burning Problem vs. Our Breakthrough', layout: 'TWO_COLUMNS', purpose: 'Contrast legacy frustration with an elegant, irresistible alternative.' },
      { slideNumber: 3, title: 'Traction Velocity & Explosive Adoption', layout: 'METRIC_HIGHLIGHT', purpose: 'Highlight hyper-growth numbers, customer retention, and momentum.' },
      { slideNumber: 4, title: 'Product Evolution & Market Expansion', layout: 'TIMELINE', purpose: 'Chart the path from breakthrough MVP to categorical dominance.' },
      { slideNumber: 5, title: 'The Future Horizon & Strategic Partnership Call', layout: 'CONCLUSION', purpose: 'Close with an unforgettable vision and decisive call to action.' },
    ],
    suggestedPrompts: [
      'LOGITIX Multi-AI Executive Engine: The Autonomous Copilot for Enterprise Decision Velocity',
      'Next-Generation Edge AI: Real-Time Multimodal Intelligence for 1 Billion Users',
      'The Zero-Friction Enterprise Workflow Revolution: Autonomous Agents in Action',
    ],
  },
};

/**
 * Creates a new blank Google Slides presentation in the user's Google Drive
 */
export async function createGooglePresentation(
  accessToken: string,
  title: string
): Promise<{ presentationId: string; title: string }> {
  const res = await fetch('https://slides.googleapis.com/v1/presentations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title: title || 'Executive Presentation' }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Google Slides API create error (${res.status}): ${errorBody}`);
  }

  const data = await res.json();
  return {
    presentationId: data.presentationId,
    title: data.title || title,
  };
}

/**
 * Applies batch update requests to customize slides, layout, text and graphics
 */
export async function batchUpdatePresentation(
  accessToken: string,
  presentationId: string,
  requests: any[]
): Promise<any> {
  if (!requests || requests.length === 0) return { replies: [] };

  const res = await fetch(
    `https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    }
  );

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Google Slides batchUpdate error (${res.status}): ${errorBody}`);
  }

  return await res.json();
}

/**
 * Generates an AI slide visual (business chart, architecture diagram, or corporate illustration)
 */
export async function generateSlideVisual(params: {
  prompt: string;
  type?: 'illustration' | 'chart' | 'diagram';
  aspectRatio?: '16:9' | '4:3' | '1:1';
  style?: string;
  theme?: string;
  slideContext?: { title?: string; subtitle?: string; layout?: string };
}): Promise<{
  imageUrl: string;
  model: string;
  prompt: string;
  type: string;
  aspectRatio: string;
  style: string;
}> {
  const res = await fetch('/api/slides/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || `Server responded with status ${res.status}`);
  }

  return await res.json();
}

/**
 * Lists user's Google Slides presentations from Google Drive
 */
export async function listUserGoogleSlides(accessToken: string): Promise<
  Array<{
    id: string;
    name: string;
    modifiedTime: string;
    webViewLink?: string;
    thumbnailLink?: string;
  }>
> {
  try {
    const query = encodeURIComponent("mimeType='application/vnd.google-apps.presentation' and trashed=false");
    const fields = encodeURIComponent('files(id,name,modifiedTime,webViewLink,thumbnailLink)');
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=modifiedTime%20desc&pageSize=15`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!res.ok) {
      console.warn('Drive list presentations notice:', res.status);
      return [];
    }

    const data = await res.json();
    return data.files || [];
  } catch (err) {
    console.warn('Failed to list presentations from Google Drive:', err);
    return [];
  }
}

/**
 * Deletes a presentation from Google Drive (Requires explicit UI confirmation first!)
 */
export async function deletePresentationFromDrive(
  accessToken: string,
  fileId: string
): Promise<boolean> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return res.ok;
}

// Theme color definitions & palettes
function getThemePalette(theme: string) {
  const t = (theme || '').toLowerCase();
  if (t.includes('obsidian') || t.includes('dark')) {
    return {
      bg: { red: 0.08, green: 0.09, blue: 0.12 },
      titleText: { red: 0.96, green: 0.97, blue: 0.99 },
      bodyText: { red: 0.82, green: 0.85, blue: 0.90 },
      subText: { red: 0.65, green: 0.68, blue: 0.75 },
      accent: { red: 0.42, green: 0.40, blue: 0.98 }, // Electric Indigo
      cardBg: { red: 0.13, green: 0.14, blue: 0.18 },
      cardBorder: { red: 0.24, green: 0.25, blue: 0.32 },
      calloutBg: { red: 0.16, green: 0.17, blue: 0.22 },
    };
  }
  if (t.includes('emerald') || t.includes('growth')) {
    return {
      bg: { red: 0.98, green: 0.99, blue: 0.98 },
      titleText: { red: 0.06, green: 0.20, blue: 0.14 },
      bodyText: { red: 0.22, green: 0.30, blue: 0.26 },
      subText: { red: 0.35, green: 0.45, blue: 0.40 },
      accent: { red: 0.05, green: 0.60, blue: 0.38 }, // Emerald Green
      cardBg: { red: 0.93, green: 0.97, blue: 0.94 },
      cardBorder: { red: 0.72, green: 0.88, blue: 0.80 },
      calloutBg: { red: 0.90, green: 0.96, blue: 0.92 },
    };
  }
  if (t.includes('cobalt') || t.includes('enterprise')) {
    return {
      bg: { red: 0.98, green: 0.98, blue: 1.0 },
      titleText: { red: 0.08, green: 0.15, blue: 0.30 },
      bodyText: { red: 0.22, green: 0.28, blue: 0.40 },
      subText: { red: 0.38, green: 0.45, blue: 0.58 },
      accent: { red: 0.12, green: 0.40, blue: 0.90 }, // Cobalt Blue
      cardBg: { red: 0.93, green: 0.95, blue: 1.0 },
      cardBorder: { red: 0.74, green: 0.82, blue: 0.98 },
      calloutBg: { red: 0.91, green: 0.94, blue: 0.99 },
    };
  }
  if (t.includes('coral')) {
    return {
      bg: { red: 0.99, green: 0.98, blue: 0.98 },
      titleText: { red: 0.25, green: 0.08, blue: 0.08 },
      bodyText: { red: 0.35, green: 0.22, blue: 0.22 },
      subText: { red: 0.50, green: 0.38, blue: 0.38 },
      accent: { red: 0.92, green: 0.35, blue: 0.26 }, // Coral
      cardBg: { red: 0.99, green: 0.94, blue: 0.93 },
      cardBorder: { red: 0.96, green: 0.80, blue: 0.78 },
      calloutBg: { red: 0.98, green: 0.92, blue: 0.91 },
    };
  }
  // Modern Indigo (Default)
  return {
    bg: { red: 0.98, green: 0.98, blue: 1.0 },
    titleText: { red: 0.10, green: 0.08, blue: 0.42 },
    bodyText: { red: 0.25, green: 0.28, blue: 0.36 },
    subText: { red: 0.42, green: 0.44, blue: 0.52 },
    accent: { red: 0.18, green: 0.15, blue: 0.65 }, // Royal Indigo
    cardBg: { red: 0.94, green: 0.95, blue: 1.0 },
    cardBorder: { red: 0.75, green: 0.78, blue: 0.95 },
    calloutBg: { red: 0.93, green: 0.94, blue: 0.98 },
  };
}

/**
 * Converts a SlideItem into Google Slides API batchUpdate requests
 */
function createSlideRequests(
  slide: SlideItem,
  slideIndex: number,
  theme: string,
  customPalette?: ColorPaletteSuggestion,
  customTypography?: TypographyStyleSuggestion
): any[] {
  const slideId = `slide_${slideIndex + 1}_${Date.now()}`;
  const requests: any[] = [];
  const palette = customPalette
    ? buildGoogleSlidesThemePalette(customPalette)
    : getThemePalette(theme);
  const headlineFont = customTypography?.headlineFont || 'Montserrat';
  const bodyFont = customTypography?.bodyFont || 'Inter';

  // 1. Create blank slide
  requests.push({
    createSlide: {
      objectId: slideId,
      insertionIndex: slideIndex,
      slideLayoutReference: {
        predefinedLayout: 'BLANK',
      },
    },
  });

  // 2. Full Canvas Background
  const bannerId = `bg_${slideId}`;
  requests.push({
    createShape: {
      objectId: bannerId,
      shapeType: 'RECTANGLE',
      elementProperties: {
        pageObjectId: slideId,
        size: {
          width: { magnitude: 720, unit: 'PT' },
          height: { magnitude: 405, unit: 'PT' },
        },
        transform: {
          scaleX: 1,
          scaleY: 1,
          translateX: 0,
          translateY: 0,
          unit: 'PT',
        },
      },
    },
  });

  requests.push({
    updateShapeProperties: {
      objectId: bannerId,
      fields: 'shapeBackgroundFill.solidFill.color',
      shapeProperties: {
        shapeBackgroundFill: {
          solidFill: {
            color: { rgbColor: palette.bg },
          },
        },
      },
    },
  });

  // 3. Top Accent Stripe
  const stripeId = `stripe_${slideId}`;
  requests.push({
    createShape: {
      objectId: stripeId,
      shapeType: 'RECTANGLE',
      elementProperties: {
        pageObjectId: slideId,
        size: {
          width: { magnitude: 720, unit: 'PT' },
          height: { magnitude: 8, unit: 'PT' },
        },
        transform: {
          scaleX: 1,
          scaleY: 1,
          translateX: 0,
          translateY: 0,
          unit: 'PT',
        },
      },
    },
  });

  requests.push({
    updateShapeProperties: {
      objectId: stripeId,
      fields: 'shapeBackgroundFill.solidFill.color',
      shapeProperties: {
        shapeBackgroundFill: {
          solidFill: {
            color: { rgbColor: palette.accent },
          },
        },
      },
    },
  });

  // =========================================================================
  // SPECIALIZED LAYOUT RENDERING
  // =========================================================================

  if (slide.layout === 'TITLE' || slideIndex === 0) {
    // COVER SLIDE LAYOUT
    const titleBoxId = `tb_cover_${slideId}`;
    requests.push({
      createShape: {
        objectId: titleBoxId,
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: slideId,
          size: {
            width: { magnitude: 620, unit: 'PT' },
            height: { magnitude: 120, unit: 'PT' },
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: 50,
            translateY: 90,
            unit: 'PT',
          },
        },
      },
    });

    requests.push({
      insertText: {
        objectId: titleBoxId,
        text: `${slide.title}\n${slide.subtitle || 'Executive Strategic Briefing'}`,
        insertionIndex: 0,
      },
    });

    requests.push({
      updateTextStyle: {
        objectId: titleBoxId,
        fields: 'foregroundColor,fontSize,bold,fontFamily',
        textRange: { type: 'ALL' },
        style: {
          bold: true,
          fontSize: { magnitude: 28, unit: 'PT' },
          fontFamily: headlineFont,
          foregroundColor: {
            opaqueColor: { rgbColor: palette.titleText },
          },
        },
      },
    });

    // Subtitle card / bullets
    if (slide.bullets && slide.bullets.length > 0) {
      const coverBulletsId = `tb_cover_bullets_${slideId}`;
      requests.push({
        createShape: {
          objectId: coverBulletsId,
          shapeType: 'TEXT_BOX',
          elementProperties: {
            pageObjectId: slideId,
            size: {
              width: { magnitude: 620, unit: 'PT' },
              height: { magnitude: 110, unit: 'PT' },
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: 50,
              translateY: 220,
              unit: 'PT',
            },
          },
        },
      });

      requests.push({
        insertText: {
          objectId: coverBulletsId,
          text: slide.bullets.map((b) => `•  ${b}`).join('\n\n'),
          insertionIndex: 0,
        },
      });

      requests.push({
        updateTextStyle: {
          objectId: coverBulletsId,
          fields: 'foregroundColor,fontSize,fontFamily',
          textRange: { type: 'ALL' },
          style: {
            fontSize: { magnitude: 13, unit: 'PT' },
            fontFamily: bodyFont,
            foregroundColor: {
              opaqueColor: { rgbColor: palette.bodyText },
            },
          },
        },
      });
    }

    // Callout / Presenter Attribution at bottom
    if (slide.callout) {
      const coverCalloutId = `tb_cover_callout_${slideId}`;
      requests.push({
        createShape: {
          objectId: coverCalloutId,
          shapeType: 'TEXT_BOX',
          elementProperties: {
            pageObjectId: slideId,
            size: {
              width: { magnitude: 620, unit: 'PT' },
              height: { magnitude: 30, unit: 'PT' },
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: 50,
              translateY: 345,
              unit: 'PT',
            },
          },
        },
      });

      requests.push({
        insertText: {
          objectId: coverCalloutId,
          text: `✦ ${slide.callout}`,
          insertionIndex: 0,
        },
      });

      requests.push({
        updateTextStyle: {
          objectId: coverCalloutId,
          fields: 'foregroundColor,fontSize,fontFamily,italic',
          textRange: { type: 'ALL' },
          style: {
            fontSize: { magnitude: 10, unit: 'PT' },
            fontFamily: bodyFont,
            italic: true,
            foregroundColor: {
              opaqueColor: { rgbColor: palette.accent },
            },
          },
        },
      });
    }

    return requests;
  }

  // STANDARD / CONTENT SLIDES: Add Header Title Box
  const titleBoxId = `tb_${slideId}_title`;
  requests.push({
    createShape: {
      objectId: titleBoxId,
      shapeType: 'TEXT_BOX',
      elementProperties: {
        pageObjectId: slideId,
        size: {
          width: { magnitude: 620, unit: 'PT' },
          height: { magnitude: 45, unit: 'PT' },
        },
        transform: {
          scaleX: 1,
          scaleY: 1,
          translateX: 50,
          translateY: 28,
          unit: 'PT',
        },
      },
    },
  });

  requests.push({
    insertText: {
      objectId: titleBoxId,
      text: slide.title || `Slide ${slideIndex + 1}`,
      insertionIndex: 0,
    },
  });

  requests.push({
    updateTextStyle: {
      objectId: titleBoxId,
      fields: 'foregroundColor,fontSize,bold,fontFamily',
      textRange: { type: 'ALL' },
      style: {
        bold: true,
        fontSize: { magnitude: 22, unit: 'PT' },
        fontFamily: headlineFont,
        foregroundColor: {
          opaqueColor: { rgbColor: palette.titleText },
        },
      },
    },
  });

  // Subtitle line under title if present
  if (slide.subtitle) {
    const subtitleBoxId = `tb_${slideId}_sub`;
    requests.push({
      createShape: {
        objectId: subtitleBoxId,
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: slideId,
          size: {
            width: { magnitude: 620, unit: 'PT' },
            height: { magnitude: 25, unit: 'PT' },
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: 50,
            translateY: 68,
            unit: 'PT',
          },
        },
      },
    });

    requests.push({
      insertText: {
        objectId: subtitleBoxId,
        text: slide.subtitle,
        insertionIndex: 0,
      },
    });

    requests.push({
      updateTextStyle: {
        objectId: subtitleBoxId,
        fields: 'foregroundColor,fontSize,fontFamily,italic',
        textRange: { type: 'ALL' },
        style: {
          fontSize: { magnitude: 11, unit: 'PT' },
          fontFamily: bodyFont,
          italic: true,
          foregroundColor: {
            opaqueColor: { rgbColor: palette.subText },
          },
        },
      },
    });
  }

  // TWO_COLUMNS LAYOUT
  if (slide.layout === 'TWO_COLUMNS' || (slide.leftColumn && slide.rightColumn)) {
    const leftBoxId = `tb_col_left_${slideId}`;
    const rightBoxId = `tb_col_right_${slideId}`;

    const leftItems = (slide.leftColumn || []).map((b) => `• ${b}`).join('\n\n');
    const rightItems = (slide.rightColumn || []).map((b) => `• ${b}`).join('\n\n');

    // Left Column Card
    requests.push({
      createShape: {
        objectId: leftBoxId,
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: slideId,
          size: {
            width: { magnitude: 295, unit: 'PT' },
            height: { magnitude: 235, unit: 'PT' },
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: 50,
            translateY: 95,
            unit: 'PT',
          },
        },
      },
    });

    requests.push({
      insertText: {
        objectId: leftBoxId,
        text: `ARCHITECTURE PILLARS\n\n${leftItems || '• Sharded state distribution\n• Append-only outbox table\n• Local dual-write transaction'}`,
        insertionIndex: 0,
      },
    });

    requests.push({
      updateTextStyle: {
        objectId: leftBoxId,
        fields: 'foregroundColor,fontSize,fontFamily',
        textRange: { type: 'ALL' },
        style: {
          fontSize: { magnitude: 12, unit: 'PT' },
          fontFamily: bodyFont,
          foregroundColor: {
            opaqueColor: { rgbColor: palette.bodyText },
          },
        },
      },
    });

    // Right Column Card
    requests.push({
      createShape: {
        objectId: rightBoxId,
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: slideId,
          size: {
            width: { magnitude: 295, unit: 'PT' },
            height: { magnitude: 235, unit: 'PT' },
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: 375,
            translateY: 95,
            unit: 'PT',
          },
        },
      },
    });

    requests.push({
      insertText: {
        objectId: rightBoxId,
        text: `EXECUTION & DELIVERY\n\n${rightItems || '• Tier-1 Redis cluster cache\n• Debezium CDC streaming\n• Kafka partition auto-rebalancing'}`,
        insertionIndex: 0,
      },
    });

    requests.push({
      updateTextStyle: {
        objectId: rightBoxId,
        fields: 'foregroundColor,fontSize,fontFamily',
        textRange: { type: 'ALL' },
        style: {
          fontSize: { magnitude: 12, unit: 'PT' },
          fontFamily: bodyFont,
          foregroundColor: {
            opaqueColor: { rgbColor: palette.bodyText },
          },
        },
      },
    });
  } else {
    // STANDARD BODY CONTENT
    let bodyContent = '';
    if (slide.bullets && slide.bullets.length > 0) {
      bodyContent = slide.bullets.map((b) => `•  ${b}`).join('\n\n');
    }

    if (bodyContent.trim()) {
      const bodyBoxId = `tb_body_${slideId}`;
      requests.push({
        createShape: {
          objectId: bodyBoxId,
          shapeType: 'TEXT_BOX',
          elementProperties: {
            pageObjectId: slideId,
            size: {
              width: { magnitude: slide.metric ? 410 : 620, unit: 'PT' },
              height: { magnitude: 230, unit: 'PT' },
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: 50,
              translateY: 95,
              unit: 'PT',
            },
          },
        },
      });

      requests.push({
        insertText: {
          objectId: bodyBoxId,
          text: bodyContent,
          insertionIndex: 0,
        },
      });

      requests.push({
        updateTextStyle: {
          objectId: bodyBoxId,
          fields: 'foregroundColor,fontSize,fontFamily',
          textRange: { type: 'ALL' },
          style: {
            fontSize: { magnitude: 13, unit: 'PT' },
            fontFamily: bodyFont,
            foregroundColor: {
              opaqueColor: { rgbColor: palette.bodyText },
            },
          },
        },
      });
    }
  }

  // 5. Hero Metric Card if present
  if (slide.metric) {
    const metricBoxId = `tb_metric_${slideId}`;
    requests.push({
      createShape: {
        objectId: metricBoxId,
        shapeType: 'ROUNDED_RECTANGLE',
        elementProperties: {
          pageObjectId: slideId,
          size: {
            width: { magnitude: 195, unit: 'PT' },
            height: { magnitude: 140, unit: 'PT' },
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: 475,
            translateY: 110,
            unit: 'PT',
          },
        },
      },
    });

    requests.push({
      updateShapeProperties: {
        objectId: metricBoxId,
        fields: 'shapeBackgroundFill.solidFill.color,outline.outlineFill.solidFill.color',
        shapeProperties: {
          shapeBackgroundFill: {
            solidFill: {
              color: { rgbColor: palette.cardBg },
            },
          },
          outline: {
            outlineFill: {
              solidFill: {
                color: { rgbColor: palette.cardBorder },
              },
            },
          },
        },
      },
    });

    const metricText = `${slide.metric.value}\n${slide.metric.label}${
      slide.metric.trend ? `\n(${slide.metric.trend})` : ''
    }`;

    requests.push({
      insertText: {
        objectId: metricBoxId,
        text: metricText,
        insertionIndex: 0,
      },
    });

    requests.push({
      updateTextStyle: {
        objectId: metricBoxId,
        fields: 'foregroundColor,fontSize,bold,fontFamily',
        textRange: { type: 'ALL' },
        style: {
          fontSize: { magnitude: 20, unit: 'PT' },
          bold: true,
          fontFamily: headlineFont,
          foregroundColor: {
            opaqueColor: { rgbColor: palette.accent },
          },
        },
      },
    });
  }

  // 6. Strategic Takeaway Callout at the bottom
  if (slide.callout) {
    const calloutBoxId = `tb_callout_${slideId}`;
    requests.push({
      createShape: {
        objectId: calloutBoxId,
        shapeType: 'ROUNDED_RECTANGLE',
        elementProperties: {
          pageObjectId: slideId,
          size: {
            width: { magnitude: 620, unit: 'PT' },
            height: { magnitude: 34, unit: 'PT' },
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: 50,
            translateY: 342,
            unit: 'PT',
          },
        },
      },
    });

    requests.push({
      updateShapeProperties: {
        objectId: calloutBoxId,
        fields: 'shapeBackgroundFill.solidFill.color',
        shapeProperties: {
          shapeBackgroundFill: {
            solidFill: {
              color: { rgbColor: palette.calloutBg },
            },
          },
        },
      },
    });

    requests.push({
      insertText: {
        objectId: calloutBoxId,
        text: `💡 Key Takeaway: ${slide.callout}`,
        insertionIndex: 0,
      },
    });

    requests.push({
      updateTextStyle: {
        objectId: calloutBoxId,
        fields: 'foregroundColor,fontSize,fontFamily,italic',
        textRange: { type: 'ALL' },
        style: {
          fontSize: { magnitude: 10, unit: 'PT' },
          fontFamily: bodyFont,
          italic: true,
          foregroundColor: {
            opaqueColor: { rgbColor: palette.subText },
          },
        },
      },
    });
  }

  return requests;
}

/**
 * Builds the entire presentation in Google Slides from a PresentationDeckPlan
 */
export async function buildPresentationInGoogleSlides(
  accessToken: string,
  deckPlan: PresentationDeckPlan
): Promise<{
  presentationId: string;
  presentationUrl: string;
  embedUrl: string;
  title: string;
  slideCount: number;
}> {
  // 1. Create top-level presentation
  const { presentationId, title } = await createGooglePresentation(accessToken, deckPlan.title);

  // 2. Collect all batch update requests for all slides
  const allRequests: any[] = [];
  deckPlan.slides.forEach((slide, idx) => {
    const slideReqs = createSlideRequests(
      slide,
      idx,
      deckPlan.conditions.theme,
      deckPlan.conditions.customPalette || deckPlan.palette,
      deckPlan.conditions.customTypography || deckPlan.typography
    );
    allRequests.push(...slideReqs);
  });

  // 3. Execute batchUpdate
  if (allRequests.length > 0) {
    await batchUpdatePresentation(accessToken, presentationId, allRequests);
  }

  const presentationUrl = `https://docs.google.com/presentation/d/${presentationId}/edit`;
  const embedUrl = `https://docs.google.com/presentation/d/${presentationId}/embed?start=false&loop=false&delayms=3000`;

  return {
    presentationId,
    presentationUrl,
    embedUrl,
    title,
    slideCount: deckPlan.slides.length,
  };
}

/**
 * High-performance AI Slide Outline Generator based on prompt and conditions
 */
export async function generateSlideDeckOutline(
  prompt: string,
  conditions: PresentationConditions
): Promise<PresentationDeckPlan> {
  const deckId = `deck-${Date.now()}`;
  const targetSlideCount = Math.max(3, Math.min(15, conditions.slideCount || 5));

  try {
    // 1. Primary Attempt: Dedicated Gemini Presentation Endpoint
    const geminiRes = await fetch('/api/slides/generate-outline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, conditions }),
    });

    if (geminiRes.ok) {
      const parsed = await geminiRes.json();
      if (parsed && parsed.title && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
        return {
          id: deckId,
          title: parsed.title,
          subtitle: parsed.subtitle || `Crafted for ${conditions.audience}`,
          prompt,
          conditions,
          slides: parsed.slides.map((s: any, idx: number) => ({
            id: `slide-${idx + 1}-${Date.now()}`,
            slideNumber: idx + 1,
            title: s.title || `Slide ${idx + 1}`,
            subtitle: s.subtitle,
            bullets: Array.isArray(s.bullets) ? s.bullets : [],
            leftColumn: Array.isArray(s.leftColumn) ? s.leftColumn : undefined,
            rightColumn: Array.isArray(s.rightColumn) ? s.rightColumn : undefined,
            metric: s.metric,
            callout: s.callout,
            notes: s.notes,
            layout: s.layout || 'TITLE_AND_BODY',
          })),
          createdAt: new Date().toISOString(),
        };
      }
    }

    // 2. Secondary Attempt: Standard Chat Pipeline
    const systemInstruction = `You are a Principal Presentation Architect. Create a high-impact presentation deck plan.
Topic: "${prompt}"
Audience: ${conditions.audience}
Tone: ${conditions.tone}
Theme: ${conditions.theme}
Desired Slide Count: ${targetSlideCount}
Conditions / Guidelines: ${conditions.customConstraints || 'Ensure clear narrative arc, executive quantitative evidence, and actionable strategic takeaways.'}
Include Metrics: ${conditions.includeMetrics ? 'YES' : 'NO'}
Include Architecture: ${conditions.includeArchitecture ? 'YES' : 'NO'}

Respond ONLY with valid JSON in this exact structure:
{
  "title": "Title of presentation",
  "subtitle": "Subtitle or strategic thesis",
  "slides": [
    {
      "slideNumber": 1,
      "title": "Slide Title",
      "subtitle": "Short subtitle or takeaway",
      "layout": "TITLE" | "TITLE_AND_BODY" | "TWO_COLUMNS" | "METRIC_HIGHLIGHT" | "TIMELINE" | "CONCLUSION",
      "bullets": ["Key point 1", "Key point 2", "Key point 3"],
      "metric": { "value": "99.4%", "label": "Reliability Benchmark", "trend": "+14% YoY" },
      "callout": "Strategic takeaway or conclusion note",
      "notes": "Speaker notes for the presenter"
    }
  ]
}`;

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: systemInstruction,
        activeModel: 'gemini-3.1-flash-lite',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.reply || data.response || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.title && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
          return {
            id: deckId,
            title: parsed.title,
            subtitle: parsed.subtitle || `Crafted for ${conditions.audience}`,
            prompt,
            conditions,
            slides: parsed.slides.map((s: any, idx: number) => ({
              id: `slide-${idx + 1}-${Date.now()}`,
              slideNumber: idx + 1,
              title: s.title || `Slide ${idx + 1}`,
              subtitle: s.subtitle,
              bullets: Array.isArray(s.bullets) ? s.bullets : [],
              leftColumn: Array.isArray(s.leftColumn) ? s.leftColumn : undefined,
              rightColumn: Array.isArray(s.rightColumn) ? s.rightColumn : undefined,
              metric: s.metric,
              callout: s.callout,
              notes: s.notes,
              layout: s.layout || 'TITLE_AND_BODY',
            })),
            createdAt: new Date().toISOString(),
          };
        }
      }
    }
  } catch (err) {
    console.warn('AI Slide outline generation fallback to executive template:', err);
  }

  // Graceful Template Fallback
  return generateDefaultDeckByTemplate(prompt, conditions, deckId, targetSlideCount);
}

function generateDefaultDeckByTemplate(
  prompt: string,
  conditions: PresentationConditions,
  deckId: string,
  slideCount: number
): PresentationDeckPlan {
  const category = conditions.templateCategory || 'Executive';

  if (category === 'Technical') {
    const technicalSlides: SlideItem[] = [
      {
        id: `slide-1-${deckId}`,
        slideNumber: 1,
        title: prompt.length > 55 ? prompt.slice(0, 52) + '...' : prompt,
        subtitle: `Systems Architecture & Engineering Specification • ${conditions.audience}`,
        layout: 'TITLE',
        bullets: [
          'Distributed System Topology & Ingestion Partitioning',
          'CDC WAL Tailing, Redis Dedup & Event Stream Architecture',
          'P99 Latency SLAs, Throughput Envelopes & Automated Failover',
        ],
        callout: 'Production Systems Engineering Specification • 50k req/s SLA',
        notes: 'Establish system scope, throughput requirements, and resiliency guarantees.',
      },
      {
        id: `slide-2-${deckId}`,
        slideNumber: 2,
        title: 'Distributed Topology & Component Pillars',
        subtitle: 'Sharded Persistence & Asynchronous Event Ingestion',
        layout: 'TWO_COLUMNS',
        leftColumn: [
          '16 Independent PostgreSQL Shards with tenant hash routing',
          'Dual-write transactional outbox pattern inside local ACID boundary',
          'Append-only log architecture eliminating row-level lock contention',
        ],
        rightColumn: [
          'Tier-1 Redis sliding window lease deduplication (<0.8ms)',
          'Asynchronous CDC WAL tailing with Debezium connector',
          '256 Kafka partition consumer group with automated rebalancing',
        ],
        callout: 'Decouples database commit latency from broker transport backpressure.',
        notes: 'Walk through the two-tier decoupling architecture between OLTP and streaming tiers.',
      },
      {
        id: `slide-3-${deckId}`,
        slideNumber: 3,
        title: 'Throughput & P99 Latency Telemetry',
        subtitle: 'Real-Time Benchmarks Under 50,000 req/s Ingress',
        layout: 'METRIC_HIGHLIGHT',
        metric: {
          value: '50,000 /s',
          label: 'Ingress Throughput (req/s)',
          trend: 'P99 Latency < 31.4ms',
        },
        bullets: [
          'Tier-1 Redis sliding window deduplication hit rate verified at 99.42%.',
          'Outbox-to-broker publish delay sustained under 210ms across all 16 shards.',
          'Zero message loss or duplication during simulated primary shard failover.',
        ],
        callout: 'P99 latency stays strictly below 35ms even during 25% traffic surges.',
        notes: 'Highlight quantitative telemetry gathered across live benchmark runs.',
      },
      {
        id: `slide-4-${deckId}`,
        slideNumber: 4,
        title: 'End-to-End Processing Pipeline',
        subtitle: 'CDC Event Lifecycle & Partition Distribution Flow',
        layout: 'TIMELINE',
        bullets: [
          'Stage 1: Dual-Write Outbox Commit (ACID transaction boundary with deterministic UUIDv7)',
          'Stage 2: CDC Debezium WAL Tailing & Event Stream Extraction with zero polling overhead',
          'Stage 3: Kafka Broker Ingestion, 256 Partition Fan-Out, and Sliding Window Deduplication',
        ],
        callout: 'Automated circuit breakers isolate lagging consumers without affecting ingress paths.',
        notes: 'Detail the event lifecycle and explain how replication lag is kept below 250ms.',
      },
      {
        id: `slide-5-${deckId}`,
        slideNumber: 5,
        title: 'High-Availability & Failover Directives',
        subtitle: 'Self-Healing Topology & Automated Operational Recovery',
        layout: 'CONCLUSION',
        bullets: [
          'Standby replica promotion executes in under 12 seconds with zero uncommitted transactions.',
          'Automated consumer group rebalancing dynamically redistributes partitions upon broker failure.',
          'Dead-letter queue re-drive pipeline with exponential backoff and jitter prevents poison pills.',
        ],
        callout: 'Guarantees zero data loss, strict idempotency, and continuous SLA telemetry.',
        notes: 'Review operational playbooks, monitoring dashboards, and disaster recovery procedures.',
      },
    ];

    return {
      id: deckId,
      title: prompt || 'Technical Architecture Specification',
      subtitle: `Prepared for ${conditions.audience}`,
      prompt,
      conditions,
      slides: technicalSlides.slice(0, slideCount),
      createdAt: new Date().toISOString(),
    };
  }

  if (category === 'Creative') {
    const creativeSlides: SlideItem[] = [
      {
        id: `slide-1-${deckId}`,
        slideNumber: 1,
        title: prompt.length > 55 ? prompt.slice(0, 52) + '...' : prompt,
        subtitle: `Visionary Strategy & Innovation Pitch • ${conditions.audience}`,
        layout: 'TITLE',
        bullets: [
          'The Bold Paradigm Shift in Autonomous Enterprise Intelligence',
          'Solving the Core Friction with Next-Generation AI Consensus',
          'Compounding Growth Velocity and Market Leadership Horizon',
        ],
        callout: 'Crafted for Investors, Visionaries & Forward-Thinking Teams',
        notes: 'Hook the room with an inspiring vision and frame the scale of the opportunity.',
      },
      {
        id: `slide-2-${deckId}`,
        slideNumber: 2,
        title: 'The Burning Problem vs. Our Breakthrough',
        subtitle: 'Transforming Operational Complexity into Autonomous Velocity',
        layout: 'TWO_COLUMNS',
        leftColumn: [
          'Fragmented enterprise toolchains causing cognitive fatigue and high error rates',
          'Brittle manual handoffs with delayed response times and lost context',
          'Legacy single-model AI pipelines that lack consensus validation and hallucinate',
        ],
        rightColumn: [
          'Unified Multi-AI Consensus Engine orchestrating Gemini, Claude, and Manus',
          'Zero-data-loss outbox pipeline processing 50k requests/sec with instant telemetry',
          'VoiceSpark real-time audio intelligence and automated Google Slides deliverables',
        ],
        callout: 'Compresses 48 hours of manual analysis into sub-second autonomous consensus.',
        notes: 'Emphasize the stark contrast between legacy frustration and our effortless solution.',
      },
      {
        id: `slide-3-${deckId}`,
        slideNumber: 3,
        title: 'Hyper-Growth Velocity & Market Momentum',
        subtitle: 'Exponential Customer Adoption & Unrivaled Stickiness',
        layout: 'METRIC_HIGHLIGHT',
        metric: {
          value: '+340% YoY',
          label: 'Platform Adoption Velocity',
          trend: '99.4% Net Retention',
        },
        bullets: [
          'Rapid organic viral expansion across Fortune 500 engineering and strategy teams.',
          'Over 50,000 requests processed per second with zero data loss or downtime.',
          'Net Promoter Score of 88 among executives, engineering leads, and innovators.',
        ],
        callout: 'Compounding network effects cement categorical dominance in enterprise AI.',
        notes: 'Showcase explosive traction and highlight user retention metrics.',
      },
      {
        id: `slide-4-${deckId}`,
        slideNumber: 4,
        title: 'Product Evolution & Expansion Roadmap',
        subtitle: 'The Phased Journey to Categorical Category Dominance',
        layout: 'TIMELINE',
        bullets: [
          'Chapter 1: Multi-Model Consensus Engine & Real-Time Semantic Context Memory',
          'Chapter 2: Autonomous Manus Task Execution & VoiceSpark Audio Intelligence',
          'Chapter 3: Global Ecosystem Rollout, Enterprise Integrations & Autonomous Swarms',
        ],
        callout: 'Building the foundational intelligence operating system for the next century.',
        notes: 'Chart the path forward and inspire confidence in long-term platform defensibility.',
      },
      {
        id: `slide-5-${deckId}`,
        slideNumber: 5,
        title: 'The Future Horizon: Join the Revolution',
        subtitle: 'Decisive Action & Strategic Opportunity Framing',
        layout: 'CONCLUSION',
        bullets: [
          'Partner with the category-defining leaders in autonomous enterprise systems.',
          'Accelerate innovation cycles by 10x while maintaining bulletproof data integrity.',
          'Unlock unprecedented decision velocity and organizational superpowers today.',
        ],
        callout: 'The future of autonomous enterprise intelligence is here. Let’s lead it together.',
        notes: 'Deliver a high-conviction closing call to action and invite partnership.',
      },
    ];

    return {
      id: deckId,
      title: prompt || 'Creative Innovation Pitch',
      subtitle: `Prepared for ${conditions.audience}`,
      prompt,
      conditions,
      slides: creativeSlides.slice(0, slideCount),
      createdAt: new Date().toISOString(),
    };
  }

  // Default: Executive Template
  const executiveSlides: SlideItem[] = [
    {
      id: `slide-1-${deckId}`,
      slideNumber: 1,
      title: prompt.length > 55 ? prompt.slice(0, 52) + '...' : prompt,
      subtitle: `Executive Briefing & Strategic Synthesis • ${conditions.audience}`,
      layout: 'TITLE',
      bullets: [
        'Strategic Mandate & Problem Framing',
        'Architecture, Execution & Technical Milestones',
        'Quantitative Impact & Delivery Horizon',
      ],
      callout: 'Prepared with LOGITIX AI Executive Synthesis Engine',
      notes: 'Welcome stakeholders. Set context on core objectives and measurable outcomes.',
    },
    {
      id: `slide-2-${deckId}`,
      slideNumber: 2,
      title: 'Current Landscape & Strategic Realities',
      subtitle: 'Market Dynamics & Operational Bottlenecks',
      layout: 'TWO_COLUMNS',
      leftColumn: [
        'Legacy monolithic architectures create scaling plateaus and high latency variance',
        'Data consistency vulnerabilities across distributed boundaries demand zero-loss design',
        'Rising operational overhead requires automated state tracking and strict governance',
      ],
      rightColumn: [
        'Decoupled outbox architecture enables linear horizontal scalability across 16 shards',
        'Sub-millisecond deduplication guarantees strict idempotency at 50,000 req/sec',
        'Automated real-time telemetry provides complete visibility into SLA compliance',
      ],
      callout: 'Eliminates single points of failure while unlocking 10x capacity expansion.',
      notes: 'Anchor the problem in tangible operational and business impact.',
    },
    {
      id: `slide-3-${deckId}`,
      slideNumber: 3,
      title: 'Key Performance Indicators & ROI Metrics',
      subtitle: 'Quantifiable Operational Impact & Capital Efficiency',
      layout: 'METRIC_HIGHLIGHT',
      metric: {
        value: '50,000 /s',
        label: 'Ingress Throughput (req/s)',
        trend: '99.4% Dedup Cache Hit Rate',
      },
      bullets: [
        'Ingress P99 Latency maintained strictly under 35ms across all traffic surges.',
        'Outbox-to-broker event publishing lag verified under 250ms SLA envelope.',
        '100% data durability verified under graceful failover scenarios with zero data loss.',
      ],
      callout: 'Delivers 10x capacity expansion with zero additional database dead-tuple bloat.',
      notes: 'Review performance numbers, cost savings, and SLA adherence.',
    },
    {
      id: `slide-4-${deckId}`,
      slideNumber: 4,
      title: 'Strategic Delivery Horizon & Milestones',
      subtitle: 'Phased Implementation Roadmap & Governance',
      layout: 'TIMELINE',
      bullets: [
        'Phase 1: Deploy sharded outbox partitions and verify replication slot stability',
        'Phase 2: Enable Tier-1 Redis cluster deduplication with 24h lease windows',
        'Phase 3: Connect enterprise event bus with dead-letter queue circuit breakers',
      ],
      callout: 'On schedule for production rollout with continuous SLA telemetry validation.',
      notes: 'Review execution phases, milestone deliverables, and ownership accountability.',
    },
    {
      id: `slide-5-${deckId}`,
      slideNumber: 5,
      title: 'Board Decision & Resource Allocation',
      subtitle: 'Immediate Strategic Priorities & Next Steps',
      layout: 'CONCLUSION',
      bullets: [
        'Approve production rollout plan for high-throughput idempotent outbox architecture.',
        'Allocate operational resources for multi-region replication and automated disaster recovery.',
        'Establish automated compliance reporting and real-time SLA breach alerting.',
      ],
      callout: 'Ready for executive sign-off and continuous production deployment.',
      notes: 'Solicit feedback and secure executive alignment on milestone approval.',
    },
  ];

  return {
    id: deckId,
    title: prompt || 'Executive Presentation Deck',
    subtitle: `Prepared for ${conditions.audience}`,
    prompt,
    conditions,
    slides: executiveSlides.slice(0, slideCount),
    createdAt: new Date().toISOString(),
  };
}
