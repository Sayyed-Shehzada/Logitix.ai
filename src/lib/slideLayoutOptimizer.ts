import {
  PresentationDeckPlan,
  SlideItem,
  TemplateCategoryType,
  SlideLayoutType,
  SlideDensityAnalysis,
  LayoutOptimizationSuggestion,
  DeckOptimizationReport,
  LayoutOptimizationActionType,
} from '../types';

/**
 * Recommended capacity thresholds per layout type
 * Based on 16:9 widescreen presentation layout container bounds
 */
interface LayoutCapacityRules {
  maxBullets: number;
  maxTotalChars: number;
  maxBulletsWithImage: number;
  maxTotalCharsWithImage: number;
  maxColumnBullets: number;
}

const LAYOUT_RULES: Record<SlideLayoutType, LayoutCapacityRules> = {
  TITLE: {
    maxBullets: 2,
    maxTotalChars: 180,
    maxBulletsWithImage: 1,
    maxTotalCharsWithImage: 120,
    maxColumnBullets: 0,
  },
  TITLE_AND_BODY: {
    maxBullets: 4,
    maxTotalChars: 320,
    maxBulletsWithImage: 3,
    maxTotalCharsWithImage: 220,
    maxColumnBullets: 0,
  },
  TWO_COLUMNS: {
    maxBullets: 6,
    maxTotalChars: 460,
    maxBulletsWithImage: 4,
    maxTotalCharsWithImage: 320,
    maxColumnBullets: 3,
  },
  METRIC_HIGHLIGHT: {
    maxBullets: 3,
    maxTotalChars: 240,
    maxBulletsWithImage: 2,
    maxTotalCharsWithImage: 180,
    maxColumnBullets: 0,
  },
  TIMELINE: {
    maxBullets: 4,
    maxTotalChars: 300,
    maxBulletsWithImage: 3,
    maxTotalCharsWithImage: 200,
    maxColumnBullets: 0,
  },
  CONCLUSION: {
    maxBullets: 3,
    maxTotalChars: 280,
    maxBulletsWithImage: 2,
    maxTotalCharsWithImage: 190,
    maxColumnBullets: 0,
  },
  COMPARISON: {
    maxBullets: 6,
    maxTotalChars: 440,
    maxBulletsWithImage: 4,
    maxTotalCharsWithImage: 300,
    maxColumnBullets: 3,
  },
};

/**
 * Evaluates a single slide's visual density and container load
 */
