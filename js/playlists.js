// ============================================================
// js/playlists.js — плейлисты, топ-50, избранное, модалка плейлиста
// ============================================================

// ---------- Плейлист "Избранное" ----------
function buildPlaylists() {
    const oldFavCard = document.querySelector('.playlist-card.favorites');
    if (oldFavCard) oldFavCard.remove();

    const playlistCard = document.createElement('a');
    playlistCard.className = 'playlist-card favorites';
    playlistCard.href = BASE_PATH + 'favorites';
    playlistCard.dataset.playlistTitle = 'Избранное';
    playlistCard.innerHTML = `
        <img src="photo/favorites.png" alt="Избранное" onerror="this.src='photo/placeholder.jpg'">
        <button class="playlist-play-btn" title="Играть">${getPlaySvg(20)}</button>
        <div class="playlist-name">Избранное</div>
        <div class="playlist-track-count">${favorites.length} треков</div>
    `;
    playlistCard.querySelector('.playlist-play-btn').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const tracks = favorites.map(fav => ({
            file: fav.file, title: fav.title, artist: fav.artist, cover: fav.cover,
            albumTitle: fav.albumTitle, duration: fav.duration,
            dateAdded: fav.dateAdded, plays: fav.plays || ''
        }));
        if (tracks.length === 0) return;
        handlePlaylistPlayClick('Избранное', tracks);
    });

    playlistsGrid.insertBefore(playlistCard, playlistsGrid.firstChild);
    updatePlaybackUI();
}

// ---------- Воспроизведение плейлиста ----------
function handlePlaylistPlayClick(playlistTitle, tracks) {
    const isThisPlaylist = currentAlbum
        && currentAlbum.isPlaylist
        && currentAlbum.playlistTitle === playlistTitle
        && !isGlobalShuffle;
    if (isThisPlaylist) {
        if (audio.paused) audio.play();
        else audio.pause();
    } else {
        clearManualContext();
        stopGlobalShuffle();
        currentAlbum = {
            artist: tracks[0]?.artist || 'Playlist',
            cover: tracks[0]?.cover,
            title: playlistTitle,
            tracks: tracks,
            isPlaylist: true,
            playlistTitle: playlistTitle
        };
        playTrackByIndex(0);
    }
}

// ---------- Метаданные авто-плейлиста ----------
async function getPlaylistMeta(playlistId) {
    try {
        const res = await fetch('playlist-covers.json');
        if (!res.ok) throw new Error('playlist-covers.json не загрузился');
        const data = await res.json();
        const items = data[String(playlistId)];
        if (!items || items.length === 0) {
            return { cover: 'photo/placeholder.jpg', title: `Плейлист №${playlistId}` };
        }
        const chosen = items[Math.floor(Math.random() * items.length)];
        let coverFile = '', titleText = `Плейлист №${playlistId}`;
        if (typeof chosen === 'object' && chosen !== null) {
            coverFile = chosen.cover || chosen.file || '';
            titleText = chosen.title || titleText;
        } else if (typeof chosen === 'string') {
            coverFile = chosen;
        }
        if (!coverFile) return { cover: 'photo/placeholder.jpg', title: titleText };
        return { cover: `playlist/${playlistId}/${coverFile}`, title: titleText };
    } catch (e) {
        return { cover: 'photo/placeholder.jpg', title: `Плейлист №${playlistId}` };
    }
}

