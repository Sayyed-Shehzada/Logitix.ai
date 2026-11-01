/**
 * Utility to strictly distinguish requests to CREATE AN APP OR WEBSITE
 * versus general code, script, algorithm, or syntax requests.
 */

export interface AppCreationIntent {
  isAppOrWebsiteCreation: boolean;
  type: 'app' | 'website' | 'web_app' | 'landing_page' | 'fullstack' | 'general_app' | null;
  detectedPrompt: string;
  suggestedName?: string;
  suggestedFramework?: string;
}

export function detectAppOrWebsiteCreationIntent(message: string): AppCreationIntent {
  if (!message || typeof message !== 'string') {
    return { isAppOrWebsiteCreation: false, type: null, detectedPrompt: '' };
  }

  const text = message.trim();
  const lower = text.toLowerCase();

  // EXCLUSIONS: If user is ONLY asking for pure code, function, bug fix, regex, snippet, syntax, or explanation
  // and NOT explicitly asking to build / create / make / design an app or website project:
  const isPureCodeQuestion = (
    /^(how\s+to\s+write|show\s+code\s+for|give\s+me\s+code\s+for|write\s+a\s+(function|script|regex|query|loop|class|snippet)|explain\s+this\s+code|fix\s+this\s+code|debug\s+this|what\s+is\s+the\s+syntax)/i.test(lower) &&
    !/(app|application|website|web\s*site|web\s*app|landing\s*page|dashboard\s*app|portal|saas|platform)/i.test(lower)
  );

  if (isPureCodeQuestion) {
    return { isAppOrWebsiteCreation: false, type: null, detectedPrompt: text };
  }

  // Explicit Creation Patterns targeting Apps or Websites
  const appCreationPatterns = [
    // Direct "create / build / make / develop / generate / launch" an app or website
    /(?:create|build|make|develop|generate|design|code|launch|start|construct|program|scaffold)\s+(?:an?|my|the|a\s+new|an\s+interactive|a\s+full|a\s+responsive|a\s+modern)?\s*(?:app|application|website|web\s*site|web\s*app|webapp|landing\s*page|web\s*portal|saas\s*app|dashboard\s*app|mobile\s*app|ios\s*app|android\s*app|react\s*app|vite\s*app|nextjs\s*app|vue\s*app|svelte\s*app)/i,
    
    // "I want to create/build/make an app or website"
    /i\s+(?:want|need|wish|would\s+like)\s+to\s+(?:create|build|make|develop|launch|start)\s+(?:an?|my|a\s+new)?\s*(?:app|application|website|web\s*site|web\s*app|webapp|landing\s*page|saas|platform)/i,

    // "help me create / build / make an app or website"
    /help\s+me\s+(?:to\s+)?(?:create|build|make|develop|launch|start)\s+(?:an?|my|a\s+new)?\s*(?:app|application|website|web\s*site|web\s*app|webapp|landing\s*page)/i,

    // "app for X" or "website for X" where X is a specific domain
    /^(?:an?\s+)?(?:app|application|website|web\s*site|web\s*app|webapp|landing\s*page)\s+(?:for|that|which|to)\s+/i,

    // "can you (please) (create|build|make) (an|a) (app|website)"
    /can\s+you\s+(?:please\s+)?(?:create|build|make|develop|generate|design)\s+(?:an?|a\s+new)?\s*(?:app|application|website|web\s*site|web\s*app|webapp|landing\s*page)/i,
  ];

  const matches = appCreationPatterns.some((p) => p.test(lower));

  if (!matches) {
    return { isAppOrWebsiteCreation: false, type: null, detectedPrompt: text };
  }

  // Determine specific target archetype
  let type: AppCreationIntent['type'] = 'general_app';
  if (lower.includes('website') || lower.includes('web site') || lower.includes('landing page')) {
    type = lower.includes('landing page') ? 'landing_page' : 'website';
  } else if (lower.includes('web app') || lower.includes('webapp') || lower.includes('saas') || lower.includes('dashboard')) {
    type = 'web_app';
  } else if (lower.includes('fullstack') || lower.includes('backend and frontend')) {
    type = 'fullstack';
  } else if (lower.includes('app') || lower.includes('application')) {
    type = 'app';
  }

  // Extract a clean suggested app title from the prompt
  let cleanName = text.replace(/^(can\s+you\s+)?(please\s+)?(create|build|make|develop|generate|design|i\s+want\s+to\s+create|help\s+me\s+build)\s+(an?|my|a\s+new)?\s*(app|application|website|web\s*site|web\s*app|landing\s*page)?\s*(for|that|called|named)?/i, '').trim();
  if (cleanName.length > 40) {
    cleanName = cleanName.substring(0, 40) + '...';
  }
  if (!cleanName) {
    cleanName = type === 'website' ? 'Modern Responsive Website' : 'Dynamic Web App';
  }

  return {
    isAppOrWebsiteCreation: true,
    type,
    detectedPrompt: text,
    suggestedName: cleanName,
    suggestedFramework: type === 'website' ? 'HTML5 / Tailwind CSS / JS' : 'React 18 + Vite + TypeScript',
  };
}
