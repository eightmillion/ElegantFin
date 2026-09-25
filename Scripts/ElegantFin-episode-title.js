(() => {
    if (window.__elegantFinEpisodeEnhancementsV2) return;
    window.__elegantFinEpisodeEnhancementsV2 = true;
    window.__elegantFinEpisodeTitleSplitter = true;

    const supportedLayout = () => {
        const root = document.documentElement;
        return root.classList.contains('layout-desktop')
            || root.classList.contains('layout-mobile');
    };

    const restoreEpisodeTitle = (page) => {
        const itemName = page?.querySelector('.nameContainer > .itemName');
        if (!itemName || itemName.dataset.elegantfinEpisodeSplit !== 'true') return;

        const originalHtml = itemName.dataset.elegantfinOriginalHtml;
        if (originalHtml) itemName.innerHTML = originalHtml;

        itemName.classList.remove('elegantfinEpisodeTitleSplit');
        delete itemName.dataset.elegantfinEpisodeSplit;
        delete itemName.dataset.elegantfinOriginalHtml;
    };

    const splitEpisodeTitle = (page) => {
        if (!page || !page.querySelector('.btnPlaystate[data-type="Episode"]')) return;

        const itemName = page.querySelector('.nameContainer > .itemName');
        if (!itemName || itemName.dataset.elegantfinEpisodeSplit === 'true') return;

        const bdi = itemName.querySelector('bdi') || itemName;
        const seasonLink = bdi.querySelector('a[data-type="Season"]');
        if (!seasonLink) return;

        let trailingText = '';
        for (const node of bdi.childNodes) {
            if (node !== seasonLink) trailingText += node.textContent || '';
        }

        let match = trailingText.trim().match(/^[-–—]\s*(\d+)\.\s*(.+)$/s);

        if (!match) {
            const seasonText = seasonLink.textContent.trim();
            const fullText = itemName.textContent.trim();
            const remainder = fullText.startsWith(seasonText)
                ? fullText.slice(seasonText.length).trim()
                : '';
            match = remainder.match(/^[-–—]\s*(\d+)\.\s*(.+)$/s);
        }

        if (!match) return;

        const episodeNumber = match[1];
        const episodeTitle = match[2].trim();
        if (!episodeTitle) return;

        itemName.dataset.elegantfinOriginalHtml = itemName.innerHTML;

        const seasonLine = document.createElement('span');
        seasonLine.className = 'elegantfinEpisodeSeason';
        seasonLine.appendChild(seasonLink);

        const numberLine = document.createElement('span');
        numberLine.className = 'elegantfinEpisodeNumber';
        numberLine.textContent = `Episode ${episodeNumber}`;

        const titleLine = document.createElement('span');
        titleLine.className = 'elegantfinEpisodeName';
        titleLine.textContent = episodeTitle;

        itemName.textContent = '';
        itemName.append(seasonLine, numberLine, titleLine);
        itemName.classList.add('elegantfinEpisodeTitleSplit');
        itemName.dataset.elegantfinEpisodeSplit = 'true';
    };

    const disableEpisodeLogoLink = (page) => {
        const logo = page?.querySelector(':scope > .detailLogo');
        if (!logo) return;

        logo.classList.remove('elegantfinClickableSeriesLogo');
        logo.removeAttribute('role');
        logo.removeAttribute('tabindex');
        logo.removeAttribute('aria-label');
    };

    const makeEpisodeLogoClickable = (page) => {
        if (!page?.querySelector('.btnPlaystate[data-type="Episode"]')) {
            disableEpisodeLogoLink(page);
            return;
        }

        const logo = page.querySelector(':scope > .detailLogo');
        const seriesLink = page.querySelector(
            '.nameContainer a.itemAction[data-type="Series"][data-id]'
        );

        if (
            !logo
            || !seriesLink
            || logo.classList.contains('hide')
        ) {
            disableEpisodeLogoLink(page);
            return;
        }

        logo.classList.add('elegantfinClickableSeriesLogo');
        logo.setAttribute('role', 'link');
        logo.setAttribute('tabindex', '0');
        logo.setAttribute(
            'aria-label',
            `Open ${seriesLink.textContent.trim() || 'series'}`
        );

        if (logo.dataset.elegantfinSeriesLinkBound === 'true') return;
        logo.dataset.elegantfinSeriesLinkBound = 'true';

        const openSeries = () => {
            if (!supportedLayout()) return;

            const currentPage = logo.closest('.itemDetailPage');
            if (!currentPage?.querySelector('.btnPlaystate[data-type="Episode"]')) return;

            const currentSeriesLink = currentPage.querySelector(
                '.nameContainer a.itemAction[data-type="Series"][data-id]'
            );

            currentSeriesLink?.click();
        };

        logo.addEventListener('click', openSeries);

        logo.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openSeries();
            }
        });
    };

    const run = () => {
        const pages = new Set(document.querySelectorAll('#itemDetailPage, .itemDetailPage'));
        pages.forEach((page) => {
            if (supportedLayout()) {
                splitEpisodeTitle(page);
                makeEpisodeLogoClickable(page);
            } else {
                restoreEpisodeTitle(page);
                disableEpisodeLogoLink(page);
            }
        });
    };

    let scheduled = false;
    const schedule = () => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            run();
        });
    };

    const start = () => {
        const observer = new MutationObserver(schedule);
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });

        window.addEventListener('hashchange', schedule);
        window.addEventListener('popstate', schedule);
        schedule();
    };

    if (document.body) {
        start();
    } else {
        window.addEventListener('DOMContentLoaded', start, { once: true });
    }
})();
