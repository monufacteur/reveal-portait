# reveal-portait

A lightweight template that adds **portrait-oriented slides** to a standard [Reveal.js](https://revealjs.com/) presentation deck.  
Mix landscape and portrait slides freely, export clean PDFs, and embed interactive [Plotly.js](https://plotly.com/javascript/) charts in either orientation.

---

## Features

| Feature | Details |
|---|---|
| Portrait slides | Add `class="portrait"` to any `<section>` |
| Auto-wrap | `portrait-slides.js` wraps content automatically — no manual `.portrait-content` needed |
| Correct PDF export | Portrait slides rotate 90° on the landscape PDF page |
| Plotly resize | Charts redraw at the right size after every slide transition |
| Custom slide sizes | Changing `width`/`height` in `Reveal.initialize()` propagates automatically through CSS custom properties |

---

## Repository layout

```
reveal-portait/
├── portrait-slides.css   # Rotation & scaling styles (presentation and print-PDF)
├── portrait-slides.js    # Dimension sync, auto-wrap, Plotly resize
├── index.html            # Full example deck (10 slides, landscape + portrait + charts)
└── vendor/
    ├── reveal/           # Local copy of Reveal.js (reveal.js, reveal.css, reset.css, themes)
    └── plotly-2.29.1.min.js
```

---

## Quick start

1. **Copy the two template files** into your project:
   - `portrait-slides.css`
   - `portrait-slides.js`

2. **Link them in your HTML**, after the Reveal.js scripts:

   ```html
   <link rel="stylesheet" href="portrait-slides.css">

   <script src="reveal.js"></script>
   <script src="portrait-slides.js"></script>   <!-- must come after reveal.js -->
   <script>
     Reveal.initialize({ width: 960, height: 700 });
   </script>
   ```

3. **Mark portrait sections** with the `portrait` class:

   ```html
   <section class="portrait">
     <div class="portrait-content">
       <!-- tall content here -->
     </div>
   </section>
   ```

   > **Tip:** You can omit `<div class="portrait-content">` entirely — `portrait-slides.js`
   > wraps child nodes automatically when the slide loads.

---

## How it works

### CSS (`portrait-slides.css`)

The slide dimensions are exposed as CSS custom properties so the rotation
maths is always accurate:

```css
:root {
  --slide-width:    960px;  /* updated by JS on Reveal's 'ready' event */
  --slide-height:   700px;
  --portrait-scale: 1;      /* slide-height / slide-width ≈ 0.729 */
}
```

`.portrait-content` is sized to `slide-height × slide-width` (swapped),
positioned so its centre aligns with the slide centre, then rotated 90°:

```
Pre-rotation box:  700 wide × 960 tall
After rotate(90°): 960 wide × 700 tall  ← fits the landscape slide exactly
```

In **presentation mode** an additional `scale(--portrait-scale)` keeps the
box inside Reveal's `overflow:hidden` containers.  
In **print-PDF mode** (`?print-pdf`) the scale is omitted so the rotated
content fills the landscape page completely.

### JavaScript (`portrait-slides.js`)

Three behaviours are registered on Reveal's `ready` event:

1. **`syncSlideDimensions()`** — reads `Reveal.getConfig()` and writes
   `--slide-width`, `--slide-height`, and `--portrait-scale` to `:root`.
2. **`wrapPortraitSlides()`** — auto-wraps bare portrait `<section>` content
   in a `.portrait-content` div (skips `<aside class="notes">`).
3. **`resizePlotsInSlide()`** — calls `Plotly.Plots.resize()` on every
   `.js-plotly-plot` in the current slide on each `slidechanged` event.

The helpers are also exposed as `window.PortraitSlides.*` for manual use.

---

## PDF export

1. Open the presentation URL and append `?print-pdf`:  
   `http://localhost/index.html?print-pdf`
2. Open the browser's print dialog (`Ctrl`/`⌘` + `P`).
3. Choose **Save as PDF**, landscape orientation.

Portrait slides will appear rotated 90° and fill the landscape page.

---

## Browser support

Any modern browser that supports CSS `transform` and custom properties
(Chrome, Firefox, Safari, Edge).  No build step or bundler required.

---

## Dependencies

| Library | Version | Licence |
|---|---|---|
| [Reveal.js](https://revealjs.com/) | vendored in `vendor/reveal/` | MIT |
| [Plotly.js](https://plotly.com/javascript/) | 2.29.1 (vendored) | MIT |

Both libraries are bundled locally — no CDN calls are made at runtime.
