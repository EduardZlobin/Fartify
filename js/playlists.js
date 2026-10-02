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