// ---------- Генерация авто-плейлистов и топ-50 ----------
async function generateAutoPlaylists() {
    const allTracks = [];
    allAlbums.forEach(album => {
        album.tracks.forEach(track => {
            if (isBlocked(track.file)) return;
            allTracks.push({
                ...track,
                artist: album.artist,
                cover: resolveTrackCover(track, album),
                albumTitle: album.title
            });
        });
    });

    autoPlaylists = [];

    for (let i = 1; i <= AUTO_PLAYLIST_COUNT; i++) {
        const shuffled = [...allTracks].sort(() => Math.random() - 0.5);
        const selected = [];
        const usedFiles = new Set();
        for (const track of shuffled) {
            if (!usedFiles.has(track.file)) {
                selected.push(track);
                usedFiles.add(track.file);
                if (selected.length >= TRACKS_PER_PLAYLIST) break;
            }
        }
        const meta = await getPlaylistMeta(i);
        autoPlaylists.push({ id: i, title: meta.title, cover: meta.cover, tracks: selected });
    }

    // Топ-50 по прослушиваниям
    const parsePlays = (str) => parseInt(str.replace(/\s/g, '')) || 0;
    const uniqueMap = new Map();
    allTracks.forEach(track => {
        if (isBlocked(track.file)) return;
        if (!uniqueMap.has(track.file)) uniqueMap.set(track.file, track);
        else {
            const existing = uniqueMap.get(track.file);
            if (parsePlays(track.plays) > parsePlays(existing.plays)) {
                uniqueMap.set(track.file, track);
            }
        }
    });

    const top50 = Array.from(uniqueMap.values())
        .sort((a, b) => parsePlays(b.plays) - parsePlays(a.plays))
        .slice(0, 50);

    autoPlaylists.push({
        id: 'chart',
        title: 'Fartify топ-50',
        cover: 'photo/chart.png',
        tracks: top50
    });

    renderAutoPlaylists();
}

// ---------- Отрисовка авто-плейлистов ----------
function renderAutoPlaylists() {
    document.querySelectorAll('.playlist-card.auto-playlist').forEach(c => c.remove());

    autoPlaylists.forEach(pl => {
        if (pl.id === 'chart') return;   // ★ не показываем чарт в сетке плейлистов

        const card = document.createElement('a');
        card.className = 'playlist-card auto-playlist';
        card.href = (pl.id === 'chart')
            ? BASE_PATH + 'chart'
            : BASE_PATH + 'playlist/' + pl.id;
        card.dataset.playlistTitle = pl.title;
        card.innerHTML = `
            <img src="${pl.cover}" alt="${pl.title}" onerror="this.src='photo/placeholder.jpg'">
            <button class="playlist-play-btn" title="Играть">${getPlaySvg(20)}</button>
            <div class="playlist-name">${pl.title}</div>
            <div class="playlist-track-count">${pl.tracks.length} треков</div>
            ${pl.tracks.length > 0
                ? `<img class="playlist-mini-cover" src="photo/${pl.tracks[0].cover}" alt="" onerror="this.style.display='none'">`
                : ''}
        `;
        card.querySelector('.playlist-play-btn').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handlePlaylistPlayClick(pl.title, pl.tracks);
        });
        playlistsGrid.appendChild(card);
    });

    updatePlaybackUI();
}

