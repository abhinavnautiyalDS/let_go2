# Ritual feature

The ritual is a single cinematic scene with one state machine and one 16:9
coordinate system. Desktop and mobile currently share this scene because its
canvas/video compositor and timed transitions must remain synchronised. The
responsive presentation is handled by the scene's existing CSS breakpoints.

- `components/shared/Scene01.tsx`: existing ritual orchestration, preserved
  without rewriting its state transitions.
- `engine/paper-plate.ts`: browser canvas compositor for paper, ink, fire and ash.
- `RitualExperience.tsx`: feature composition used by the route.

Future extraction should move cohesive groups of hooks/helpers into focused
modules (assets, performance, paper measurement, post-burn flow) with tests.
Do not split the scene into two independent desktop/mobile state machines.
