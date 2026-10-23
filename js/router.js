// ============================================================
// js/router.js — роутер с защитой от петель
// ============================================================

let __routerBusy = false;
let __routerLastPath = null;

function safePushState(path) {
    if (typeof path !== 'string' || !path.startsWith('/')) return false;
    if (path.length > 1024) return false;
    const current = window.location.pathname + window.location.search;
    if (current === path) return false;
    try {
        window.history.pushState({}, '', path);
        return true;
    } catch (e) {
        console.warn('[router] pushState failed:', e);
        return false;
    }
}

function safeReplaceState(path) {
    if (typeof path !== 'string' || !path.startsWith('/')) return;
    const current = window.location.pathname + window.location.search;
    if (current === path) return;
    try { window.history.replaceState({}, '', path); }
    catch (e) { console.warn('[router] replaceState failed:', e); }
}

function showMainContent() {
    modal.classList.add('hidden');
    openedModalAlbum = null;
    playlistModal.classList.add('hidden');
    openedPlaylistTitle = null;
    artistPage.classList.add('hidden');

    const rvPage = document.getElementById('reviews-page');
    if (rvPage) rvPage.classList.add('hidden');

    // ★ Скрываем страницу угадайки при переходе на главную
    const guessPage = document.getElementById('guess-page');
    if (guessPage) guessPage.classList.add('hidden');

    mainContent.classList.remove('hidden');

    renderRecent();
    updatePlaybackUI();
    callFitAfterRender();

    // ★ Пересчитываем карусель после того, как mainContent снова видим
    requestAnimationFrame(() => {
        try {
            if (typeof goToSlide === 'function' && typeof currentSlide !== 'undefined') {
                goToSlide(currentSlide);
            }
            if (typeof startCarouselAuto === 'function') {
                startCarouselAuto();
            }
        } catch (e) {
            console.warn('[router] carousel restore failed:', e);
        }
    });

    updateSidebarActive();
}

function handleRouting() {
    if (__routerBusy) return;
    __routerBusy = true;
    try {
        // ?share=track&title=<Название> → карточка трека
        const sp = new URLSearchParams(window.location.search);
        const shareKind = sp.get('share');
        const shareTitle = sp.get('title');

        if (shareKind === 'track' && shareTitle) {
            openTrackShareView(shareTitle);
            return;
        }

        const path = getRelativePath();
        __routerLastPath = path;

        // ★ Если мы уходим НЕ на страницу угадайки — останавливаем её и разблокируем сайт
        if (path !== '/guess' && typeof stopGuessGame === 'function') {
            stopGuessGame();
        }

        const segments = path.replace(/^\/+/, '').split('/').filter(Boolean);

        console.log('[router] path:', path, '| segments:', segments);

        // /guess — Угадайка (★ Добавлено в самое начало роутинга)
        if (path === '/guess') {
            console.log('[router] → startGuessPage()');
            if (typeof startGuessPage === 'function') {
                startGuessPage();
            } else {
                console.error('Функция startGuessPage не найдена. Проверьте подключение js/guess.js');
            }
            return;
        }

        // /favorites — Избранное
        if (path === '/favorites') {
            console.log('[router] → openPlaylistModal()');
            try {
                openPlaylistModal();
            } catch (err) {
                console.error('[router] openPlaylistModal failed:', err);
                showMainContent();
            }
            return;
        }

        // /chart — Топ-50
        if (path === '/chart') {
            console.log('[router] → openAutoPlaylistModal (chart)');
            const chart = autoPlaylists.find(p => p.id === 'chart');
            if (chart) { openAutoPlaylistModal(chart); return; }
        }

        // /playlist/<id> — авто (числовой id) или кастомный (строковый slug)
        if (segments[0] === 'playlist' && segments[1]) {
            const slug = safeDecode(segments[1]);

            // 1) Авто-плейлист (числовой id)
            const plId = parseInt(slug, 10);
            if (Number.isFinite(plId) && String(plId) === slug) {
                const pl = autoPlaylists.find(p => p.id === plId);
                if (pl) { openAutoPlaylistModal(pl); return; }
            }

            // 2) Кастомный плейлист
            const custom = customPlaylists.find(p => p.id === slug);
            if (custom) { openCustomPlaylistModal(custom); return; }

            console.warn('[router] playlist not found:', slug);
        }

        // /Artist/<name>
        if (segments[0] === 'Artist' && segments[1]) {
            const artistName = safeDecode(segments[1]);
            if (artistName) {
                stopGlobalShuffle();
                showArtistPage(artistName);
                return;
            }
        }

        // /track/<slug> — легаси
        if (segments[0] === 'track' && segments[1]) {
            const trackSlug = safeDecode(segments[1]);
            if (trackSlug) {
                openTrackShareView(trackSlug);
                return;
            }
        }

        // /release/<title>
        if (segments[0] === 'release' && segments[1]) {
            const releaseTitle = safeDecode(segments[1]);
            const album = releaseTitle
                ? allAlbums.find(a => a.title === releaseTitle)
                : null;
            if (album) {
                stopGlobalShuffle();
                openModal(album, getAlbumType(album.tracks.length));
                return;
            }
        }

        // Неизвестный путь / корень → тихо главная
        console.log('[router] → showMainContent()');
        showMainContent();
    } catch (err) {
        console.error('[router] handleRouting error:', err);
        showMainContent();
    } finally {
        __routerBusy = false;
    }
}