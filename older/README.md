# HabiNest01

A minimal, real‑estate MVP (NoBroker-style) with a real-world project layout, keeping your existing code unchanged.

## Structure

- public/
  - index.html        ← exact copy of your current app entry
  - assets/style.css  ← exact copy of styles
  - js/app.js         ← exact copy of SPA logic
- server.js           ← minimal Node static server (no external deps)
- package.json        ← scripts to run the static server
- .editorconfig       ← basic editor settings
- .gitignore          ← common ignores

Your original files remain at the project root (HabiNest01/) and were not modified. The public/ folder is a deployable bundle.

## Run locally

Option 1: Open directly in the browser
- Start-Process .\public\index.html

Option 2: Serve with Node (no external packages needed)
- node server.js
- Then open http://localhost:5173

Option 3: If you prefer a different static server, point it at the public/ folder.

## Notes
- No changes were made to your app code; files in public/ are byte-for-byte copies.
- You can continue developing against the originals or switch to public/. If you change the originals, re-copy them to public/ to update the deployable bundle.
- The app persists data in localStorage by design.