export function analyzeSlideDensity(
  slide: SlideItem,
  templateCategory: TemplateCategoryType = 'Executive'
): SlideDensityAnalysis {
  const rules = LAYOUT_RULES[slide.layout] || LAYOUT_RULES.TITLE_AND_BODY;
  const hasImage = Boolean(slide.imageUrl);
  const hasMetric = Boolean(slide.metric);
  const hasCallout = Boolean(slide.callout);

  // Aggregate bullets
  const bullets = slide.bullets || [];
  const leftCol = slide.leftColumn || [];
  const rightCol = slide.rightColumn || [];
  const totalBullets = bullets.length + leftCol.length + rightCol.length;

  // Aggregate text characters
  let totalChars = (slide.title || '').length + (slide.subtitle || '').length;
  bullets.forEach((b) => (totalChars += b.length));
  leftCol.forEach((b) => (totalChars += b.length));
  rightCol.forEach((b) => (totalChars += b.length));
  if (slide.callout) totalChars += slide.callout.length;

  const maxAllowedBullets = hasImage ? rules.maxBulletsWithImage : rules.maxBullets;
  const maxAllowedChars = hasImage ? rules.maxTotalCharsWithImage : rules.maxTotalChars;

  // Compute load factors
  const bulletLoad = maxAllowedBullets > 0 ? (totalBullets / maxAllowedBullets) * 100 : 80;
  const charLoad = (totalChars / maxAllowedChars) * 100;

  // Weighted capacity score
  let capacityScore = Math.round(bulletLoad * 0.55 + charLoad * 0.45);

  // Additional penalty if multiple dense widgets compete for screen real estate
  if (hasImage && (hasMetric || hasCallout) && totalBullets > 2) {
    capacityScore += 15;
  }
  if (slide.layout === 'TWO_COLUMNS') {
    if (leftCol.length > rules.maxColumnBullets || rightCol.length > rules.maxColumnBullets) {
      capacityScore += 12;
    }
  }

  // Determine status & severity
  let status: 'OPTIMAL' | 'MODERATE_OVERFLOW' | 'CRITICAL_OVERFLOW' = 'OPTIMAL';
  let reason = 'Content density conforms to widescreen container margins.';

  if (capacityScore > 130) {
    status = 'CRITICAL_OVERFLOW';
    if (hasImage && totalBullets > maxAllowedBullets) {
      reason = `Slide container critical overflow: Attached visual occupies 40% viewport, but slide retains ${totalBullets} bullets (${totalChars} chars), exceeding safe limit (${maxAllowedBullets} bullets).`;
    } else if (totalBullets > maxAllowedBullets) {
      reason = `Excessive content load: ${totalBullets} bullet points (${totalChars} chars) exceeds the container maximum of ${maxAllowedBullets} bullets. Content risks vertical clipping.`;
    } else {
      reason = `Text volume overflow: ${totalChars} characters exceeds recommended container bounds (${maxAllowedChars} chars) for ${slide.layout.replace(/_/g, ' ')}.`;
    }
  } else if (capacityScore > 100) {
    status = 'MODERATE_OVERFLOW';
    reason = `Moderate container density (${capacityScore}%): Content is approaching safe line height margins for ${templateCategory} audience.`;
  }

  // Generate tailored layout recommendations
  const suggestions: LayoutOptimizationSuggestion[] = [];

  if (status !== 'OPTIMAL') {
    // 1. Two-Columns layout suggestion (if currently 1 column and has 4+ bullets)
    if (slide.layout !== 'TWO_COLUMNS' && totalBullets >= 4) {
      suggestions.push({
        id: `opt-two-col-${slide.id}`,
        type: 'CONVERT_TWO_COLUMNS',
        title: 'Reorganize into Two-Column Pillars',
        tagline: 'Split single dense list into balanced parallel columns',
        badge: 'TWO COLUMNS',
        description: `Converts ${totalBullets} vertical bullets into balanced Left Pillar (${Math.ceil(totalBullets / 2)} items) and Right Pillar (${Math.floor(totalBullets / 2)} items) layout.`,
        templateBenefit:
          templateCategory === 'Technical'
            ? 'Optimal for Technical architecture: separates Ingress/Core from Verification/SLA.'
            : templateCategory === 'Executive'
            ? 'Optimal for Executive briefing: groups strategic drivers vs. quantifiable outcomes.'
            : 'Creates structured side-by-side contrast with generous visual margins.',
        recommended: templateCategory === 'Technical' || totalBullets >= 5,
      });
    }

    // 2. Split into two consecutive slides suggestion
    suggestions.push({
      id: `opt-split-${slide.id}`,
      type: 'SPLIT_INTO_TWO_SLIDES',
      title: 'Split into 2 Dedicated Slides',
      tagline: 'Divide overlong content across consecutive presentation slides',
      badge: 'ADD SLIDE',
      description: `Generates "${slide.title} (Part 1: Context)" and an adjacent "${slide.title} (Part 2: Execution)" slide, distributing items evenly.`,
      templateBenefit:
        templateCategory === 'Creative'
          ? 'Recommended for Creative decks: maximizes visual breathing room and high-impact white space.'
          : templateCategory === 'Executive'
          ? 'Executive-grade pacing: ensures board members focus on one core thesis per slide.'
          : 'Gives deep architectural components individual dedicated diagrams and focus.',
      recommended: templateCategory === 'Creative' || capacityScore > 140,
    });

    // 3. Condense & Migrate overflow bullets to Presenter Speaker Notes
    if (totalBullets > 3) {
      suggestions.push({
        id: `opt-notes-${slide.id}`,
        type: 'CONDENSE_TO_SPEAKER_NOTES',
        title: 'Condense to 3 Key Takeaways & Move Rest to Notes',
        tagline: 'Retain punchy slide points and preserve deep detail in speaker notes',
        badge: 'SPEAKER NOTES',
        description: `Keeps the top 3 most impactful bullet points on the slide, and automatically relocates the remaining ${totalBullets - 3} detailed points to Presenter Speaker Notes.`,
        templateBenefit:
          templateCategory === 'Executive'
            ? 'Recommended for Executive decks: prevents "slide reading" and empowers authoritative spoken delivery.'
            : 'Maintains uncluttered visual aesthetic while retaining complete technical background for Q&A.',
        recommended: templateCategory === 'Executive',
      });
    }

    // 4. Timeline suggestion if text suggests stages or phases
    const hasTimelineKeywords = bullets.some((b) =>
      /(phase|step|stage|q1|q2|q3|q4|week|month|milestone|rollout)/i.test(b)
    );
    if (hasTimelineKeywords && slide.layout !== 'TIMELINE') {
      suggestions.push({
        id: `opt-timeline-${slide.id}`,
        type: 'CONVERT_TIMELINE',
        title: 'Convert to Sequential Timeline',
        tagline: 'Format chronological milestones into a horizontal roadmap',
        badge: 'TIMELINE',
        description: 'Transforms multi-phase text into an executive 3-stage milestone progression stream.',
        templateBenefit: 'Clear visual journey showing phases, operational milestones, and rollout checkpoints.',
        recommended: true,
      });
    }
  }

  // Ensure at least one suggestion is marked recommended
  if (suggestions.length > 0 && !suggestions.some((s) => s.recommended)) {
    suggestions[0].recommended = true;
  }

  return {
    slideId: slide.id,
    slideNumber: slide.slideNumber,
    slideTitle: slide.title,
    layout: slide.layout,
    bulletCount: totalBullets,
    totalChars,
    hasImage,
    hasMetric,
    hasCallout,
    capacityScore,
    status,
    reason,
    metricDetails: {
      estimatedLineCount: Math.ceil(totalChars / 48),
      maxRecommendedLines: Math.ceil(maxAllowedChars / 48),
    },
    suggestions,
  };
}

