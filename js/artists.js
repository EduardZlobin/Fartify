// ============================================================
// js/artists.js — сетка исполнителей и страница артиста
// ============================================================

let __artistPopularExpanded = false;

function buildUniqueArtists(albums) {
    const artistStats = {};
    albums.forEach(album => {
        if (!artistStats[album.artist]) {
            artistStats[album.artist] = { totalPlays: 0, cover: album.cover };
        }
        const { totalPlays } = getArtistDeduplicatedStats(album.artist);
        artistStats[album.artist].totalPlays = totalPlays;
    });

    const uniqueArtists = [];
    const seen = new Set();
    albums.forEach(album => {
        if (!seen.has(album.artist)) {
            seen.add(album.artist);
            const stats = artistStats[album.artist];
            const artistInfo = artistsMap[album.artist];
            uniqueArtists.push({
                name: album.artist,
                cover: artistInfo ? artistInfo.avatar : getLatestAlbumCover(album.artist),
                totalPlays: stats.totalPlays
            });
        }
    });
    renderArtists(uniqueArtists);
}

function renderArtists(artists) {
    artistsGrid.innerHTML = '';
    artists.forEach(artist => {
        const card = document.createElement('a');
        card.className = 'artist-card';
        card.href = BASE_PATH + 'Artist/' + encodeURIComponent(artist.name);
        card.innerHTML = `
            <img src="photo/${escapeHtml(artist.cover)}" alt="${escapeHtml(artist.name)}" onerror="this.src='photo/placeholder.jpg'">
            <div class="artist-name">${escapeHtml(artist.name)}</div>
            <div class="artist-plays">${artist.totalPlays.toLocaleString()} прослушиваний</div>
        `;
        artistsGrid.appendChild(card);
    });
    callFitAfterRender();
}

function buildArtistAlbumCard(album) {
    const type = getAlbumType(album.tracks.length);
    const isNew = isFreshRelease(album.date);
    const card = document.createElement('a');
    card.className = 'album-card';
    card.href = BASE_PATH + 'release/' + encodeURIComponent(album.title);
    card.dataset.albumTitle = album.title;
    card.dataset.albumArtist = album.artist;
    card.innerHTML = `
        <span class="release-type-badge ${isNew ? 'is-new' : ''}">
            <span class="badge-new">Новое</span>
            <span class="badge-type">${type}</span>
        </span>
        <img src="photo/${escapeHtml(album.cover)}" alt="${escapeHtml(album.title)}" onerror="this.src='photo/placeholder.jpg'">
        <div class="title">${escapeHtml(album.title)}</div>
        <div class="artist">${escapeHtml(album.artist)}</div>
        <div class="date">${escapeHtml(album.date || '')}</div>
    `;
    card.addEventListener('click', (e) => {
        e.preventDefault();
        stopGlobalShuffle();
        openModal(album, type);
    });
    return card;
}

function showArtistPage(artistName) {
    const artistPath = BASE_PATH + 'Artist/' + encodeURIComponent(artistName);
    safePushState(artistPath);
    __artistPopularExpanded = false;

    const artistAlbums = allAlbums.filter(album => album.artist === artistName);

    if (artistAlbums.length === 0) {
        return;
    }

    const artistEntry = artistsMap[artistName];
    const avatarFile = artistEntry ? artistEntry.avatar : getLatestAlbumCover(artistName);
    artistAvatar.src = `photo/${avatarFile}`;
    artistAvatar.onerror = () => { artistAvatar.src = 'photo/placeholder.jpg'; };
    artistNameElem.textContent = artistName;

    const stats = getArtistDeduplicatedStats(artistName);
    const totalPlays = stats.totalPlays;
    const topTracks = stats.topTracks;
    console.log('[showArtistPage] topTracks найдено:', topTracks.length);

    artistTotalPlaysElem.textContent = totalPlays.toLocaleString() + ' прослушиваний';

    // ★ Популярные треки с кнопкой Ещё/Свернуть
    console.log('[showArtistPage] вызываем renderArtistPopularTracks...');
    renderArtistPopularTracks(artistName, topTracks, artistAlbums, avatarFile);
    console.log('[showArtistPage] после вызова, детей в списке:',
        popularTracksList ? popularTracksList.children.length : 'списка нет');

    // ★ Карточка самого популярного трека
    renderArtistTopTrackCard(artistName, topTracks, artistAlbums);

    // Плейлист всех треков артиста
    artistPlayBtn.onclick = () => {
        clearManualContext();
        stopGlobalShuffle();
        const allTracks = artistAlbums.flatMap(album =>
            album.tracks.map(t => ({
                ...t, artist: album.artist,
                cover: getTrackCover(t.file, artistAlbums),
                albumTitle: album.title
            }))
        );
        if (allTracks.length > 0) {
            currentAlbum = {
                artist: artistName,
                cover: allTracks[0].cover,
                title: 'Все треки ' + artistName,
                tracks: allTracks
            };
            playTrackByIndex(0);
        }
    };

    // Свои релизы
    artistAlbumsGrid.innerHTML = '';
    artistAlbums.forEach(album => {
        artistAlbumsGrid.appendChild(buildArtistAlbumCard(album));
    });

    // Блок «Ещё с этим исполнителем»
    renderArtistFeats(artistName, artistAlbums);

    callFitAfterRender();

    if (typeof stopCarouselAuto === 'function') stopCarouselAuto();
    mainContent.classList.add('hidden');
    artistPage.classList.remove('hidden');
    window.scrollTo(0, 0);
    updatePlaybackUI();
    if (typeof updateSidebarActive === 'function') updateSidebarActive();

    console.log('[showArtistPage] finished');
}

