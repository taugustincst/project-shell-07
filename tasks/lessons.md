# Lessons (project-shell-07)

- Local ports are denied in this sandbox: run Playwright over `file://` (service worker registration is guarded for file:).
- A `pagehide` save overwrites a corrupt save planted via `localStorage.setItem` before reload. Plant with `page.addInitScript` in a fresh context instead.
- Random minor events can open a modal between test steps and intercept clicks. The smoke test settles pending events through the test API before each UI click.
- Closing early on the power-out event still pays the owner's cut, so closing on night one with the starting float bankrupts the run. Tests that exercise the dark event give the till money first; the design keeps the cost.
- CSS grid columns with `1fr` still grow to min-content; use `minmax(0, 1fr)` and `min-width: 0` on cards or long monospace text pushes the grid off screen.
- GitHub Pages must be enabled by a human in Settings → Pages → Source: GitHub Actions; the workflow token cannot create the site. Here Folder had already enabled it and pushed a static deploy workflow to main while this branch was in flight: fetch main before merging, keep the upstream workflow, merge (never force-push or reset in this sandbox; those are denied).
