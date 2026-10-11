(() => {
    'use strict';

    /*
       Jellyfin 12's "Auto" layout can mis-detect Chrome on Android as desktop
       because its legacy layout choice is based on browser.mobile, which is
       derived largely from the user-agent string. Correct only automatic/default
       layout choices only on Android touch devices with phone/tablet-sized screens. Explicit
       Desktop/Mobile/TV choices are preserved.
    */
    const touchDevice =
        navigator.maxTouchPoints > 0
        || window.matchMedia?.('(pointer: coarse)').matches;

    const androidPlatform =
        navigator.userAgentData?.platform === 'Android'
        || /\\bAndroid\\b/i.test(navigator.userAgent);

    const shortSide = Math.min(
        window.screen?.width || window.innerWidth,
        window.screen?.height || window.innerHeight
    );

    if (androidPlatform && touchDevice && shortSide <= 900) {
        try {
            const savedLayout = localStorage.getItem('layout');

            if (
                savedLayout === null
                || savedLayout === ''
                || savedLayout === 'auto'
                || savedLayout === 'modern'
            ) {
                localStorage.setItem('layout', 'mobile-legacy');
                window.location.reload();
                return;
            }
        } catch (err) {
            console.warn('ElegantFin mobile layout fix:', err);
        }
    }

    if (window.__elegantFinMobileBackdrop) return;
    window.__elegantFinMobileBackdrop = true;

    let generation = 0;

    const supportedLayout = () =>
        document.documentElement.classList.contains('layout-mobile');

    const activePage = () =>
        document.querySelector('#itemDetailPage:not(.hide)')
        || document.querySelector('.itemDetailPage:not(.hide)');

    const currentId = (event) =>
        event?.detail?.params?.id
        || new URLSearchParams(location.hash.split('?')[1] || '').get('id');

    const scaledWidth = () =>
        Math.min(
            1920,
            Math.max(
                960,
                Math.ceil(window.innerWidth * (window.devicePixelRatio || 1) * 1.5)
            )
        );

    function backdropUrl(item) {
        if (!window.ApiClient || !item) return null;

        const options = {
            maxWidth: scaledWidth(),
            quality: 85
        };

        if (item.Id && item.BackdropImageTags?.length) {
            return window.ApiClient.getScaledImageUrl(item.Id, {
                ...options,
                type: 'Backdrop',
                index: 0,
                tag: item.BackdropImageTags[0]
            });
        }

        if (
            item.ParentBackdropItemId
            && item.ParentBackdropImageTags?.length
        ) {
            return window.ApiClient.getScaledImageUrl(
                item.ParentBackdropItemId,
                {
                    ...options,
                    type: 'Backdrop',
                    index: 0,
                    tag: item.ParentBackdropImageTags[0]
                }
            );
        }

        if (item.Id && item.ImageTags?.Primary) {
            return window.ApiClient.getScaledImageUrl(item.Id, {
                ...options,
                type: 'Primary',
                tag: item.ImageTags.Primary
            });
        }

        return null;
    }

    function clear(page) {
        const backdrop =
            page?.querySelector('#itemBackdrop')
            || page?.querySelector('.itemBackdrop');

        if (!backdrop) return;

        backdrop.style.removeProperty('background-image');
        backdrop.removeAttribute('data-elegantfin-backdrop');
    }

    async function refresh(event) {
        const myGeneration = ++generation;

        if (!supportedLayout() || !window.ApiClient) return;

        const id = currentId(event);
        if (!id) return;

        const page = activePage();
        if (!page) return;

        try {
            const item = await window.ApiClient.getItem(
                window.ApiClient.getCurrentUserId(),
                id
            );

            if (myGeneration !== generation) return;

            // Person and Book pages intentionally do not use detail backdrops.
            if (item.Type === 'Person' || item.Type === 'Book') {
                clear(page);
                return;
            }

            const url = backdropUrl(item);
            if (!url) {
                clear(page);
                return;
            }

            const image = new Image();

            image.onload = () => {
                if (myGeneration !== generation) return;

                const currentPage = activePage();
                if (currentPage !== page) return;

                const backdrop =
                    page.querySelector('#itemBackdrop')
                    || page.querySelector('.itemBackdrop');

                if (!backdrop) return;

                backdrop.style.setProperty(
                    'background-image',
                    `url("${url}")`,
                    'important'
                );
                backdrop.classList.remove('lazy-hidden');
                backdrop.setAttribute('data-elegantfin-backdrop', 'true');
            };

            image.src = url;
        } catch (err) {
            console.warn('ElegantFin mobile backdrop:', err);
        }
    }

    document.addEventListener('viewshow', refresh);
    window.addEventListener('hashchange', refresh);
    window.addEventListener('popstate', refresh);

    refresh();
})();