// ---------- Модалка плейлиста ----------
function showPlaylistModal(config) {
    const { title, cover, tracks, showDate, showFavorite, showAlbum, showPlays } = config;

    let plPath = BASE_PATH;
    if (title === 'Избранное') plPath = BASE_PATH + 'favorites';
    else if (title === 'Fartify топ-50') plPath = BASE_PATH + 'chart';
    else {
        const pl = autoPlaylists.find(p => p.title === title);
        if (pl && typeof pl.id === 'number') plPath = BASE_PATH + 'playlist/' + pl.id;
    }
    safePushState(plPath);

    openedPlaylistTitle = title;

    playlistModalCover.src = cover || 'photo/placeholder.jpg';
    playlistModalCover.onerror = () => { playlistModalCover.src = 'photo/placeholder.jpg'; };
    playlistModalTitle.textContent = title;
    playlistModalMeta.textContent = `${tracks.length} треков`;

    let headerHTML = '<div class="tracks-header">';
    headerHTML += '<span>#</span><span></span><span>Название</span>';
    if (showAlbum) headerHTML += '<span>Альбом</span>';
    if (showPlays) headerHTML += '<span>Прослушивания</span>';
    if (showDate) headerHTML += '<span>Дата добавления</span>';
    headerHTML += '<span>Длительность</span>';
    if (showFavorite) headerHTML += '<span></span>';
    headerHTML += '</div>';

    const tableContainer = document.querySelector('#playlist-modal .playlist-tracks-table');
    tableContainer.innerHTML = headerHTML + '<ul id="playlist-tracks" class="tracks-list"></ul>';
    const list = tableContainer.querySelector('#playlist-tracks');

    tracks.forEach((track, index) => {
        const row = document.createElement('li');
        row.className = 'track-row';
        row.dataset.file = track.file;
        if (track.artist) row.dataset.artist = track.artist;
        if (isBlocked(track.file)) row.classList.add('is-blocked');

        let rowHTML = `<span class="track-num">${index + 1}</span>`;
        rowHTML += `<img class="track-cover" src="photo/${track.cover}" alt="" onerror="this.style.display='none'">`;
            rowHTML += `<div class="track-title-col"><span>${escapeHtml(track.title)}</span><span class="track-artist">${formatTrackArtistsHtml(track.file, track.artist)}</span></div>`;
        if (showAlbum) rowHTML += `<span class="track-album">${track.albumTitle || ''}</span>`;
        if (showPlays) rowHTML += `<span class="track-plays">${track.plays || ''}</span>`;
        if (showDate) rowHTML += `<span class="track-date-added">${track.dateAdded || ''}</span>`;
        rowHTML += `<span class="track-duration">${track.duration || ''}</span>`;
        if (showFavorite) {
            const isFav = isFavorite(track);
            rowHTML += `<button class="favorite-btn ${isFav ? 'active' : ''}" data-file="${track.file}" data-artist="${track.artist}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
            </button>`;
        }
        row.innerHTML = rowHTML;

        if (showFavorite) {
            const favBtn = row.querySelector('.favorite-btn');
            favBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavorite(track);
            });
        }

            row.addEventListener('click', (e) => {
                if (e.target.closest('.artist-inline-link')) return;
                if (tracks.length === 0) return;
                stopGlobalShuffle();
                
            const isSame = currentAlbum
                && currentAlbum.isPlaylist
                && currentAlbum.playlistTitle === title
                && currentTrackIndex === index
                && !isGlobalShuffle;
            if (isSame) {
                if (audio.paused) audio.play();
                else audio.pause();
                return;
            }
            clearManualContext();
            currentAlbum = {
                artist: track.artist,
                cover: track.cover,
                title: title,
                tracks: tracks,
                isPlaylist: true,
                playlistTitle: title
            };
            playTrackByIndex(index);
        });

        list.appendChild(row);
    });

    let columns = '30px 50px 1fr ';
    if (showAlbum) columns += '1fr ';
    if (showPlays) columns += '90px ';
    if (showDate) columns += '140px ';
    columns += '80px';
    if (showFavorite) columns += ' 40px';

    tableContainer.style.setProperty('--playlist-columns', columns);
    tableContainer.querySelectorAll('.tracks-header, .track-row').forEach(el => {
        el.style.gridTemplateColumns = columns;
    });

    playlistPlayBtn.onclick = () => {
        if (tracks.length === 0) return;
        const isThis = currentAlbum
            && currentAlbum.isPlaylist
            && currentAlbum.playlistTitle === title
            && !isGlobalShuffle;
        if (isThis) {
            if (audio.paused) audio.play();
            else audio.pause();
        } else {
            clearManualContext();
            stopGlobalShuffle();
            currentAlbum = {
                artist: tracks[0].artist,
                cover: tracks[0].cover,
                title: title,
                tracks: tracks,
                isPlaylist: true,
                playlistTitle: title
            };
            playTrackByIndex(0);
        }
    };

    playlistModal.classList.remove('hidden');
    updatePlaybackUI();
}

// ---------- Открытие встроенных плейлистов ----------
function openPlaylistModal() {
    const tracksWithDate = favorites.map(fav => ({
        file: fav.file, title: fav.title, artist: fav.artist, cover: fav.cover,
        albumTitle: fav.albumTitle, duration: fav.duration,
        dateAdded: fav.dateAdded, plays: fav.plays || ''
    }));
    showPlaylistModal({
        title: 'Избранное',
        cover: 'photo/favorites.png',
        tracks: tracksWithDate,
        showDate: true,
        showFavorite: true,
        showAlbum: true,
        showPlays: false
    });
}

function openAutoPlaylistModal(playlist) {
    showPlaylistModal({
        title: playlist.title,
        cover: playlist.cover,
        tracks: playlist.tracks,
        showDate: false,
        showFavorite: false,
        showAlbum: true,
        showPlays: true
    });
}

function closePlaylistAndRestoreUrl() {
    playlistModal.classList.add('hidden');
    openedPlaylistTitle = null;
    restorePreviousUrl();
    updatePlaybackUI();
}

// ---------- Обработчики ----------
function setupPlaylistEvents() {
    closePlaylistBtn.addEventListener('click', closePlaylistAndRestoreUrl);
    window.addEventListener('click', (e) => {
        if (e.target === playlistModal) closePlaylistAndRestoreUrl();
    });
}

