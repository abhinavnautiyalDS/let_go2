# Feature modules

Each product capability lives in its own folder. A feature owns its components,
hooks, data contracts, validation and local utilities. Export only the public
entry points from its `index.ts`; routes should compose those entry points.

Suggested future modules: `ritual`, `feedback`, `reviews`, `gifting`,
`payments`. Add them when implementation begins rather than creating empty
folders in advance.
