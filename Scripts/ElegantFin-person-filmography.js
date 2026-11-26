/* ElegantFin — person filmography enhancement.
 * Keep Jellyfin's native card rendering; expand only person/movie queries.
 */
(() => {
    if (window.__elegantFinPersonFilmography) return;
    window.__elegantFinPersonFilmography = true;

    const PREVIEW_LIMIT = 50;
    const MORE_CLASS = 'elegantfinPersonFilmographyMore';
    const getPersonPage = () => {
        const page = document.querySelector('#itemDetailPage:not(.hide)');
        return page?.querySelector(
            '.detailImageContainer .person, .detailImageContainer .squareCard .cardImageContainer[data-src=""]'
        ) ? page : null;
    };

    // The legacy Jellyfin 12 item detail controller requests a 10-card
    // person-filmography preview through ApiClient.getItems. Expanding its
    // limit keeps its own card builder, context menus, and watched indicators.
    const patchApiClient = () => {
        const client = window.ApiClient;
        if (!client || typeof client.getItems !== 'function') return;
        if (client.getItems.__elegantFinPersonFilmography) return;

        const original = client.getItems;
        const enhanced = function (userId, options, ...rest) {
            if (options && typeof options === 'object') {
                const personIds = options.PersonIds ?? options.personIds;
                const types = options.IncludeItemTypes ?? options.includeItemTypes;
                const limit = options.Limit ?? options.limit;
                const hasPerson = Array.isArray(personIds)
                    ? personIds.length > 0
                    : typeof personIds === 'string' && personIds.length > 0;
                const isMovie = Array.isArray(types)
                    ? types.includes('Movie')
                    : typeof types === 'string' && types.split(',').includes('Movie');

                if (hasPerson && isMovie && Number(limit) === 10) {
                    options = { ...options };
                    if ('Limit' in options) options.Limit = PREVIEW_LIMIT;
                    else options.limit = PREVIEW_LIMIT;
                }
            }
            return original.call(this, userId, options, ...rest);
        };
        enhanced.__elegantFinPersonFilmography = true;
        client.getItems = enhanced;
    };

    const positionMore = () => {
        // Jellyfin's filmography sections need not live under
        // .detailPageSecondaryContainer. Find the exact native Movies
        // link instead of assuming the wrapper hierarchy.
        const page = document.querySelector('#itemDetailPage:not(.hide)');
        if (!page) return;

        for (const section of page.querySelectorAll('.verticalSection')) {
            const heading = section.querySelector('.sectionTitle');
            if (heading?.textContent.trim() !== 'Movies') continue;

            const link = section.querySelector(
                '.sectionTitleContainer a[href*="personId="][href*="type=Movie"]'
            ) || section.querySelector('a.' + MORE_CLASS);
            if (!link) continue;

            if (!link.classList.contains(MORE_CLASS)) {
                link.classList.add(MORE_CLASS);
            }
            if (link.hasAttribute('style')) link.removeAttribute('style');

            const button = link.querySelector('button.more');
            if (button && button.textContent !== 'View all movies') {
                button.textContent = 'View all movies';
            }

            // Only move when necessary. Avoid triggering the DOM observer
            // repeatedly by re-appending an already placed element.
            if (link.parentElement !== section || link !== section.lastElementChild) {
                section.appendChild(link);
            }
        }
    };

    let scheduled = false;
    const update = () => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            patchApiClient();
            positionMore();
        });
    };

    const start = () => {
        patchApiClient();
        const observer = new MutationObserver(update);
        observer.observe(document.body, { childList: true, subtree: true });
        document.addEventListener('viewshow', update);
        window.addEventListener('hashchange', update);
        window.addEventListener('popstate', update);
        update();
    };

    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
