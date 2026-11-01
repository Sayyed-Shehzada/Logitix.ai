# LOGITIX Executive AI Workspace (`v1.0.0`)

> Modern private AI executive assistant with agent planning, long-term memory, AI multimedia creation studios (Image Studio, Audio Spark, Movie Studio, Music Studio), multi-provider abstraction layer, and Firebase persistent database integration.

---

## 🚀 Features Overview

- **Logitix AI Executive Assistant**: Live multi-turn AI chat powered by Google Gemini 3.6 Flash / 3.1 Pro via server-side `@google/genai` SDK.
- **Image Studio**: High-resolution image generation and natural language AI auto-editing.
- **Audio Spark**: Live conversational voice mode with Web Speech API recognition and speech synthesis.
- **Movie Studio**: Transform static photos into animated videos with 3D parallax depth and camera motion keyframes.
- **Music Studio**: Generate custom background tracks, synthwave beats, and ambient soundscapes with Web Audio API synthesis.
- **Firebase Firestore Integration**: Cloud database for persistent long-term memory logs, user profiles, and project task management.

---

## 🏷️ Semantic Versioning Strategy (SemVer)

Logitix adheres strictly to **Semantic Versioning 2.0.0** (`MAJOR.MINOR.PATCH`):

```
v1.0.0
 │ │ └─ PATCH: Bug fixes, UI/styling tweaks, security rule patches
 │ └─── MINOR: Backward-compatible new features, studios, AI models, or tools
 └───── MAJOR: Breaking architectural changes, database schema rewrites, or API contracts
```

### 1. `MAJOR` Version (`X.0.0`)
- **When to bump**: Whenever making incompatible API changes, altering Firestore database collection structures in a non-backward-compatible manner, or refactoring the core server routing engine.
- **Example**: Upgrading from `1.0.0` to `2.0.0` when migrating backend endpoints or altering database document schemas.

### 2. `MINOR` Version (`1.X.0`)
- **When to bump**: Whenever adding new functional capabilities, views, AI models, or third-party integrations that do not break existing functionality.
- **Example**: Bumping `1.0.0` to `1.1.0` when adding a new AI Studio tool or integrating an additional AI provider into the abstraction layer.

### 3. `PATCH` Version (`1.0.X`)
- **When to bump**: Whenever deploying backward-compatible bug fixes, UI/CSS polish, performance tuning, or updated security rules.
- **Example**: Bumping `1.0.0` to `1.0.1` after fixing a styling bug or optimizing audio player latency.

---

## 🔄 How to Handle Updates and Version Bumps

Follow this step-by-step procedure when modifying, updating, or redeploying the app:

### Step 1: Update `package.json`
Update the `"version"` field in `package.json` to reflect your new SemVer number:
```json
{
  "name": "logitix-ai-workspace",
  "version": "1.1.0"
}
```

### Step 2: Update `src/version.ts`
Update the version metadata object and append your release notes to the changelog array:
```typescript
export const APP_VERSION: VersionInfo = {
  version: '1.1.0',
  major: 1,
  minor: 1,
  patch: 0,
  releaseDate: '2026-08-01',
  codename: 'Hyperion Nova',
  channel: 'Stable',
  changelog: [
    {
      version: '1.1.0',
      date: '2026-08-01',
      type: 'minor',
      changes: [
        'Added new feature or studio...',
      ],
    },
    ...
  ],
};
```

### Step 3: Run Verification & Linting
Run TypeScript type-checking to verify there are no compilation or syntax errors:
```bash
npm run lint
```

### Step 4: Build & Deploy
When deploying updates to Cloud Run or AI Studio:
1. Rebuild the application package:
   ```bash
   npm run build
   ```
2. The Settings view will automatically display the updated version badge (`v1.1.0`), release date, and changelog notes to all workspace users.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Motion.
- **Backend Server**: Express (v4), Node.js, `esbuild` bundled CommonJS server on Cloud Run (Port 3000).
- **AI Engine**: `@google/genai` Server SDK with Gemini 3.6 Flash / 3.1 Pro.
- **Database**: Firebase Firestore (`firebase-applet-config.json`) & Firebase Auth.
