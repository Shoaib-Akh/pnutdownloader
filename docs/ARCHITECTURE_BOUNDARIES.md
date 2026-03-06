# Architecture Boundaries

This project follows an Electron layered architecture with strict module ownership.

## Layers

1. `src/main`
- Electron main process.
- Owns OS integrations, file system access, process spawning, notifications, updates, and IPC handlers.
- Must not import from `src/renderer/**`.

2. `src/preload`
- Secure bridge between renderer and main using `contextBridge`.
- Exposes a minimal API surface (`window.api`) to renderer.
- Can depend on Electron preload utilities and IPC channel contracts only.

3. `src/renderer`
- React UI and presentation logic.
- Must not directly access Node/Electron privileged APIs.
- Uses `window.api` only for privileged operations.

4. `src/shared`
- Cross-layer pure utilities and shared contracts.
- No DOM, no Electron runtime side-effects.
- Safe to import from main, preload, and renderer.

## Dependency Rules

Allowed:
- `renderer -> shared`
- `preload -> shared`
- `main -> shared`
- `renderer -> preload` (runtime through `window.api`, not direct source import)

Not allowed:
- `main -> renderer` source imports
- `preload -> renderer` source imports
- `renderer -> main` source imports

## First Enforced Fix

- Moved `extractVideoId` to [`src/shared/urlUtils.js`](/Users/mac/Documents/pnutdownloader/src/shared/urlUtils.js).
- Updated main to import from shared instead of renderer:
  - [`src/main/index.js`](/Users/mac/Documents/pnutdownloader/src/main/index.js:10)
