# Repository architecture

## Safety rule

The current production routes and ritual compositor remain in their existing locations during this architecture-only change. This document describes the target structure and the migration rules; it does not move or rewrite runtime files.

**Do not reorganise the live ritual route in one large change.** Move one feature at a time, keep the public route stable, and verify the Cloudflare preview deployment before merging.

## Current application entry points

- `app/page.tsx`: landing page (`/`).
- `app/ritual/page.tsx` (or the existing equivalent): ritual route (`/ritual`).
- `app/components/Scene01.tsx`: current primary ritual scene and orchestration.
- `app/lib/paper-plate.ts`: paper/ink/fire canvas compositor.
- `app/globals.css`: global design tokens and existing page/scene styles.
- `public/assets/`: static visual and audio assets.

Keep these paths working until each corresponding migration is complete. Confirm exact route filenames against the repository before moving anything.

## Target structure

```text
let_go2/
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx                 # landing route composition
│   │   ├── experiences/page.tsx
│   │   ├── pricing/page.tsx
│   │   └── about/page.tsx
│   ├── (ritual)/
│   │   └── ritual/page.tsx          # preserve URL: /ritual
│   ├── (legal)/
│   │   ├── privacy/page.tsx
│   │   └── terms/page.tsx
│   ├── api/
│   │   ├── feedback/route.ts
│   │   └── reviews/route.ts
│   ├── layout.tsx
│   └── globals.css
├── src/
│   ├── components/
│   │   ├── ui/                      # buttons, dialogs, inputs, primitives
│   │   ├── layout/
│   │   │   ├── desktop/
│   │   │   ├── mobile/
│   │   │   └── shared/
│   │   └── responsive/              # breakpoint-aware composition only
│   ├── features/
│   │   ├── landing/
│   │   │   ├── components/
│   │   │   │   ├── desktop/
│   │   │   │   ├── mobile/
│   │   │   │   └── shared/
│   │   │   ├── hooks/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   ├── ritual/
│   │   │   ├── components/
│   │   │   │   ├── desktop/
│   │   │   │   ├── mobile/
│   │   │   │   └── shared/
│   │   │   ├── engine/              # canvas/video orchestration
│   │   │   ├── hooks/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   ├── feedback/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   ├── schemas/
│   │   │   └── types/
│   │   ├── reviews/
│   │   ├── payments/
│   │   └── gifting/
│   ├── lib/
│   │   ├── cloudflare/
│   │   ├── analytics/
│   │   ├── validation/
│   │   └── utils/
│   ├── config/
│   └── types/
├── public/
│   └── assets/
│       ├── scene-01/
│       ├── audio/
│       └── images/
├── docs/
│   ├── architecture/
│   ├── decisions/
│   └── runbooks/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── [existing root configuration files]
```

This is a target map, not a requirement to create every directory now. Create feature folders when the feature is implemented.

## Desktop and mobile component strategy

Use separate **page compositions** when the experience genuinely differs:

- `LandingDesktop` and `LandingMobile`
- `RitualDesktop` and `RitualMobile`

Keep domain logic and data shared:

- `useRitual`, ritual state machine, timers and transition rules
- paper/ink/fire compositor and media loading
- feedback validation and submission
- payment entitlement checks
- review data contracts

The desktop/mobile compositions should call the same hooks and render shared feature components. Do not duplicate the ritual engine, payment logic, API calls, or analytics.

Prefer CSS media queries for purely visual differences. If choosing a distinct component tree is necessary, use a small client-side breakpoint adapter that avoids rendering both trees at once and handles hydration safely. Do not use user-agent sniffing as the primary breakpoint mechanism.

For the ritual, preserve the 16:9 scene coordinate system and scale/crop it deliberately on narrow screens. Mobile-specific controls may be separate, but the underlying scene state and compositor must remain one source of truth.

## Import boundaries

1. Route files compose feature entry points; they should not contain large feature implementations.
2. A feature may import its own internals and shared `src/components/ui` primitives.
3. Shared UI must not import from a feature.
4. The ritual engine must not depend on landing-page components.
5. Payment secrets and privileged database operations stay server-side.
6. Browser-only canvas, video, audio and window APIs stay in client modules.
7. Keep public asset URLs stable while moving code; do not rename assets as part of component refactors.

## Migration plan (small, reversible pull requests)

1. **Inventory:** record current routes, imports, assets, environment bindings and Cloudflare build settings.
2. **Foundation:** add aliases and feature entry points without changing behaviour.
3. **Landing:** extract shared content and introduce desktop/mobile compositions behind existing route.
4. **Ritual:** extract the existing scene into the ritual feature without changing its state transitions or asset paths.
5. **Feedback/reviews:** add isolated feature modules and API contracts.
6. **Payments:** add server-side payment verification and entitlement service only when ready to monetise.
7. **Cleanup:** remove old files only after import search, tests and preview deployment confirm no references remain.

Every migration PR should preserve route URLs and asset paths, include a file-move map, pass typecheck/lint/build, and be tested on a Cloudflare preview deployment before merge.

## Cloudflare deployment guardrails

- Keep the current Cloudflare project, production branch, build command, output settings and environment bindings unchanged in the architecture-only phase.
- Do not add a second deployment config or change the production branch.
- Use a feature branch and Cloudflare preview deployment for all structural work.
- Keep secrets in Cloudflare environment secrets; never commit `.env` files.
- Check Worker/Pages compatibility and runtime support before introducing Node-only dependencies.
- Confirm production deployment is unchanged after merge; a successful Git commit alone is not proof of a successful deployment.

## Definition of done for future migrations

- Existing URLs return the same expected pages.
- Desktop and mobile layouts are checked at representative viewport widths.
- No duplicated state machines or business rules.
- Asset requests return successfully.
- TypeScript, lint and production build pass.
- Cloudflare preview works before merge.
- Production is only updated through the existing deployment workflow.
