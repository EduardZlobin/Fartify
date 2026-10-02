// ============================================================
// js/data.js — обложки треков, избранное, дедупликация, фиты
// ============================================================

function pickFromMap(map, file) {
    if (!map || !file) return undefined;
    if (Object.prototype.hasOwnProperty.call(map, file)) return map[file];
    const lower = String(file).toLowerCase();
    if (Object.prototype.hasOwnProperty.call(map, lower)) return map[lower];
    const upper = String(file).toUpperCase();
    if (Object.prototype.hasOwnProperty.call(map, upper)) return map[upper];
    for (const key of Object.keys(map)) {
        if (String(key).toLowerCase() === lower) return map[key];
    }
    return undefined;
}

// ---------- Получить обложку трека ----------
function getTrackCover(file, artistAlbums) {
    if (trackCovers[file]) return trackCovers[file];
    let latestCover = null, latestDate = '';
    allAlbums.forEach(album => {
        if (album.tracks.some(t => t.file === file)) {
            if (!latestDate || (album.date && album.date > latestDate)) {
                latestDate = album.date || '';
                latestCover = album.cover;
            }
        }
    });
    return latestCover || 'placeholder.jpg';
}
/**
 * ★ Единый резолвер обложки трека.
 * Приоритет:
 *   1. track-covers.json (trackCovers[file])
 *   2. обложка трека из data.json (track.cover)
 *   3. обложка альбома
 *   4. placeholder.jpg
 */
function resolveTrackCover(track, album) {
    if (!track || !track.file) {
        return (track && track.cover) || (album && album.cover) || 'placeholder.jpg';
    }

    // 1. Явная обложка трека из track-covers.json — всегда в приоритете
    if (typeof trackCovers !== 'undefined' && trackCovers && trackCovers[track.file]) {
        return trackCovers[track.file];
    }

    // 2. Обложка трека из data.json
    if (track.cover) return track.cover;

    // 3. Обложка альбома
    if (album && album.cover) return album.cover;

    // 4. Поиск по всем альбомам (как делает getTrackCover)
    const artistName = track.artist || (album && album.artist);
    return getTrackCover(
        track.file,
        allAlbums.filter(a => !artistName || a.artist === artistName)
    );
}

// ---------- Обложка последнего релиза артиста ----------
function getLatestAlbumCover(artistName) {
    const artistAlbums = allAlbums.filter(a => a.artist === artistName);
    if (artistAlbums.length === 0) return 'placeholder.jpg';
    let latest = artistAlbums[0];
    artistAlbums.forEach(a => {
        if (a.date && latest.date && a.date > latest.date) latest = a;
        else if (a.date && !latest.date) latest = a;
    });
    return latest.cover;
}

// ---------- Избранное ----------
function loadFavorites() {
    const stored = localStorage.getItem('favorites');
    if (stored) {
        try { favorites = JSON.parse(stored); }
        catch (e) { favorites = []; }
    } else {
        favorites = [];
    }
}

function saveFavorites() {
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

function isFavorite(track) {
    return favorites.some(fav =>
        fav.file === track.file &&
        fav.artist === track.artist &&
        fav.title === track.title
    );
}

function addFavorite(track) {
    if (!isFavorite(track)) {
        favorites.push({
            file: track.file,
            title: track.title,
            artist: track.artist,
            cover: resolveTrackCover(track, currentAlbum),
            albumTitle: track.albumTitle || currentAlbum?.title,
            duration: track.duration,
            plays: track.plays,
            dateAdded: new Date().toLocaleDateString('ru-RU', {
                day: 'numeric', month: 'long', year: 'numeric'
            })
        });
        saveFavorites();
    }
}

function removeFavorite(track) {
    favorites = favorites.filter(fav =>
        !(fav.file === track.file && fav.artist === track.artist && fav.title === track.title)
    );
    saveFavorites();
}

function toggleFavorite(track) {
    if (isFavorite(track)) removeFavorite(track);
    else addFavorite(track);
    updateFavoriteButtons(track);
    buildPlaylists();
}

function updateFavoriteButtons(track) {
    const isFav = isFavorite(track);
    document.querySelectorAll(`[data-file="${track.file}"][data-artist="${track.artist}"]`).forEach(btn => {
        btn.classList.toggle('active', isFav);
    });
    if (currentAlbum && currentAlbum.tracks[currentTrackIndex]?.file === track.file) {
        playerFavBtn.classList.toggle('active', isFav);
        updatePlayerHeartFill(isFav);
    }
}

function updatePlayerHeartFill(isFav) {
    const path = playerFavBtn.querySelector('path');
    if (path) path.setAttribute('fill', isFav ? 'currentColor' : 'none');
}

// ---------- Дедупликация треков артиста ----------
function getArtistDeduplicatedStats(artistName) {
    const artistAlbums = allAlbums.filter(album => album.artist === artistName);
    const trackMap = new Map();

    artistAlbums.forEach(album => {
        album.tracks.forEach(track => {
            const file = track.file;
            const plays = parseInt(track.plays?.replace(/\s/g, '')) || 0;
            if (!trackMap.has(file)) {
                trackMap.set(file, {
                    file,
                    title: track.title,
                    artist: artistName,
                    plays,
                    duration: track.duration,
                    cover: null,
                    albumDate: album.date
                });
            } else {
                const existing = trackMap.get(file);
                if (plays > existing.plays) {
                    existing.plays = plays;
                    existing.title = track.title;
                    existing.duration = track.duration;
                    existing.albumDate = album.date;
                }
            }
        });
    });

    for (const [file, track] of trackMap) {
        track.cover = getTrackCover(file, artistAlbums);
    }

    const totalPlays = Array.from(trackMap.values()).reduce((sum, t) => sum + t.plays, 0);
    const topTracks = Array.from(trackMap.values())
        .sort((a, b) => b.plays - a.plays)
        .slice(0, 10);

    return { totalPlays, topTracks };
}

// ---------- Блокировка треков ----------
function loadBlockedTracks() {
    try {
        const raw = localStorage.getItem(BLOCKED_STORAGE_KEY);
        if (!raw) return;
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) blockedTracks = new Set(arr);
    } catch (e) {
        blockedTracks = new Set();
    }
}