// ============================================================
// CUSTOM PLAYLISTS — плейлисты из custom-playlists.json
// ============================================================

// Поиск трека по имени файла во всех альбомах
function findTrackDataByFile(file) {
    if (!file) return null;
    for (const album of allAlbums) {
        if (!Array.isArray(album.tracks)) continue;
        const t = album.tracks.find(x => x.file === file);
        if (t) {
            return {
                file: t.file,
                title: t.title,
                artist: album.artist,
                cover: resolveTrackCover(t, album),
                albumTitle: album.title,
                duration: t.duration || '',
                plays: t.plays || ''
            };
        }
    }
    return null;
}

// Сборка customPlaylists из сырого JSON: резолвим файлы в треки
function buildCustomPlaylists(rawData) {
    customPlaylists = [];

    const list = Array.isArray(rawData) ? rawData
               : (rawData && Array.isArray(rawData.playlists) ? rawData.playlists : []);

    list.forEach(pl => {
        if (!pl || !pl.id || !pl.title) return;

        const files = Array.isArray(pl.tracks) ? pl.tracks : [];
        const resolved = [];
        const missed = [];

        files.forEach(file => {
            const data = findTrackDataByFile(file);
            if (data) resolved.push(data);
            else missed.push(file);
        });

        if (missed.length > 0) {
            console.warn(`[custom-playlists] "${pl.title}": не найдены треки →`, missed);
        }

        customPlaylists.push({
            id: String(pl.id),
            title: String(pl.title),
            cover: String(pl.cover || 'photo/placeholder.jpg'),
            description: pl.description ? String(pl.description) : '',
            tracks: resolved
        });
    });

    renderCustomPlaylists();
}

// Отрисовка карточек кастомных плейлистов
function renderCustomPlaylists() {
    if (!playlistsGrid) return;

    document.querySelectorAll('.playlist-card.custom-playlist').forEach(c => c.remove());

    customPlaylists.forEach(pl => {
        const card = document.createElement('a');
        card.className = 'playlist-card custom-playlist';
        card.href = BASE_PATH + 'playlist/' + encodeURIComponent(pl.id);
        card.dataset.playlistTitle = pl.title;

        const isAuto = !pl.cover || pl.cover === 'auto';
        const initialCover = isAuto
            ? 'photo/placeholder.jpg'
            : resolveCoverPath(pl.cover);

        card.innerHTML = `
            <img class="custom-playlist-cover" src="${escapeHtml(initialCover)}"
                 alt="${escapeHtml(pl.title)}"
                 onerror="this.src='photo/placeholder.jpg'">
            <button class="playlist-play-btn" title="Играть">${getPlaySvg(20)}</button>
            <div class="playlist-name">${escapeHtml(pl.title)}</div>
            <div class="playlist-track-count">${pl.tracks.length} треков</div>
        `;

        card.querySelector('.playlist-play-btn').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (pl.tracks.length === 0) return;
            handlePlaylistPlayClick(pl.title, pl.tracks);
        });

        playlistsGrid.appendChild(card);

        // ★ Асинхронно подгружаем сгенерированную обложку
        if (isAuto) {
            ensureGeneratedCover(pl).then(dataUrl => {
                if (!dataUrl) return;
                const img = card.querySelector('.custom-playlist-cover');
                if (img) img.src = dataUrl;
            });
        }
    });

    updatePlaybackUI();
}

// Открытие модалки кастомного плейлиста
async function openCustomPlaylistModal(playlist) {
    if (!playlist) return;

    const isAuto = !playlist.cover || playlist.cover === 'auto';
    const coverSrc = isAuto
        ? (await ensureGeneratedCover(playlist)) || 'photo/placeholder.jpg'
        : resolveCoverPath(playlist.cover);

    showPlaylistModal({
        title: playlist.title,
        cover: coverSrc,
        tracks: playlist.tracks,
        showDate: false,
        showFavorite: false,
        showAlbum: true,
        showPlays: true
    });
}

// ============================================================
// ГЕНЕРАЦИЯ КОЛЛАЖНОЙ ОБЛОЖКИ ДЛЯ КАСТОМНЫХ ПЛЕЙЛИСТОВ
// ============================================================

