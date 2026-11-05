(() => {
    if (window.__elegantFinSeriesSeasonNav) return;
    window.__elegantFinSeriesSeasonNav = true;

    const NAV_CLASS = 'seriesSeasonNav';
    let generation = 0;

    const getActivePage = () => (
        document.querySelector('#itemDetailPage:not(.hide)')
        || document.querySelector('.itemDetailPage:not(.hide)')
    );

    const removeNav = () => {
        document
            .querySelectorAll(`.${NAV_CLASS}`)
            .forEach(el => el.remove());
    };

    const install = () => {
        const page = getActivePage();

        if (!page?.querySelector('.btnPlaystate[data-type="Series"]')) {
            removeNav();
            return false;
        }

        const section =
            page.querySelector('#listChildrenCollapsible:not(.hide)');
        const row =
            section?.querySelector('.itemsContainer');
        const cards =
            row?.querySelectorAll('.card');

        if (!section || !row || !cards?.length) {
            return false;
        }

        section.querySelector(`.${NAV_CLASS}`)?.remove();

        const nav = document.createElement('div');
        nav.className = NAV_CLASS;

        const previous = document.createElement('button');
        previous.type = 'button';
        previous.className = 'seriesSeasonPrev';
        previous.title = 'Previous seasons';
        previous.setAttribute('aria-label', 'Previous seasons');
        previous.innerHTML = '<span class="material-icons">chevron_left</span>';

        const next = document.createElement('button');
        next.type = 'button';
        next.className = 'seriesSeasonNext';
        next.title = 'Next seasons';
        next.setAttribute('aria-label', 'Next seasons');
        next.innerHTML = '<span class="material-icons">chevron_right</span>';

        nav.append(previous, next);
        section.append(nav);

        const update = () => {
            const max = Math.max(
                0,
                row.scrollWidth - row.clientWidth
            );

            nav.hidden = max < 4;
            previous.disabled = row.scrollLeft < 4;
            next.disabled = row.scrollLeft > max - 4;
        };

        const amount = () => Math.max(
            300,
            row.clientWidth * .85
        );

        previous.addEventListener('click', () => {
            row.scrollBy({
                left: -amount(),
                behavior: 'smooth'
            });
        });

        next.addEventListener('click', () => {
            row.scrollBy({
                left: amount(),
                behavior: 'smooth'
            });
        });

        row.addEventListener('scroll', update, { passive: true });

        const resizeObserver = new ResizeObserver(update);
        resizeObserver.observe(row);

        requestAnimationFrame(update);
        setTimeout(update, 250);

        return true;
    };

    const refresh = () => {
        const thisGeneration = ++generation;

        removeNav();

        let attempts = 0;

        const retry = () => {
            if (thisGeneration !== generation) return;

            if (install()) return;

            if (++attempts < 100) {
                setTimeout(retry, 100);
            }
        };

        retry();
    };

    document.addEventListener('viewshow', refresh);
    window.addEventListener('hashchange', refresh);
    window.addEventListener('popstate', refresh);

    refresh();
})();