function renderArtistPopularTracks(artistName, topTracks, artistAlbums, avatarFile) {
    const list = popularTracksList;
    const section = document.querySelector('.popular-tracks-section');
    const toggleBtn = document.getElementById('popular-tracks-toggle');
    if (!list) return;

    list.innerHTML = '';

    if (!topTracks || !topTracks.length) {
        if (section) section.style.display = 'none';
        return;
    }
    if (section) section.style.display = '';

    const visibleCount = __artistPopularExpanded ? topTracks.length : Math.min(5, topTracks.length);
    const visibleTracks = topTracks.slice(0, visibleCount);

    console.log('[popular] render:', artistName, '| всего:', topTracks.length, '| видимых:', visibleCount);
    console.log('[popular] первый трек:', visibleTracks[0]);

    visibleTracks.forEach((track, idx) => {
        try {
            const row = document.createElement('li');
            row.className = 'track-row';
            row.dataset.file = track.file || '';
            row.dataset.artist = artistName;
            if (track.file && isBlocked(track.file)) row.classList.add('is-blocked');

            // ★ Безопасно достаём артистов
            let artistsHtml = '';
            try {
                if (typeof formatTrackArtistsHtml === 'function') {
                    artistsHtml = formatTrackArtistsHtml(track.file, artistName);
                } else {
                    artistsHtml = escapeHtml(artistName);
                }
            } catch (e) {
                console.warn('[popular] formatTrackArtistsHtml упал:', e);
                artistsHtml = escapeHtml(artistName);
            }

            // ★ Безопасно конвертируем прослушивания
            let playsText = '—';
            try {
                if (typeof track.plays === 'number' && isFinite(track.plays)) {
                    playsText = track.plays.toLocaleString();
                } else if (typeof track.plays === 'string' && track.plays.trim()) {
                    playsText = track.plays;
                }
            } catch (e) {
                playsText = '—';
            }

            const coverFile = (typeof track.cover === 'string' && track.cover)
                ? track.cover
                : 'placeholder.jpg';

            row.innerHTML = `
                <img class="track-cover" src="photo/${escapeHtml(coverFile)}" alt="" onerror="this.style.display='none'">
                <span class="track-num">${idx + 1}</span>
                <div class="track-title-col">
                    <span class="track-title-main">${escapeHtml(track.title || '')}</span>
                    <span class="track-artist-sub">${artistsHtml}</span>
                </div>
                <span class="track-plays">${playsText}</span>
                <span class="track-duration">${escapeHtml(track.duration || '')}</span>
            `;

            row.addEventListener('click', (e) => {
                if (e.target.closest('.artist-inline-link')) return;
                clearManualContext();
                stopGlobalShuffle();
                const allTracks = artistAlbums.flatMap(album =>
                    album.tracks.map(t => ({
                        ...t, artist: album.artist,
                        cover: getTrackCover(t.file, artistAlbums),
                        albumTitle: album.title
                    }))
                );
                currentAlbum = {
                    artist: artistName,
                    cover: allTracks[0]?.cover || avatarFile,
                    title: 'Все треки ' + artistName,
                    tracks: allTracks
                };
                const index = currentAlbum.tracks.findIndex(t => t.file === track.file);
                if (index !== -1) playTrackByIndex(index);
            });

            list.appendChild(row);
        } catch (e) {
            console.error('[popular] строка упала:', track, e);
        }
    });

    console.log('[popular] добавлено в DOM:', list.children.length);

    // Кнопка Ещё / Свернуть
    if (toggleBtn) {
        const actionsRow = toggleBtn.parentElement;
        if (topTracks.length <= 5) {
            if (actionsRow) actionsRow.style.display = 'none';
        } else {
            if (actionsRow) actionsRow.style.display = '';
            toggleBtn.textContent = __artistPopularExpanded
                ? 'Свернуть'
                : `Ещё ${Math.min(5, topTracks.length - 5)}`;
            toggleBtn.onclick = () => {
                __artistPopularExpanded = !__artistPopularExpanded;
                renderArtistPopularTracks(artistName, topTracks, artistAlbums, avatarFile);
            };
        }
    }
}