// Резолв пути к обложке (для явно указанных в JSON)
function resolveCoverPath(path) {
    if (!path) return 'photo/placeholder.jpg';
    if (/^[a-z]+:/i.test(path)) return path;
    if (path.startsWith('/')) return path;
    if (path.startsWith('photo/') || path.startsWith('custom/')) return path;
    return BASE_PATH + path;
}

// Загрузка картинки для canvas
function loadCoverImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

// Выбрать N уникальных обложек (исключая placeholder)
function pickUniqueCovers(tracks, count) {
    const seen = new Set();
    const result = [];
    for (const t of tracks) {
        if (!t || !t.cover) continue;
        if (t.cover === 'placeholder.jpg') continue;
        if (seen.has(t.cover)) continue;
        seen.add(t.cover);
        result.push(t.cover);
        if (result.length >= count) break;
    }
    return result;
}

// Cover-fill: заполнить прямоугольник, сохранив пропорции
function drawCoverFill(ctx, img, x, y, w, h) {
    const ir = img.width / img.height;
    const tr = w / h;
    let dw, dh, dx, dy;
    if (ir > tr) {
        dh = h; dw = h * ir;
        dx = x + (w - dw) / 2; dy = y;
    } else {
        dw = w; dh = w / ir;
        dx = x; dy = y + (h - dh) / 2;
    }
    ctx.drawImage(img, dx, dy, dw, dh);
}

// Круглая маска
function drawCircleCover(ctx, img, cx, cy, radius) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();
    drawCoverFill(ctx, img, cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.restore();
}

// Извлечение доминирующих цветов из картинки
function extractDominantColors(img, maxColors = 3) {
    try {
        const S = 32;
        const c = document.createElement('canvas');
        c.width = S; c.height = S;
        const cx = c.getContext('2d');
        cx.drawImage(img, 0, 0, S, S);
        const data = cx.getImageData(0, 0, S, S).data;
        const buckets = {};

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
            if (a < 128) continue;

            const brightness = (r + g + b) / 3;
            if (brightness < 25 || brightness > 235) continue;

            const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
            const sat = (mx - mn) / (mx || 1);
            if (sat < 0.15) continue;

            const qr = Math.round(r / 40) * 40;
            const qg = Math.round(g / 40) * 40;
            const qb = Math.round(b / 40) * 40;
            const key = qr + ',' + qg + ',' + qb;
            buckets[key] = (buckets[key] || 0) + 1;
        }

        const sorted = Object.entries(buckets)
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxColors);

        if (!sorted.length) return null;
        return sorted.map(([k]) => k.split(',').map(Number));
    } catch (e) {
        return null;
    }
}

// Хэш от строки → стабильный integer (для выбора вариаций)
function hashStringToInt(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}

