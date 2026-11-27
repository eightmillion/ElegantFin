/* ElegantFin — reliable series synopsis expand/collapse.
 * Jellyfin can replace the overview button during client-side navigation.
 */
(() => {
    if (window.__elegantFinSeriesOverviewExpand) return;
    window.__elegantFinSeriesOverviewExpand = true;

    const getElements = () => {
        const page = document.querySelector('#itemDetailPage:not(.hide)');
        if (!page?.querySelector('.btnPlaystate[data-type="Series"]')) return null;

        const overview = page.querySelector('.detailSectionContent .overview');
        const button = page.querySelector('.detailSectionContent .overview-expand');
        if (!overview || !button) return null;

        return { overview, button };
    };

    let observedOverview = null;
    const resizeObserver = new ResizeObserver(() => schedule());

    const refresh = () => {
        const elements = getElements();

        if (elements?.overview !== observedOverview) {
            resizeObserver.disconnect();
            observedOverview = elements?.overview || null;
            if (observedOverview) resizeObserver.observe(observedOverview);
        }

        if (!elements) return;

        const { overview, button } = elements;
        const collapsed = overview.classList.contains('detail-clamp-text');

        // In the collapsed state, scrollHeight reveals clipped lines.
        // An expanded overview needs its button to remain visible for collapse.
        const overflowing = overview.scrollHeight > overview.clientHeight + 2;
        const needsButton = !collapsed || overflowing;

        if (button.classList.contains('hide') === needsButton) {
            button.classList.toggle('hide', !needsButton);
        }

        button.setAttribute('aria-expanded', String(!collapsed));
        const label = collapsed ? 'Show more' : 'Show less';
        if (button.getAttribute('aria-label') !== label) {
            button.setAttribute('aria-label', label);
        }
    };

    // Capture before Jellyfin's own (occasionally missing) handler, so the
    // action always executes exactly once even after a partial page refresh.
    document.addEventListener('click', (event) => {
        const button = event.target.closest?.('.overview-expand');
        if (!button) return;

        const elements = getElements();
        if (!elements || button !== elements.button) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        const { overview } = elements;
        const wasCollapsed = overview.classList.contains('detail-clamp-text');
        overview.classList.toggle('detail-clamp-text', !wasCollapsed);

        button.setAttribute('aria-expanded', String(wasCollapsed));
        button.setAttribute('aria-label', wasCollapsed ? 'Show less' : 'Show more');

        schedule();
    }, true);

    let scheduled = false;
    function schedule() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            refresh();
        });
    }

    const start = () => {
        const observer = new MutationObserver(schedule);
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        document.addEventListener('viewshow', schedule);
        window.addEventListener('hashchange', schedule);
        window.addEventListener('popstate', schedule);
        window.addEventListener('resize', schedule, { passive: true });
        schedule();
    };

    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
