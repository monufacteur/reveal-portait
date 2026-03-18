/**
 * Portrait Slides Template — portrait-slides.js
 *
 * Provides three behaviours for portrait slides inside a Reveal.js deck:
 *
 *  1. Dimension sync  — keeps the CSS custom properties --slide-width,
 *                       --slide-height, and --portrait-scale in sync with
 *                       the Reveal.js config so the rotation and scaling
 *                       maths always works for non-default sizes.
 *
 *  2. Auto-wrap       — if a <section class="portrait"> does not already
 *                       contain a .portrait-content child, all visible child
 *                       nodes are automatically moved into one (speaker-notes
 *                       <aside> elements are left as direct section children).
 *
 *  3. Plotly resize   — fires Plotly.Plots.resize() for every Plotly chart
 *                       inside the slide that just became visible, so charts
 *                       render at the correct dimensions after transitions.
 *
 * Loading order in your HTML
 * --------------------------
 *   <script src="reveal.js"></script>          <!-- must come first -->
 *   <script src="portrait-slides.js"></script>  <!-- registers before init -->
 *   <script>
 *     Reveal.initialize({ … });
 *   </script>
 */
(function () {
    'use strict';

    /**
     * Update --slide-width / --slide-height to match the Reveal.js config.
     * Also sets --portrait-scale (slide-height / slide-width) for use by the
     * presentation-mode CSS that scales portrait content to fit the viewport.
     * Called once when Reveal fires the 'ready' event.
     */
    function syncSlideDimensions() {
        if (!window.Reveal) { return; }
        var cfg    = Reveal.getConfig();
        var width  = typeof cfg.width  === 'number' ? cfg.width  : 960;
        var height = typeof cfg.height === 'number' ? cfg.height : 700;
        var root   = document.documentElement;
        root.style.setProperty('--slide-width',    width  + 'px');
        root.style.setProperty('--slide-height',   height + 'px');
        /* Unitless scale factor: keeps pre-rotation element within section
         * bounds so Reveal's overflow:hidden containers cannot clip it.    */
        root.style.setProperty('--portrait-scale', (height / width).toFixed(6));
    }

    /**
     * Auto-wrap portrait slide content in a .portrait-content div if the
     * author has not done so manually.
     * <aside class="notes"> elements are excluded so speaker notes remain
     * direct children of <section> (required by Reveal.js).
     *
     * Also ensures each portrait section has an explicit height so it is
     * painted correctly in the Reveal.js stacking context (a 0-height
     * section with only absolute children would be hidden by the background
     * layer).
     */
    function wrapPortraitSlides() {
        var cfg    = window.Reveal ? Reveal.getConfig() : {};
        var height = typeof cfg.height === 'number' ? cfg.height : 700;

        var sections = document.querySelectorAll('.reveal section.portrait');
        sections.forEach(function (section) {
            /* Enforce explicit height so the section is never 0 px. */
            var computedH = window.getComputedStyle(section).height;
            if (!computedH || computedH === '0px' || computedH === 'auto') {
                section.style.height = height + 'px';
            }

            /* Already has a wrapper — nothing to do. */
            if (section.querySelector(':scope > .portrait-content')) { return; }

            var wrapper = document.createElement('div');
            wrapper.className = 'portrait-content';

            /*
             * Snapshot the child list *before* we start moving nodes so that
             * DOM mutations during the loop do not affect the iteration.
             */
            var children = Array.from(section.childNodes);
            children.forEach(function (node) {
                /* Keep <aside class="notes"> as a direct child of <section>. */
                if (node.nodeType === 1 &&
                    node.tagName  === 'ASIDE' &&
                    node.classList.contains('notes')) {
                    return;
                }
                wrapper.appendChild(node);
            });

            /*
             * Insert the wrapper before the first remaining child (which will
             * be the notes element if one exists, or null for an append).
             */
            section.insertBefore(wrapper, section.firstChild);
        });
    }

    /**
     * Trigger a resize event on all Plotly charts inside a slide element.
     * This ensures charts redraw correctly after Reveal slide transitions.
     *
     * @param {Element|null} slideEl  The <section> that just became current.
     */
    function resizePlotsInSlide(slideEl) {
        if (!slideEl || !window.Plotly) { return; }
        slideEl.querySelectorAll('.js-plotly-plot').forEach(function (plot) {
            try {
                Plotly.Plots.resize(plot);
            } catch (_) {
                /* Ignore — chart may not yet be fully initialised. */
            }
        });
    }

    /* ── Bootstrap: hook into Reveal.js events ────────────────────────────── */
    if (!window.Reveal) {
        console.warn('portrait-slides.js: Reveal.js not found. ' +
                     'Load reveal.js before portrait-slides.js.');
        return;
    }

    Reveal.on('ready', function () {
        syncSlideDimensions();
        wrapPortraitSlides();
        /* Resize any charts that happen to be on the opening slide. */
        resizePlotsInSlide(Reveal.getCurrentSlide());
    });

    Reveal.on('slidechanged', function (event) {
        resizePlotsInSlide(event.currentSlide);
    });

    /* Expose helpers for manual use if needed. */
    window.PortraitSlides = {
        syncSlideDimensions: syncSlideDimensions,
        wrapPortraitSlides:  wrapPortraitSlides,
        resizePlotsInSlide:  resizePlotsInSlide
    };
}());
