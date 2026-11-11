# Feature module conventions

## Default feature shape

```text
src/features/<feature>/
├── components/
│   ├── desktop/
│   ├── mobile/
│   └── shared/
├── data/                 # static content and fixtures
├── hooks/                # client-side orchestration
├── services/             # API clients; no secrets
├── schemas/              # runtime validation
├── types/                # feature contracts
├── utils/                # pure feature helpers
└── index.ts              # public exports
```

Create only the folders a feature needs. Do not add placeholder directories
for hypothetical capabilities.

## Desktop and mobile

- Keep separate desktop/mobile compositions when information hierarchy,
  controls or interaction patterns genuinely differ.
- Share content, domain rules, API contracts, analytics and state transitions.
- Use CSS media queries for spacing, typography and other presentation-only
  differences.
- Avoid user-agent detection and avoid duplicating business logic.
- Keep responsive selection and hydration behavior explicit.

## Dependency direction

```text
app routes -> feature public entry points -> feature internals
                         |
                         +-> shared UI / shared libraries
shared UI and shared libraries -X-> feature modules
```

A feature must not reach into another feature's private files. If two features
need the same domain capability, extract it into a neutral shared module.

## Route and deployment stability

- Preserve public route URLs and asset URLs during refactors.
- Keep route files small and declarative.
- Keep secrets server-side and out of public config.
- Do not alter Cloudflare production settings as part of a folder migration.
- Run lint, typecheck and production build locally; then validate a preview
  deployment before merging.

## Current migration status

The landing page has been extracted behind the existing `/` route. Its
desktop and mobile compositions are separate presentational components;
navigation state and the transition timer are shared in one hook. The ritual
route and its engine remain untouched for a later, isolated migration.
