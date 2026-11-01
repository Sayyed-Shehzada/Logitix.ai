# AGENTS.md

## Active Skill: UI/UX Pro Max (`nextlevelbuilder/ui-ux-pro-max-skill`)

The **UI/UX Pro Max** design intelligence skill is installed at `.agents/skills/ui-ux-pro-max/`.

### Guidelines & Usage:
- When creating, reviewing, refactoring, or polishing user interfaces, components, color schemes, typography, design systems, and animations, consult the skill guidelines in `.agents/skills/ui-ux-pro-max/SKILL.md`.
- **Search CLI available**:
  ```bash
  python3 .agents/skills/ui-ux-pro-max/scripts/search.py "<query>" [--domain <domain>] [--stack <stack>] [--design-system]
  ```
- **Available domains**: `style`, `color`, `typography`, `ux`, `chart`, `icons`, `motion`, `landing`, `react-performance`.
- **Tech Stack Rules**: For React and Tailwind, adhere to WCAG AA accessibility standards, responsive layouts, 60fps animations with `motion`, clean optical hierarchy, and zero generic clichés.