function saveBlockedTracks() {
    try {
        localStorage.setItem(BLOCKED_STORAGE_KEY, JSON.stringify([...blockedTracks]));
    } catch (e) {}
}

function isBlocked(file) {
    return !!file && blockedTracks.has(file);
}

function toggleBlockedTrack(file) {
    if (!file) return;
    if (blockedTracks.has(file)) blockedTracks.delete(file);
    else blockedTracks.add(file);
    saveBlockedTracks();

    if (blockedTracks.has(file)) {
        manualQueue = manualQueue.filter(it => it.track.file !== file);
    }

    document.querySelectorAll('.track-row[data-file]').forEach(row => {
        if (row.dataset.file === file) {
            row.classList.toggle('is-blocked', blockedTracks.has(file));
        }
    });

    if (shuffle && currentAlbum?.tracks) {
        resetShuffleQueue(currentTrackIndex);
    }

    renderQueue();
    updatePlaybackUI();
}

// ---------- Поиск по slug (для /track/...) ----------
function findTrackBySlug(slug) {
    const target = normalizeTrackSlug(slug);
    if (!target) return null;
    for (const album of allAlbums) {
        if (!album || !Array.isArray(album.tracks)) continue;
        for (const track of album.tracks) {
            if (!track || !track.title) continue;
            if (normalizeTrackSlug(track.title) === target) {
                return { track, album };
            }
        }
    }
    return null;
}

// ---------- Открытие карточки трека (для роутера) ----------
function openTrackShareView(slug) {
    const found = findTrackBySlug(slug);

    if (!found) {
        showMainContent();
        return;
    }

    const { track, album } = found;

    if (window.fartifyShare && typeof window.fartifyShare.showTrack === 'function') {
        window.fartifyShare.showTrack(track, album);
    } else {
        openTrackBySlug(slug);
    }
}

// ---------- Открытие трека без карточки (легаси) ----------
function openTrackBySlug(slug) {
    const found = findTrackBySlug(slug);

    if (!found) {
        showMainContent();
        return;
    }

    const { track, album } = found;
    const idx = album.tracks.findIndex(t => t.file === track.file);
    if (idx === -1) { showMainContent(); return; }

    clearManualContext();
    stopGlobalShuffle();

    currentAlbum = album;
    playTrackByIndex(idx);
    addToRecent(album);

    modal.classList.add('hidden');
    openedModalAlbum = null;
    playlistModal.classList.add('hidden');
    openedPlaylistTitle = null;
    artistPage.classList.add('hidden');
    mainContent.classList.remove('hidden');
    updatePlaybackUI();
    callFitAfterRender();
}

// ============================================================
// ФИТЫ — сбор всех исполнителей трека
// ============================================================

/**
 * Возвращает массив уникальных исполнителей для трека:
 *  1. Все артисты, у которых этот трек встречается в альбомах
 *  2. Плюс явные указания из feats.json
 *  3. Плюс fallback, если вообще ничего не нашлось
 *
 * Дубликаты удаляются.
 */