/**
 * Analyzes the entire presentation deck plan for container overflows
 */
export function analyzeDeckDensity(deck: PresentationDeckPlan): DeckOptimizationReport {
  const templateCategory = deck.conditions?.templateCategory || 'Executive';
  const slideAnalyses = deck.slides.map((s) => analyzeSlideDensity(s, templateCategory));

  const overflowSlidesCount = slideAnalyses.filter((a) => a.status !== 'OPTIMAL').length;
  const criticalCount = slideAnalyses.filter((a) => a.status === 'CRITICAL_OVERFLOW').length;
  const optimizedSlidesCount = slideAnalyses.length - overflowSlidesCount;

  return {
    totalSlides: deck.slides.length,
    optimizedSlidesCount,
    overflowSlidesCount,
    criticalCount,
    templateCategory,
    slideAnalyses,
  };
}

/**
 * Applies a specific layout optimization action to a presentation deck plan
 */
export function applyOptimization(
  deck: PresentationDeckPlan,
  slideId: string,
  actionType: LayoutOptimizationActionType
): PresentationDeckPlan {
  const slideIndex = deck.slides.findIndex((s) => s.id === slideId);
  if (slideIndex < 0) return deck;

  const targetSlide = deck.slides[slideIndex];
  const allBullets = targetSlide.bullets || [];

  switch (actionType) {
    case 'CONVERT_TWO_COLUMNS': {
      // Divide bullets evenly into left and right columns
      const mid = Math.ceil(allBullets.length / 2);
      const leftCol = allBullets.slice(0, mid);
      const rightCol = allBullets.slice(mid);

      const updatedSlide: SlideItem = {
        ...targetSlide,
        layout: 'TWO_COLUMNS',
        leftColumn: leftCol.length > 0 ? leftCol : ['Core strategic driver', 'Foundational prerequisite'],
        rightColumn: rightCol.length > 0 ? rightCol : ['Measurable execution target', 'Operational validation'],
        bullets: undefined,
      };

      const newSlides = [...deck.slides];
      newSlides[slideIndex] = updatedSlide;
      return { ...deck, slides: newSlides };
    }

    case 'SPLIT_INTO_TWO_SLIDES': {
      // Divide bullets across 2 consecutive slides
      const mid = Math.max(2, Math.ceil(allBullets.length / 2));
      const bulletsPart1 = allBullets.slice(0, mid);
      const bulletsPart2 = allBullets.slice(mid);

      const part1Slide: SlideItem = {
        ...targetSlide,
        title: `${targetSlide.title} (Part 1: Strategic Context)`,
        bullets: bulletsPart1.length > 0 ? bulletsPart1 : allBullets.slice(0, 3),
      };

      const part2Slide: SlideItem = {
        id: `slide-split-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        slideNumber: targetSlide.slideNumber + 1,
        title: `${targetSlide.title} (Part 2: Execution & Impact)`,
        subtitle: targetSlide.subtitle ? `Execution Roadmap • ${targetSlide.subtitle}` : 'Execution & Quantitative Validation',
        layout: targetSlide.layout === 'TITLE' ? 'TITLE_AND_BODY' : targetSlide.layout,
        bullets: bulletsPart2.length > 0 ? bulletsPart2 : ['Quantified execution benchmarks and SLA adherence.', 'Continuous verification across all failure boundaries.'],
        callout: targetSlide.callout || 'Accelerates timeline with zero regressions.',
        notes: `Presenter notes for second half: Follow up on validation metrics.`,
        imageUrl: undefined, // Let Part 1 keep image if any, or separate
      };

      const newSlides = [...deck.slides];
      newSlides.splice(slideIndex, 1, part1Slide, part2Slide);

      // Re-number slides sequentially
      const renumbered = newSlides.map((s, idx) => ({
        ...s,
        slideNumber: idx + 1,
      }));

      return { ...deck, slides: renumbered };
    }

    case 'CONDENSE_TO_SPEAKER_NOTES': {
      // Retain top 3 bullets, move remaining bullets to presenter notes
      const visibleBullets = allBullets.slice(0, 3);
      const overflowBullets = allBullets.slice(3);

      const notesHeader = '\n\n[Presenter Reference - Supplementary Detail]:\n';
      const overflowNotesText = overflowBullets.map((b) => `• ${b}`).join('\n');
      const updatedNotes = targetSlide.notes
        ? `${targetSlide.notes}${notesHeader}${overflowNotesText}`
        : `${notesHeader}${overflowNotesText}`;

      const updatedSlide: SlideItem = {
        ...targetSlide,
        bullets: visibleBullets,
        notes: updatedNotes,
      };

      const newSlides = [...deck.slides];
      newSlides[slideIndex] = updatedSlide;
      return { ...deck, slides: newSlides };
    }

    case 'CONVERT_TIMELINE': {
      const milestones = (allBullets.length >= 3 ? allBullets.slice(0, 3) : allBullets).map(
        (b, i) => (b.toLowerCase().startsWith('phase') || b.toLowerCase().startsWith('stage') ? b : `Phase ${i + 1}: ${b}`)
      );

      const updatedSlide: SlideItem = {
        ...targetSlide,
        layout: 'TIMELINE',
        bullets: milestones,
      };

      const newSlides = [...deck.slides];
      newSlides[slideIndex] = updatedSlide;
      return { ...deck, slides: newSlides };
    }

    case 'CONVERT_METRIC_HIGHLIGHT': {
      const updatedSlide: SlideItem = {
        ...targetSlide,
        layout: 'METRIC_HIGHLIGHT',
        metric: targetSlide.metric || {
          value: '99.9%',
          label: 'Service Level Agreement',
          trend: '+14% YoY',
        },
        bullets: allBullets.slice(0, 3),
      };

      const newSlides = [...deck.slides];
      newSlides[slideIndex] = updatedSlide;
      return { ...deck, slides: newSlides };
    }

    default:
      return deck;
  }
}

/**
 * Automatically applies the top recommended optimization to every overflowing slide in the deck
 */
export function batchOptimizeDeck(deck: PresentationDeckPlan): {
  updatedDeck: PresentationDeckPlan;
  optimizedCount: number;
} {
  let currentDeck = { ...deck };
  let optimizedCount = 0;

  const report = analyzeDeckDensity(currentDeck);
  const overflowAnalyses = report.slideAnalyses.filter((a) => a.status !== 'OPTIMAL');

  overflowAnalyses.forEach((analysis) => {
    const recommendedSuggestion = analysis.suggestions.find((s) => s.recommended) || analysis.suggestions[0];
    if (recommendedSuggestion) {
      currentDeck = applyOptimization(currentDeck, analysis.slideId, recommendedSuggestion.type);
      optimizedCount++;
    }
  });

  return { updatedDeck: currentDeck, optimizedCount };
}
