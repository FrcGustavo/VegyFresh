# Frontend Improvement Foundation

This document tracks the first implementation slice from the frontend review backlog.

## Related Issues

- [#1 Fix Frontend TypeScript Build And Tooling](https://github.com/FrcGustavo/VegyFresh/issues/1)
- [#2 Add Typed Frontend API Layer](https://github.com/FrcGustavo/VegyFresh/issues/2)
- [#3 Improve Forms, Validation, And Save Behavior](https://github.com/FrcGustavo/VegyFresh/issues/3)
- [#4 Improve Modal And Table Accessibility](https://github.com/FrcGustavo/VegyFresh/issues/4)
- [#5 Fix Dynamic Row State Stability](https://github.com/FrcGustavo/VegyFresh/issues/5)
- [#8 Reduce Initial Bundle Size](https://github.com/FrcGustavo/VegyFresh/issues/8)
- [#10 Cleanup Frontend Dead Code And Documentation](https://github.com/FrcGustavo/VegyFresh/issues/10)

## Implemented In This Slice

- Added frontend typecheck and test scripts.
- Added Vitest, Testing Library, jsdom, and jest-dom setup.
- Fixed existing TypeScript build blockers.
- Made `FloatingModal` easier to test and more accessible with dialog semantics, focus-on-open, Escape close, and named icon controls.
- Added `VITE_API_URL` support and a typed `fetchApi<T>()` migration path.
- Added route-level lazy loading for top-level frontend pages.
- Limited Roboto font imports to Latin subsets.
- Added stable client-side row IDs for dynamic order, product price, and price-list rows.
- Added client-side image file validation for avatars and supplier logos.
- Removed unused starter assets and dead toolbar outlet-context code.
- Updated frontend README and Turbo Vite build outputs.

## Remaining Follow-Up Issues

- [#2](https://github.com/FrcGustavo/VegyFresh/issues/2): complete typed feature API service modules and migrate all query hooks away from raw endpoint strings.
- [#3](https://github.com/FrcGustavo/VegyFresh/issues/3): add full schema validation and consistent save-and-new behavior across all forms.
- [#4](https://github.com/FrcGustavo/VegyFresh/issues/4): continue table keyboard accessibility and column-resize accessibility work.
- [#6](https://github.com/FrcGustavo/VegyFresh/issues/6): extract repeated resource-list mechanics.
- [#7](https://github.com/FrcGustavo/VegyFresh/issues/7): consolidate MUI table styling and theme tokens.
- [#9](https://github.com/FrcGustavo/VegyFresh/issues/9): add broader unit, component, accessibility, and E2E coverage.

## Validation

The following checks should pass for this slice:

```bash
pnpm --filter frontend check-types
pnpm --filter frontend lint
pnpm --filter frontend test
pnpm --filter frontend build
```
