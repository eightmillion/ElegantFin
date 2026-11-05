(() => {
    'use strict';

    if (window.__elegantFinGuideArt) return;
    window.__elegantFinGuideArt = true;

    const STYLE_ID = 'jf-guide-art-style';
    const SEEN_ATTR = 'data-jf-guide-art-seen';

    // Jellyfin is commonly served at /web/, or under a base URL such as
    // /jellyfin/web/. The API lives one level above /web/.
    const webMarker = '/web/';
    const path = window.location.pathname;
    const markerIndex = path.indexOf(webMarker);
    const basePath = markerIndex >= 0 ? path.slice(0, markerIndex) : '';

    if (!document.getElementById(STYLE_ID)) {
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .programCell.jfGuideArt {
                isolation: isolate;
            }

            .programCell.jfGuideArt::before,
            .programCell.jfGuideArt::after {
                content: '';
                position: absolute;
                inset: 0;
                pointer-events: none;
            }

            .programCell.jfGuideArt::before {
                z-index: 0;
                background-image: var(--jf-guide-art);
                background-size: cover;
                background-position: center 35%;
                background-repeat: no-repeat;
                opacity: 0.62;
            }

            .programCell.jfGuideArt::after {
                z-index: 1;
                background: linear-gradient(
                    90deg,
                    rgba(0, 0, 0, 0.82) 0%,
                    rgba(0, 0, 0, 0.58) 48%,
                    rgba(0, 0, 0, 0.28) 100%
                );
            }

            .programCell.jfGuideArt > * {
                position: relative;
                z-index: 2;
            }

            .programCell.jfGuideArt .guideProgramNameText {
                text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
            }
        `;
        document.head.appendChild(style);
    }

    function imageUrl(cell) {
        const id = cell.dataset.id;
        if (!id) return null;

        return `${window.location.origin}${basePath}/Items/${encodeURIComponent(id)}/Images/Primary?maxHeight=180&quality=72`;
    }

    const imageObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;

            const cell = entry.target;
            imageObserver.unobserve(cell);

            const url = imageUrl(cell);
            if (!url) continue;

            // Only decorate the cell when the image really exists. This avoids
            // changing the appearance of programs with no XMLTV artwork.
            const probe = new Image();
            probe.onload = () => {
                if (!cell.isConnected) return;
                cell.style.setProperty('--jf-guide-art', `url("${url}")`);
                cell.classList.add('jfGuideArt');
            };
            probe.src = url;
        }
    }, {
        root: null,
        rootMargin: '200px 400px',
        threshold: 0.01
    });

    function scan(root = document) {
        if (root.nodeType !== Node.ELEMENT_NODE && root !== document) return;

        if (root.matches?.(`.programCell[data-id]:not([${SEEN_ATTR}])`)) {
            root.setAttribute(SEEN_ATTR, '1');
            imageObserver.observe(root);
        }

        root.querySelectorAll?.(`.programCell[data-id]:not([${SEEN_ATTR}])`).forEach((cell) => {
            cell.setAttribute(SEEN_ATTR, '1');
            imageObserver.observe(cell);
        });
    }

    const mutationObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                scan(node);
            }
        }
    });

    mutationObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    scan();
})();
