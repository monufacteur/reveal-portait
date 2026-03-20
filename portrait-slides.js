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
        var width  = typeof cfg.width  === 'number' ? cfg.width  : 1122;
        var height = typeof cfg.height === 'number' ? cfg.height : 794;
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
        var height = typeof cfg.height === 'number' ? cfg.height : 794;

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
     * Trigger a resize event on every Plotly chart in the entire document.
     * Used when all slides are visible simultaneously (print-pdf mode) or
     * just before the browser captures the print layout.
     */
    function resizeAllPlots() {
        if (!window.Plotly) { return; }
        document.querySelectorAll('.js-plotly-plot').forEach(function (plot) {
            try { Plotly.Plots.resize(plot); } catch (_) {}
        });
    }

    /**
     * Inject the presentation toolbar into the page and wire up the
     * mode-appropriate action button.
     *
     * Outside print-pdf mode the toolbar shows a "Toggle Print Mode" button
     * that navigates to ?print-pdf so Reveal.js can build its PDF page layout
     * (creates .pdf-page containers and centres each section on the page).
     *
     * Inside print-pdf mode the toolbar shows a "Print" button that calls
     * window.print() directly.  This two-step flow makes the required
     * navigation explicit to the user:
     *   Presentation → (Toggle Print Mode) → Print Mode → (Print) → dialog
     *
     * The toolbar element carries id="presentation-toolbar" so that
     * portrait-slides.css can hide it via @media print.
     */
    function initToolbar() {
        /* Do nothing if the toolbar is already present (e.g. called twice). */
        if (document.getElementById('presentation-toolbar')) { return; }

        var isPrintPdf = document.documentElement.classList.contains('print-pdf');

        var toolbar = document.createElement('div');
        toolbar.id = 'presentation-toolbar';

        var titleEl = document.createElement('span');
        titleEl.className = 'toolbar-title';
        titleEl.textContent = document.title;
        toolbar.appendChild(titleEl);

        var btn = document.createElement('button');
        btn.className = 'toolbar-print-btn';
        btn.type = 'button';
        btn.textContent = isPrintPdf
            ? '\uD83D\uDDA8 Print'
            : '\uD83D\uDDA8 Toggle Print Mode';
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
            /*
             * Re-read the class at click time rather than relying on the
             * captured `isPrintPdf` value, so the handler reflects the
             * current page state even if the class was toggled externally.
             */
            if (document.documentElement.classList.contains('print-pdf')) {
                /*
                 * Already in print-pdf mode — Reveal.js has built the
                 * .pdf-page layout.  Resize any Plotly charts to the current
                 * (rotated) layout dimensions, then open the print dialog.
                 */
                resizeAllPlots();
                requestAnimationFrame(function () {
                    window.print();
                });
            } else {
                /*
                 * Navigate to the print-pdf URL so Reveal.js builds the PDF
                 * page layout (creates .pdf-page containers, centres sections).
                 * The "Print" button visible in that view lets the user then
                 * trigger the print dialog.
                 *
                 * Only the pathname is preserved; any existing query string or
                 * hash is intentionally dropped because ?print-pdf mode renders
                 * all slides simultaneously and the slide-position hash is not
                 * meaningful in that context.
                 */
                window.location.replace(
                    window.location.pathname + '?print-pdf');
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
        if (document.documentElement.classList.contains('print-pdf')) {
            /*
             * In print-pdf mode all slides are rendered simultaneously.
             * Schedule a resize of every Plotly chart after a short delay so
             * it runs after the page's own 'ready' handler has finished
             * creating the charts.  Without this, charts that were initialised
             * while their containers had incorrect dimensions (e.g. because
             * Reveal.js had not yet finished its pdf-page layout) remain
             * mis-sized until the next explicit resize call.
             *
             * 300 ms is sufficient for the synchronous chart-creation code to
             * complete and for the browser to perform a layout pass.
             */
            setTimeout(function () {
                resizeAllPlots();
            }, 300);
        } else {
            /* Resize any charts that happen to be on the opening slide. */
            resizePlotsInSlide(Reveal.getCurrentSlide());
        }
    });

    Reveal.on('slidechanged', function (event) {
        resizePlotsInSlide(event.currentSlide);
    });

    /*
     * Resize all Plotly charts just before the browser captures the print
     * layout.  This fires for both the toolbar button (via window.print())
     * and the browser's native print shortcut (Ctrl / ⌘ + P).
     *
     * When the print dialog opens in ?print-pdf mode the charts are already
     * in the correct rotated layout; calling resize() here ensures the SVG
     * dimensions are up-to-date so the browser's print renderer captures
     * them correctly instead of showing blank / clipped areas.
     */
    window.addEventListener('beforeprint', resizeAllPlots);

    /* Expose helpers for manual use if needed. */
    window.PortraitSlides = {
        syncSlideDimensions: syncSlideDimensions,
        wrapPortraitSlides:  wrapPortraitSlides,
        resizePlotsInSlide:  resizePlotsInSlide,
        resizeAllPlots:      resizeAllPlots,
        initToolbar:         initToolbar
    };
}());