// ★ Токен, чтобы отменять устаревшие рендеры при быстром переключении артистов
let __artistTopTrackToken = 0;

async function renderArtistTopTrackCard(artistName, topTracks, artistAlbums) {
    const section = document.getElementById('top-track-card-section');
    const img     = document.getElementById('top-track-card-img');
    const loader  = document.getElementById('top-track-card-loader');
    const playBtn = document.getElementById('top-track-play-btn');
    const shareBtn = document.getElementById('top-track-share-btn');

    if (!section || !img || !loader || !playBtn || !shareBtn) return;

    // Нет треков → скрываем блок
    if (!Array.isArray(topTracks) || topTracks.length === 0) {
        section.style.display = 'none';
        return;
    }

    const topTrack = topTracks[0];
    const token = ++__artistTopTrackToken;

    // Сразу прячем старую карточку и показываем лоадер
    section.style.display = '';
    img.classList.add('hidden');
    img.removeAttribute('src');
    loader.classList.remove('hidden');
    loader.innerHTML = `
        <div class="top-track-card-spinner"></div>
        <span>Рисуем карточку…</span>
    `;

    // Находим альбом для трека
    let album = null;
    for (const a of artistAlbums) {
        if (a.tracks.some(t => t.file === topTrack.file)) {
            album = a;
            break;
        }
    }
    if (!album) {
        album = {
            artist: artistName,
            cover: topTrack.cover || 'placeholder.jpg',
            title: '',
            date: '',
            tracks: [topTrack]
        };
    }

    // Генерируем карточку
    try {
        if (window.fartifyShare && typeof window.fartifyShare.generateTrackCard === 'function') {
            const result = await window.fartifyShare.generateTrackCard(topTrack, album);

            // Не применилось ли это уже к другому артисту
            if (token !== __artistTopTrackToken) return;

            img.src = result.dataUrl;
            img.classList.remove('hidden');
            loader.classList.add('hidden');

            // ★ Красим кнопку Play в цвет обложки
            if (result.colors && result.colors.length >= 2) {
                const [c1, c2] = result.colors;
                playBtn.style.setProperty('--top-c1', `${c1[0]}, ${c1[1]}, ${c1[2]}`);
                playBtn.style.setProperty('--top-c2', `${c2[0]}, ${c2[1]}, ${c2[2]}`);

                // Цвет иконки — по средней яркости
                const avgR = (c1[0] + c2[0]) / 2;
                const avgG = (c1[1] + c2[1]) / 2;
                const avgB = (c1[2] + c2[2]) / 2;
                const lum = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;
                const fg = lum > 150 ? '#0b0910' : '#ffffff';
                playBtn.style.setProperty('--top-fg', fg);
            }
        } else {
            loader.innerHTML = '<span>Генератор карточек недоступен</span>';
        }
    } catch (e) {
        console.warn('[top-track-card] error:', e);
        if (token === __artistTopTrackToken) {
            loader.innerHTML = '<span>Не удалось создать карточку</span>';
        }
    }

    // ───── Кнопка Play ─────
    playBtn.dataset.file = topTrack.file;
    playBtn.onclick = () => {
        const isThisTrack = currentAlbum
            && currentAlbum.tracks
            && currentAlbum.tracks[currentTrackIndex]
            && currentAlbum.tracks[currentTrackIndex].file === topTrack.file
            && !isGlobalShuffle;

        if (isThisTrack) {
            if (audio.paused) audio.play();
            else audio.pause();
            return;
        }

        // Запускаем топ-трек в контексте «Все треки артиста»
        clearManualContext();
        stopGlobalShuffle();

        const allTracks = artistAlbums.flatMap(a =>
            a.tracks.map(t => ({
                ...t,
                artist: a.artist,
                cover: getTrackCover(t.file, artistAlbums),
                albumTitle: a.title
            }))
        );

        currentAlbum = {
            artist: artistName,
            cover: allTracks[0]?.cover || 'placeholder.jpg',
            title: 'Все треки ' + artistName,
            tracks: allTracks
        };

        const idx = currentAlbum.tracks.findIndex(t => t.file === topTrack.file);
        if (idx !== -1) playTrackByIndex(idx);
    };

    // ───── Кнопка Share ─────
    shareBtn.onclick = () => {
        if (window.fartifyShare && typeof window.fartifyShare.track === 'function') {
            window.fartifyShare.track(topTrack, album);
        }
    };

    // ───── Клик по карточке → открыть во весь экран ─────
    img.onclick = () => {
        if (!img.src) return;
        const imageModalEl = document.getElementById('image-modal');
        const imageModalImgEl = document.getElementById('image-modal-img');
        if (imageModalEl && imageModalImgEl) {
            imageModalImgEl.src = img.src;
            imageModalEl.classList.remove('hidden');
        }
    };
}

