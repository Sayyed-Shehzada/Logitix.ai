export interface VersionInfo {
  version: string;
  major: number;
  minor: number;
  patch: number;
  releaseDate: string;
  codename: string;
  channel: 'Stable' | 'Beta' | 'Nightly';
  changelog: {
    version: string;
    date: string;
    type: 'major' | 'minor' | 'patch';
    changes: string[];
  }[];
}

export const APP_VERSION: VersionInfo = {
  version: '1.0.0',
  major: 1,
  minor: 0,
  patch: 0,
  releaseDate: '2026-07-29',
  codename: 'Hyperion',
  channel: 'Stable',
  changelog: [
    {
      version: '1.0.0',
      date: '2026-07-29',
      type: 'major',
      changes: [
        'Initial Production Release of LOGITIX Executive AI Assistant Workspace',
        'Added Image Studio with AI image synthesis & auto-editing controls',
        'Integrated Audio Spark for real-time live vocal conversation and Web Speech API synthesis',
        'Added Movie Studio with 3D parallax depth & image-to-video motion animation',
        'Added Music Studio with live Web Audio API synth generator',
        'Integrated Firebase Cloud Firestore database with security rules and authentication',
        'Implemented Semantic Versioning strategy and version management view in Settings',
      ],
    },
  ],
};

export const SEMVER_GUIDELINES = {
  major: {
    title: 'MAJOR Version (X.0.0)',
    description: 'Incompatible API changes, breaking database schema migrations, or fundamental architectural re-designs.',
    examples: ['Database collection structure rewrites', 'Breaking API route contract changes', 'Core framework replacements'],
  },
  minor: {
    title: 'MINOR Version (1.X.0)',
    description: 'Adding new features, studios, tools, or integrations in a backward-compatible manner.',
    examples: ['New AI Studio modules (e.g. Audio Spark)', 'New provider additions to abstraction layer', 'New UI views'],
  },
  patch: {
    title: 'PATCH Version (1.0.X)',
    description: 'Backward-compatible bug fixes, UI adjustments, performance optimizations, or security patch deployments.',
    examples: ['Fixing styling defects', 'Updating Firestore security rules', 'Optimizing audio synthesis latency'],
  },
};
