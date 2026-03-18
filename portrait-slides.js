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

    /**
     * Inject the presentation toolbar into the page and wire up the
     * Print / Export PDF button.
     *
     * The toolbar shows the document title and a button that:
     *  1. Temporarily enables the `print-pdf` layout class on <html>
     *     (the same class Reveal.js adds when ?print-pdf is in the URL),
     *     so portrait slides are rotated correctly in the printed output.
     *  2. Opens the browser print dialog.
     *  3. Restores the previous layout class state after the dialog closes.
     *
     * The toolbar element carries id="presentation-toolbar" so that
     * portrait-slides.css can hide it via @media print.
     */
    function initToolbar() {
        /* Do nothing if the toolbar is already present (e.g. called twice). */
        if (document.getElementById('presentation-toolbar')) { return; }

        var toolbar = document.createElement('div');
        toolbar.id = 'presentation-toolbar';

        var titleEl = document.createElement('span');
        titleEl.className = 'toolbar-title';
        titleEl.textContent = document.title;
        toolbar.appendChild(titleEl);

        var btn = document.createElement('button');
        btn.className = 'toolbar-print-btn';
        btn.type = 'button';
        btn.textContent = '\uD83D\uDDA8 Print / Export PDF';
        toolbar.appendChild(btn);

        /* Insert as the very first child of <body>. */
        document.body.insertBefore(toolbar, document.body.firstChild);

        /*
         * Measure the toolbar's rendered height and expose it as a CSS custom
         * property so the .reveal-viewport offset rule can consume it.
         * getBoundingClientRect() returns the exact pixel height after layout.
         */
        var toolbarHeight = toolbar.getBoundingClientRect().height;
        if (toolbarHeight > 0) {
            document.documentElement.style.setProperty(
                '--toolbar-height', Math.ceil(toolbarHeight) + 'px');
        }

        /* Re-run Reveal's layout so it recalculates with the reduced viewport. */
        if (window.Reveal && typeof Reveal.layout === 'function') {
            Reveal.layout();
        }

        btn.addEventListener('click', function () {
            var html = document.documentElement;
            var wasPrintPdf = html.classList.contains('print-pdf');

            /* Activate print-pdf layout so portrait slides render correctly. */
            if (!wasPrintPdf) {
                html.classList.add('print-pdf');
            }

            /*
             * Delay window.print() by one tick so the browser applies the
             * .print-pdf class change and re-renders before capturing the
             * print layout.  Without this delay, iOS Safari may snapshot the
             * pre-change state, causing portrait slides to appear unrotated.
             * 100 ms is enough for a style + layout pass on all tested
             * browsers; values below ~50 ms were unreliable on iOS Safari.
             */
            setTimeout(function () {
                window.print();
            }, 100);

            /*
             * Restore the class after printing.
             *
             * afterprint is the standard event but is not reliably fired on
             * all platforms (notably iOS Safari).  A timeout is therefore
             * registered as a fallback; the `restored` flag prevents the
             * class being removed twice.
             *
             * The 2 000 ms timeout is deliberately conservative: it is long
             * enough that a typical print dialog has closed (or the user has
             * switched away), yet short enough to feel responsive.  Because
             * the print snapshot is captured before the dialog appears, this
             * restore cannot affect the printed output.
             */
            if (!wasPrintPdf) {
                var restored = false;
                function restoreAfterPrint() {
                    if (restored) { return; }
                    restored = true;
                    html.classList.remove('print-pdf');
                    window.removeEventListener('afterprint', restoreAfterPrint);
                }
                window.addEventListener('afterprint', restoreAfterPrint);
                setTimeout(restoreAfterPrint, 2000);
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
        initToolbar();
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
        resizePlotsInSlide:  resizePlotsInSlide,
        initToolbar:         initToolbar
    };
}());
