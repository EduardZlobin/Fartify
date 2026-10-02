// ============================================================
// js/main.js — точка входа: инициализация, загрузка данных, роутинг
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

    // 1. Найти все DOM-элементы
    initDom();

    // 1.5 Левая панель навигации
    initSidebar();

    // 2. Общие настройки плеера
    audio.volume = 0.7;
    updateVolumeUI();

    // 3. Локальные данные
    loadFavorites();
    loadBlockedTracks();
    initContextMenu();

    // 4. Share feature — ДО handleRouting, чтобы window.fartifyShare был доступен
    initShareFeature();

    // 5. Эквалайзер
    initEqualizer();

    // 6. Обработчики плеера
    setupPlayerEvents();

    // 7. Обработчики караоке и сайдбара
    setupLyricsEvents();
    setupLyricsResize();

    // 8. Обработчики очереди
    setupQueueEvents();

    // 9. Обработчики остальных секций
    setupSearchEvents();
    setupDataEvents();
    setupAlbumsEvents();
    setupArtistEvents();
    setupPlaylistEvents();
    setupRecentEvents();
    initReviewsPage();

    // 10. Начальная инициализация ?path=
    (function initPath() {
        const params = new URLSearchParams(window.location.search);
        const path = params.get('path');
        if (!path) return;

        initialPath = true;
        const cleanPath = String(path).replace(/^\/+/, '');
        if (!cleanPath) return;

        let target = '/' + cleanPath;
        if (BASE_PATH !== '/' && !target.startsWith(BASE_PATH)) {
            target = BASE_PATH.replace(/\/$/, '') + target;
        }
        safeReplaceState(target);
    })();

    // 11. Загружаем данные и запускаем сайт
        Promise.all([
        fetch('data.json').then(r => r.json()),
        fetch('artists.json').then(r => r.json()).catch(() => []),
        fetch('text.json').then(r => r.json()).catch(() => []),
        fetch('track-covers.json').then(r => r.json()).catch(() => []),
        fetch('critics.json').then(r => r.json()).catch(() => []),
        fetch('artist-of-year.json').then(r => r.json()).catch(() => null),
        fetch('live_text.json').then(r => r.json()).catch(() => ({})),
        fetch('release-info.json').then(r => r.json()).catch(() => ({})),
        fetch('feats.json').then(r => r.json()).catch(() => ({}))
    ])
    .then(([albumsData, artistsData, textData, trackCoverData, critics, aoyData, liveData, releaseInfoData, featsDataRaw]) => {
        allAlbums = albumsData;

        artistsMap = {};
        artistsData.forEach(a => { artistsMap[a.name] = a; });

        texts = {};
        textData.forEach(t => { texts[t.file] = t.text; });

        trackCovers = {};
        trackCoverData.forEach(t => { trackCovers[t.file] = t.cover; });

        criticsData = critics;
        liveTexts = liveData || {};
        releaseInfo = releaseInfoData || {};
        featsData = featsDataRaw || {};

        // Рендер секций
        buildUniqueArtists(albumsData);
        buildPlaylists();

        const shuffled = [...albumsData].sort(() => Math.random() - 0.5);
        renderAlbums(shuffled);

        generateAutoPlaylists();
        renderRecent();
        renderArtistOfYear(aoyData);
        renderNewReleases();

        callFitAfterRender();

        // Роутинг
        handleRouting();

        goToSlide(currentSlide);
        startCarouselAuto();
        updatePlaybackUI();

        // Восстановление плеера (только если мы на корне и не через share-параметры)
        if (!initialPath &&
            (getRelativePath() === '/' || getRelativePath() === BASE_PATH.replace(/\/$/, ''))) {
            restorePlayerFromState();
        }

        // Обработка ?share=... (карточки релизов/треков/плейлистов)
        tryHandleShareParams();

        // Спонсоры
        loadSponsorsFromJson();
    })
    .catch(err => console.error('Ошибка загрузки данных:', err));

    // 12. Клик по <a> — перехват внутренних ссылок
    document.addEventListener('click', function(e) {
        if (e.defaultPrevented) return;
        if (e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        const target = e.target.closest('a');
        if (!target) return;

        const tgt = target.getAttribute('target');
        if (tgt && tgt !== '_self') return;
        if (target.hasAttribute('download')) return;
        if (target.dataset.noRouter === '1') return;

        const href = target.getAttribute('href');
        if (!href) return;
        if (href.startsWith('#')) return;
        if (/^(mailto:|tel:|javascript:)/i.test(href)) return;

        let url;
        try { url = new URL(href, window.location.origin); }
        catch { return; }
        if (url.origin !== window.location.origin) return;

        e.preventDefault();

        const targetPath = url.pathname + url.search;
        const currentFull = window.location.pathname + window.location.search;
        if (targetPath === currentFull) return;

        previousPath = currentFull;

        if (safePushState(targetPath)) {
            handleRouting();
        }
    });

    // 13. popstate — кнопка назад/вперёд
    window.addEventListener('popstate', function() {
        if (window.__popstateTimer) clearTimeout(window.__popstateTimer);
        window.__popstateTimer = setTimeout(handleRouting, 0);
    });

    // Обновление активного пункта сайдбара при каждом роутинге
    window.addEventListener('popstate', () => updateSidebarActive());

    // 14. Публичный API для внешнего кода
    window.playTrack = (track, album) => {
        clearManualContext();
        stopGlobalShuffle();
        currentAlbum = album;
        const index = album.tracks.findIndex(t => t.file === track.file);
        if (index !== -1) playTrackByIndex(index);
    };
});