# UI catalogue

This Vite application demonstrates `@vegyfresh/ui` exports and both light and
dark themes. From the repository root, run:

```sh
make -C apps/docs check
make -C apps/docs dev
```

The development catalogue listens on `http://localhost:5175`. The shared Docker
tooling entrypoint installs the frozen workspace dependencies and builds the UI
package first, so its public `dist` exports are available to this application.