// ────────────────────────────────────────────────────────────
// Нормализация имени артиста для регистронезависимого сравнения
// Учитывает регистр, лишние пробелы, Юникод-варианты букв
// ────────────────────────────────────────────────────────────
function normalizeArtistName(str) {
    return String(str || '')
        .normalize('NFKC')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

function renderArtistFeats(artistName, ownAlbums) {
    const section = document.getElementById('artist-feats-section');
    const grid = document.getElementById('artist-feats-grid');
    if (!section || !grid) return;

    const ownTitles = new Set(ownAlbums.map(a => a.title));
    const targetNorm = normalizeArtistName(artistName);
    const matches = [];

    allAlbums.forEach(album => {
        // Свои релизы пропускаем
        if (ownTitles.has(album.title)) return;

        // Если основной артист альбома — тот же, кого смотрим — тоже пропускаем
        if (normalizeArtistName(album.artist) === targetNorm) return;

        // Ищем трек, где этот артист участвует как фит
        const hasFeat = album.tracks.some(track => {
            const artists = getTrackArtists(track.file, album.artist);
            return artists.some(a => normalizeArtistName(a) === targetNorm);
        });

        if (hasFeat) matches.push(album);
    });

    if (matches.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = '';
    grid.innerHTML = '';
    matches.forEach(album => {
        grid.appendChild(buildArtistAlbumCard(album));
    });
}

// ---------- Обработчики ----------
function setupArtistEvents() {
    recommendBanner.addEventListener('click', (e) => {
        if (e.target !== recommendPlayBtn && !recommendPlayBtn.contains(e.target)) {
            if (isGlobalShuffle) {
                if (audio.paused) audio.play();
                else audio.pause();
            } else startGlobalShuffle();
        }
    });

    recommendPlayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isGlobalShuffle) {
            if (audio.paused) audio.play();
            else audio.pause();
        } else startGlobalShuffle();
    });

    playerCover.addEventListener('click', () => {
        if (!playerCover.src) return;
        imageModalImg.src = playerCover.src;
        imageModal.classList.remove('hidden');
    });

    backBtn.addEventListener('click', () => {
        safePushState(BASE_PATH);
        artistPage.classList.add('hidden');
        mainContent.classList.remove('hidden');
        callFitAfterRender();
    });

    if (closeImageModal) closeImageModal.addEventListener('click', () => imageModal.classList.add('hidden'));
    window.addEventListener('click', (e) => {
        if (e.target === imageModal) imageModal.classList.add('hidden');
    });
}