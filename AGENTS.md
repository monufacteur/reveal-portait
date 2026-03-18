# Coding-agent guide — reveal-portait

This file contains instructions for GitHub coding agents (Copilot, etc.) working in this repository.

---

## Project summary

**reveal-portait** is a zero-dependency, no-build-step template that adds portrait-oriented slides to [Reveal.js](https://revealjs.com/) presentations.  
The entire feature surface lives in exactly **two files**:

| File | Purpose |
|---|---|
| `portrait-slides.css` | CSS — rotation, scaling, print-PDF rules |
| `portrait-slides.js` | JS — dimension sync, auto-wrap, Plotly resize |

`index.html` is a self-contained demo/example; it is **not** part of the distributable template.

---

## Repository layout

```
reveal-portait/
├── portrait-slides.css   ← template (edit this for CSS changes)
├── portrait-slides.js    ← template (edit this for JS changes)
├── index.html            ← demo presentation (not the template itself)
├── README.md
├── AGENTS.md             ← this file
└── vendor/
    ├── reveal/           ← vendored Reveal.js (do NOT edit)
    └── plotly-2.29.1.min.js  ← vendored Plotly.js (do NOT edit)
```

---

## Key design decisions

- **No build step.** Everything is plain ES5 JavaScript and CSS.  Do not introduce a bundler, transpiler, or package manager unless the issue explicitly requires it.
- **No external requests at runtime.** Both Reveal.js and Plotly.js are vendored locally.  Do not replace them with CDN links.
- **ES5 only in `portrait-slides.js`.** The file uses `var`, IIFEs, and `forEach` so it works in any browser that supports Reveal.js without transpilation.  Do not upgrade to ES6+ `const`/`let`/arrow functions unless the issue explicitly asks for a browser-support change.
- **Minimal surface area.** The template exposes one public namespace (`window.PortraitSlides`) with three helpers.  Keep the public API stable.
- **CSS custom properties drive the maths.** `--slide-width`, `--slide-height`, and `--portrait-scale` are set by JS and consumed by CSS.  Both files must stay in sync if the variable names change.

---

## Style conventions

### CSS (`portrait-slides.css`)
- Section comments use `/* ── <title> ─── */` rulers.
- Inline explanatory comments are written above the relevant rule.
- Property ordering: position → dimensions → offsets → transform → overflow → misc.

### JavaScript (`portrait-slides.js`)
- Wrapped in a single IIFE: `(function () { 'use strict'; … }());`
- JSDoc comments on every exported/public function.
- `var` for all variable declarations (ES5).
- Error paths `try/catch` silently (Plotly resize failures are non-fatal).
- Bootstrap code at the bottom of the IIFE, after all function declarations.

---

## How to validate changes locally

There is no test runner or build system.  Validate changes by opening `index.html` directly in a browser:

```bash
# any static server works, e.g.:
npx serve .
# then open http://localhost:3000/index.html
```

Check the following manually:

1. **Landscape slides** render normally (slides 1, 2, 4, 6, 8, 10).
2. **Portrait slides** are rotated 90° and scaled to fit the viewport (slides 3, 5, 7, 9).
3. **Plotly charts** resize correctly when navigating to slides 6, 7, 8, 9.
4. **Print-PDF mode** — open `index.html?print-pdf`, confirm portrait slides are rotated but not scaled.
5. No JavaScript errors in the browser console.

---

## Common tasks

### Add a new portrait slide to the demo
Add a `<section class="portrait">` block to `index.html`.  
Either wrap content in `<div class="portrait-content">` manually, or omit it and rely on the auto-wrap in `portrait-slides.js`.

### Change the default slide dimensions
Update `--slide-width` and `--slide-height` in the `:root` block of `portrait-slides.css`.  
These values are overwritten at runtime by `syncSlideDimensions()` in `portrait-slides.js`, so also update the fallback values there (`width` defaults to `960`, `height` to `700`).

### Add a new CSS utility class
Add it to `portrait-slides.css`, under the relevant section comment.

### Expose a new JS helper
Add the function inside the IIFE in `portrait-slides.js`, document it with JSDoc, and register it on `window.PortraitSlides`.

---

## Out of scope

The following are intentionally outside this project and should **not** be added unless the issue explicitly requests them:

- A Node.js / npm build pipeline
- Unit tests or a test framework
- A CI workflow
- Support for Reveal.js plugins beyond the core
- Server-side rendering