function getTrackArtists(file, fallbackArtist) {
    const set = new Set();

    // 1. Из всех альбомов, где встречается этот трек
    if (file && Array.isArray(allAlbums)) {
        allAlbums.forEach(album => {
            if (!Array.isArray(album.tracks)) return;
            if (album.tracks.some(t => t.file === file)) {
                if (album.artist) set.add(album.artist);
            }
        });
    }

    // 2. Из feats.json
    if (file && typeof featsData !== 'undefined' && featsData && Array.isArray(featsData[file])) {
        featsData[file].forEach(a => {
            if (a && typeof a === 'string' && a.trim()) {
                set.add(a.trim());
            }
        });
    }

    // 3. Fallback
    if (set.size === 0 && fallbackArtist) {
        set.add(fallbackArtist);
    }

    return Array.from(set);
}

/**
 * Строка вида "RadioGladoon, Deluxe" — для plain-text мест
 * (Media Session, title-атрибуты и т.п.)
 */
function formatTrackArtists(file, fallbackArtist) {
    return getTrackArtists(file, fallbackArtist).join(', ');
}

/**
 * HTML-версия: каждый исполнитель — отдельная кликабельная ссылка.
 */
function formatTrackArtistsHtml(file, fallbackArtist) {
    const artists = getTrackArtists(file, fallbackArtist);
    if (!artists.length) return '';
    return artists.map(a =>
        `<span class="artist-inline-link" data-artist="${escapeHtml(a)}">${escapeHtml(a)}</span>`
    ).join(', ');
}

/**
 * Глобальный делегированный обработчик клика по любой ссылке исполнителя.
 * Ставится один раз на document — работает везде: в очереди, треклистах,
 * модалках, правой панели, поиске.
 */
function handleArtistLinkClick(e) {
    const link = e.target.closest('.artist-inline-link');
    if (!link) return;

    // ★ Не обрабатываем клики внутри плеера и правой панели —
    // там свои локальные обработчики (player.js и lyrics.js),
    // иначе showArtistPage вызовется дважды.
    if (e.target.closest('#player')) return;
    if (e.target.closest('#lyrics-panel')) return;

    e.preventDefault();
    e.stopPropagation();

    const name = link.dataset.artist;
    if (!name) return;

    // Закрываем всё, что могло быть открыто
    if (typeof modal !== 'undefined' && modal) modal.classList.add('hidden');
    if (typeof openedModalAlbum !== 'undefined') openedModalAlbum = null;
    if (typeof playlistModal !== 'undefined' && playlistModal) playlistModal.classList.add('hidden');
    if (typeof openedPlaylistTitle !== 'undefined') openedPlaylistTitle = null;

    const shareViewEl = document.getElementById('share-view');
    if (shareViewEl) shareViewEl.classList.add('hidden');
    document.body.classList.remove('share-view-open');
    document.body.style.paddingBottom = '';

    stopGlobalShuffle();
    showArtistPage(name);
}

// ---------- Автошрифт заголовков ----------
function fitTitleFontSize() {
    const titles = document.querySelectorAll(
        '.album-card .title, .artist-card .artist-name, ' +
        '.playlist-card .playlist-name, .new-release-card .new-release-title'
    );
    titles.forEach(title => { title.style.fontSize = ''; });
    void document.body.offsetHeight;

    const measurer = document.createElement('span');
    measurer.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;pointer-events:none;top:-9999px;left:-9999px;`;
    document.body.appendChild(measurer);

    titles.forEach(title => {
        const parent = title.parentElement;
        if (!parent || parent.clientWidth === 0) return;
        const cs = getComputedStyle(title);
        const parentCs = getComputedStyle(parent);
        const baseFontSize = parseFloat(cs.fontSize) || 16;
        const padL = parseFloat(parentCs.paddingLeft) || 0;
        const padR = parseFloat(parentCs.paddingRight) || 0;
        const marL = parseFloat(cs.marginLeft) || 0;
        const marR = parseFloat(cs.marginRight) || 0;
        const maxWidth = Math.floor(parent.clientWidth - padL - padR - marL - marR);
        if (maxWidth <= 0) return;
        measurer.style.fontFamily = cs.fontFamily;
        measurer.style.fontWeight = cs.fontWeight;
        measurer.style.letterSpacing = cs.letterSpacing;
        measurer.textContent = title.textContent;
        const MIN = 9;
        let fs = baseFontSize;
        while (fs > MIN) {
            measurer.style.fontSize = fs + 'px';
            if (measurer.getBoundingClientRect().width <= maxWidth) break;
            fs -= 0.5;
        }
        title.style.fontSize = fs + 'px';
    });

    document.body.removeChild(measurer);
}

function callFitAfterRender() {
    requestAnimationFrame(() => {
        fitTitleFontSize();
        setTimeout(fitTitleFontSize, 100);
    });
}

function setupDataEvents() {
    window.addEventListener('resize', () => { fitTitleFontSize(); });
}