// ── Основной генератор ──
async function generatePlaylistCollage(covers, seed = '') {
    const SIZE = 600;
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');

    const imgs = (await Promise.all(
        covers.map(c => loadCoverImage(`photo/${c}`))
    )).filter(Boolean);

    if (imgs.length === 0) return null;

    const centerImg = imgs[0];

    // ★ Достаём доминирующие цвета из центральной обложки
    let colorA = [139, 92, 246];   // fallback — фирменный фиолетовый
    let colorB = [236, 72, 153];   // fallback — фирменный розовый
    let colorC = [56, 189, 248];   // fallback — голубой

    const colors = extractDominantColors(centerImg, 3);
    if (colors && colors.length >= 2) {
        colorA = colors[0];
        colorB = colors[1];
        colorC = colors[2] || colors[0];
    }

    // ★ Регулярный сдвиг градиента по seed — чтобы плейлисты визуально отличались
    const seedNum = hashStringToInt(seed || 'x');
    const angle = (seedNum % 360) * Math.PI / 180;

    // ── 1. Тёмная база
    ctx.fillStyle = '#08080d';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // ── 2. Диагональный линейный градиент из двух доминирующих цветов
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const gx1 = SIZE / 2 - dx * SIZE / 2;
    const gy1 = SIZE / 2 - dy * SIZE / 2;
    const gx2 = SIZE / 2 + dx * SIZE / 2;
    const gy2 = SIZE / 2 + dy * SIZE / 2;

    const linGrad = ctx.createLinearGradient(gx1, gy1, gx2, gy2);
    linGrad.addColorStop(0,    `rgba(${colorA[0]},${colorA[1]},${colorA[2]},1)`);
    linGrad.addColorStop(0.55, `rgba(${colorB[0]},${colorB[1]},${colorB[2]},1)`);
    linGrad.addColorStop(1,    `rgba(${colorC[0]},${colorC[1]},${colorC[2]},1)`);
    ctx.fillStyle = linGrad;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // ── 3. Тёмное затемнение сверху и снизу, чтобы читались кружки
    const darken = ctx.createLinearGradient(0, 0, 0, SIZE);
    darken.addColorStop(0,    'rgba(0,0,0,0.55)');
    darken.addColorStop(0.35, 'rgba(0,0,0,0.15)');
    darken.addColorStop(0.65, 'rgba(0,0,0,0.20)');
    darken.addColorStop(1,    'rgba(0,0,0,0.70)');
    ctx.fillStyle = darken;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // ── 4. Мягкое радиальное свечение в центре
    const glowRadius = SIZE * 0.55;
    const glow = ctx.createRadialGradient(SIZE/2, SIZE/2, 0, SIZE/2, SIZE/2, glowRadius);
    glow.addColorStop(0,   `rgba(${colorB[0]},${colorB[1]},${colorB[2]},0.28)`);
    glow.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // ── 5. Координаты кружков
    //   центр — большая (r=175), по бокам меньшие (r=105),
    //   левая чуть выше центра, правая чуть ниже — для динамики
    const centerR = 175;
    const sideR   = 105;
    const cX = SIZE / 2,       cY = SIZE / 2;
    const lX = 108,            lY = SIZE / 2 - 45;
    const rX = SIZE - 108,     rY = SIZE / 2 + 45;

    // ── 6. Тень/свечение под каждым кружком
    function drawCircleShadow(cx, cy, r) {
        const shadow = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r * 1.6);
        shadow.addColorStop(0, 'rgba(0,0,0,0.55)');
        shadow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = shadow;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2);
        ctx.fill();
    }

    drawCircleShadow(lX, lY, sideR);
    drawCircleShadow(rX, rY, sideR);
    drawCircleShadow(cX, cY, centerR);

    // ── 7. Сами кружки (сначала боковые, потом центральный поверх)
    if (imgs.length >= 3) {
        drawCircleCover(ctx, imgs[1], lX, lY, sideR);
        drawCircleCover(ctx, imgs[2], rX, rY, sideR);
    } else if (imgs.length === 2) {
        drawCircleCover(ctx, imgs[1], lX, lY, sideR);
        drawCircleCover(ctx, imgs[1], rX, rY, sideR);
    }

    drawCircleCover(ctx, centerImg, cX, cY, centerR);

    // ── 8. Светлый rim на каждом круге (тонкий, полупрозрачный)
    function drawCircleRim(cx, cy, r, alpha) {
        ctx.save();
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    if (imgs.length >= 2) {
        drawCircleRim(lX, lY, sideR, 0.22);
        drawCircleRim(rX, rY, sideR, 0.22);
    }
    drawCircleRim(cX, cY, centerR, 0.32);

    // ── 9. Виньетка по краям
    const vignette = ctx.createRadialGradient(
        SIZE / 2, SIZE / 2, SIZE * 0.32,
        SIZE / 2, SIZE / 2, SIZE * 0.82
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.60)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // ── 10. Верхний блик
    const sheen = ctx.createLinearGradient(0, 0, 0, SIZE * 0.4);
    sheen.addColorStop(0, 'rgba(255,255,255,0.09)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, SIZE, SIZE);

    return canvas.toDataURL('image/jpeg', 0.9);
}

// ── Кэш: сгенерированная обложка живёт в памяти до перезагрузки ──
function ensureGeneratedCover(pl) {
    if (pl._generatedCover) return Promise.resolve(pl._generatedCover);
    if (pl._coverPromise) return pl._coverPromise;

    pl._coverPromise = (async () => {
        const covers = pickUniqueCovers(pl.tracks, 3);
        if (covers.length === 0) {
            pl._generatedCover = 'photo/placeholder.jpg';
            return pl._generatedCover;
        }
        const dataUrl = await generatePlaylistCollage(covers, pl.id || pl.title || '');
        pl._generatedCover = dataUrl || 'photo/placeholder.jpg';
        return pl._generatedCover;
    })();

    return pl._coverPromise;
}