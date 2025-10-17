# CA DOT Dashboard

An interview-ready front-end prototype that showcases a transportation project dashboard for the California Department of Transportation. The single-page app highlights rich UI patterns (navigation, filtering, data visualizations, and team collaboration concepts) while staying lightweight enough to iterate quickly over a week.

## Product Story

- **Problem**: transportation program managers need a quick view of active capital projects, their health, blockers, and involved teams so they can prioritize interventions.
- **Solution**: a responsive dashboard with project cards, progress bars, risk callouts, and deep-dive modals (advanced search, project details, notifications) that feels like a modern internal tool.
- **Target Persona**: regional project leads and data analysts within Caltrans who coordinate across engineering, environmental, and community outreach teams.
- **Differentiators**: polished visual system, realistic mock data, multi-view layout (overview, analytics, team, settings), and interaction affordances that mirror production-grade apps.

## Current Experience Snapshot

- **Header & Global Navigation**: multi-tab top bar with SVG iconography, notification badge, profile menu, and keyboard-accessible skip link.
- **Project Portfolio Section**: grid of project summary cards sourced from embedded JSON, featuring progress rings, status chips, heat-level indicators, and quick actions.
- **Advanced Search Modal**: multi-tab filtering (criteria, map radius placeholder, history) with tags, sliders, quick presets, and save/clear workflows.
- **Context Panels**: side widgets for alerts, tasks, timeline, team load, and resource allocation—designed to look data-rich even with static content.
- **Secondary Views (stubs)**: navigation wiring for analytics, team, and settings panes to expand later.

## Data Model

- Project records now live in `data/projects.json` and are loaded through `js/dataStore.js`, which keeps a mutable in-memory copy for the filters, analytics, and future CRUD flows.
- Status normalization/badge styling moved into `js/utils/status.js` so every surface (cards, analytics, modals) reuses the same rules.
- Each project item includes: `id`, `name`, `status`, `total` vs `done` tasks, `updated` timestamp, descriptive copy, and `team` roster.
- Future improvement: swap the static store with a lightweight API service (or mocked fetch layer) to mimic live updates.

## Day-7 Demo Goals

1. **Narrative**: articulate the dashboard’s purpose, the audience, and how each component supports decision-making.
2. **Functional Slice**: deliver a polished “Overview” tab with working filters (search, status chips, advanced modal apply) and meaningful empty/error states.
3. **Visual Polish**: tighten typography, spacing, and color tokens; ensure responsive behavior for tablet + desktop breakpoints.
4. **Perceived Depth**: highlight analytics preview (sparklines or key metrics) and a live interaction (e.g., modal flow, notifications list).
5. **Credibility**: host on GitHub Pages/Netlify, include README walkthrough, screenshots/GIFs, and a quickstart section so interviewers can run it.

## 7-Day Execution Plan

| Day | Focus | Outcomes |
| --- | ----- | -------- |
| 1 | Codebase tidying | Break HTML into semantic sections, identify reusable components, capture TODOs. |
| 2 | Data + State | Externalize JSON, wire filtering/search logic, document data contracts. |
| 3 | UI Polish | Establish design tokens, responsive grid, and consistent component styling. |
| 4 | Interaction | Finish advanced search apply/clear flow, add loading/empty states, hook up notifications drawer. |
| 5 | Analytics Slice | Add hero KPIs/graphs (static or faux charts), ensure nav toggles relevant layouts. |
| 6 | QA + Accessibility | Keyboard focus review, aria labeling, smoke test checklist, fix contrast issues. |
| 7 | Packaging | Prep README demo guide, record GIFs, deploy, and rehearse narrative. |

## Demo Checklist

- [ ] Global navigation toggles visual states per section.
- [ ] Search input filters card grid in real time (debounced, case-insensitive).
- [ ] Advanced search modal applies filters and persists recent history.
- [ ] Notifications/Tasks panels surface believable content and can be toggled.
- [ ] Layout adapts gracefully to 1280px, 1024px, and 768px widths.
- [ ] README links to live demo, screenshots, and setup instructions.
- [ ] Basic automated checks run (`npm test` or lint/smoke script) and pass.

## Getting Started (current state)

```bash
git clone <repo-url>
cd MainApp
# ES modules require running through a local server (or GitHub Pages/Netlify)
npx serve .
# or: python3 -m http.server 3000
```

## Next Steps

- Spin up lightweight tooling (Vite or Parcel) to manage assets, minification, and deployment.
- Migrate CSS into modular partials with variables for color/spacing/typography.
- Write unit/smoke tests (Playwright, Vitest) covering filtering logic and modal flows.
- Capture product screenshots and add them to `/assets` for README embedding.

## Component Inventory (Day 1)

- **Global Shell**: `header.header`, `nav.nav-menu`, and quick actions (`aside.quick-actions`) frame the persistent chrome; needs extraction into layout partial and hover/focus audit.
- **Overview Hero**: `main#main-content` now groups `overview-header`, `overview-metrics`, `overview-controls`, and `overview-results`; TODO to externalize summary card markup into template helpers for reuse and unit coverage.
- **Data Surfaces**: project cards (rendered into `#grid`), empty state, and activity log now pull from the shared data store; next step is to extract the card templating/render helpers for reuse and testing.
- **Data Utilities**: `js/dataStore.js` centralizes project data mutations while `js/utils/status.js` keeps status/badge logic consistent across overview and analytics views.
- **Secondary Views**: analytics/team/settings mains are stubs with static content; schedule pass to ensure nav toggles swap aria states and content placeholders look intentional.
- **Modal Stack**: advanced search, notifications drawer, and generic modal exist in DOM; capture interactions in a dedicated `js/modals.js` module and add keyboard trap handling (Day 4).

## Outstanding Considerations

- Clarify whether analytics/team/settings need “read-only” demos or interactive slices for the first showcase.
- Decide on final hosting target (GitHub Pages vs Netlify) to align asset pipeline work.
- Identify must-have accessibility wins (focus order, skip targets, modal traps) to fold into Days 4–6.
