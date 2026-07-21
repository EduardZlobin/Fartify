document.addEventListener('DOMContentLoaded', () => {
    // ---------- БАЗОВЫЙ ПУТЬ (автоматически) ----------
    const BASE_PATH = window.location.pathname.indexOf('/Fartify/') === 0 ? '/Fartify/' : '/';

    // ---------- DOM-ЭЛЕМЕНТЫ ----------
    const mainContent = document.getElementById('main-content');
    const artistPage = document.getElementById('artist-page');
    const backBtn = document.getElementById('back-btn');
    const artistAvatar = document.getElementById('artist-avatar');
    const artistNameElem = document.getElementById('artist-name');
    const artistTotalPlaysElem = document.getElementById('artist-total-plays');
    const artistPlayBtn = document.getElementById('artist-play-btn');
    const popularTracksList = document.getElementById('popular-tracks-list');
    const artistAlbumsGrid = document.getElementById('artist-albums-grid');

    const playlistsGrid = document.getElementById('playlists-grid');
    const artistsGrid = document.getElementById('artists-grid');
    const albumsGrid = document.getElementById('albums-grid');

    const recommendBanner = document.getElementById('recommendation-banner');
    const recommendPlayBtn = document.getElementById('recommend-play-btn');

    const modal = document.getElementById('album-modal');
    const modalCover = document.getElementById('modal-cover');
    const modalTitle = document.getElementById('modal-title');
    const modalTypeLabel = document.getElementById('modal-type');
    const modalMeta = document.getElementById('modal-meta');
    const modalTracks = document.getElementById('modal-tracks');
    const modalPlayBtn = document.getElementById('modal-play-btn');
    const modalFooterDate = document.getElementById('modal-footer-date');
    const modalFooterLabel = document.getElementById('modal-footer-label');
    const closeBtn = document.querySelector('#album-modal .close');

    const playlistModal = document.getElementById('playlist-modal');
    const playlistModalCover = document.getElementById('playlist-modal-cover');
    const playlistModalTitle = document.getElementById('playlist-modal-title');
    const playlistModalMeta = document.getElementById('playlist-modal-meta');
    const playlistTracksList = document.getElementById('playlist-tracks');
    const playlistPlayBtn = document.getElementById('playlist-play-btn');
    const closePlaylistBtn = document.querySelector('#playlist-modal .close');

    const player = document.getElementById('player');
    const audio = document.getElementById('audio');
    const playerCover = document.getElementById('player-cover');
    const playerTitle = document.getElementById('player-title');
    const playerArtist = document.getElementById('player-artist');
    const playerFavBtn = document.getElementById('player-favorite-btn');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const repeatBtn = document.getElementById('repeat-btn');
    const repeatAllIcon = document.getElementById('repeat-all-icon');
    const repeatOneIcon = document.getElementById('repeat-one-icon');
    const progressBar = document.getElementById('progress-bar');
    const progressFill = document.getElementById('progress-fill');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');
    const volumeBtn = document.getElementById('volume-btn');
    const volumeBar = document.getElementById('volume-bar');
    const volumeFill = document.getElementById('volume-fill');
    const volumeOnIcon = document.getElementById('volume-on-icon');
    const volumeOffIcon = document.getElementById('volume-off-icon');

    const lyricsBtn = document.getElementById('lyrics-btn');
    const lyricsPanel = document.getElementById('lyrics-panel');
    const lyricsCover = document.getElementById('lyrics-cover');
    const lyricsText = document.getElementById('lyrics-text');
    const lyricsBackground = document.querySelector('.lyrics-background');
    const lyricsCloseBtn = document.getElementById('lyrics-close-btn');

    const imageModal = document.getElementById('image-modal');
    const imageModalImg = document.getElementById('image-modal-img');
    const closeImageModal = imageModal ? imageModal.querySelector('.close') : null;

    // ---------- ГЛОБАЛЬНОЕ СОСТОЯНИЕ ----------
    let allAlbums = [];
    let artistsMap = {};
    let currentAlbum = null;
    let currentTrackIndex = 0;
    let shuffle = false;
    let repeat = 'none';
    let history = [];
    let lastVolume = 0.7;
    let isGlobalShuffle = false;
    let globalPlaylist = [];
    let globalCurrentIndex = -1;
    let favorites = [];
    let activeBgLayer = 1;
    let previousPath = BASE_PATH;

    let texts = {};
    let trackCovers = {};
    let autoPlaylists = [];

    const AUTO_PLAYLIST_COUNT = 5;
    const TRACKS_PER_PLAYLIST = 10;

    // ---------- ИНИЦИАЛИЗАЦИЯ ----------
    audio.volume = 0.7;
    updateVolumeUI();
    loadFavorites();

    // Обрабатываем ?path= (если был редирект с 404.html)
    (function initPath() {
        const params = new URLSearchParams(window.location.search);
        const path = params.get('path');
        if (path) {
            const cleanPath = path.replace(/^\//, '');
            window.history.replaceState({}, '', BASE_PATH + cleanPath);
        }
    })();

    Promise.all([
        fetch('data.json').then(r => r.json()),
        fetch('artists.json').then(r => r.json()).catch(() => []),
        fetch('text.json').then(r => r.json()).catch(() => []),
        fetch('track-covers.json').then(r => r.json()).catch(() => [])
    ])
    .then(([albumsData, artistsData, textData, trackCoverData]) => {
        allAlbums = albumsData;
        artistsMap = {};
        artistsData.forEach(a => { artistsMap[a.name] = a; });

        texts = {};
        textData.forEach(t => { texts[t.file] = t.text; });
        trackCovers = {};
        trackCoverData.forEach(t => { trackCovers[t.file] = t.cover; });

        buildUniqueArtists(albumsData);
        buildPlaylists();
        const shuffled = [...albumsData].sort(() => Math.random() - 0.5);
        renderAlbums(shuffled);
        generateAutoPlaylists();
        callFitAfterRender();
        handleRouting();
    })
    .catch(err => console.error('Ошибка загрузки данных:', err));

    // ---------- РОУТЕР ----------
    function getRelativePath() {
        return window.location.pathname.replace(BASE_PATH, '/').replace(/\/$/, '') || '/';
    }

    function handleRouting() {
        const path = getRelativePath();
        const segments = path.replace(/^\//, '').split('/');

        if (segments[0] === 'Artist' && segments[1]) {
            const artistName = decodeURIComponent(segments[1]);
            stopGlobalShuffle();
            showArtistPage(artistName);
        } else if (segments[0] === 'release' && segments[1]) {
            const releaseTitle = decodeURIComponent(segments[1]);
            const album = allAlbums.find(a => a.title === releaseTitle);
            if (album) {
                const type = getAlbumType(album.tracks.length);
                stopGlobalShuffle();
                openModal(album, type);
            }
        } else if (path === '/favorites') {
            openPlaylistModal();
        } else if (path === '/chart') {
            const chartPlaylist = autoPlaylists.find(p => p.id === 'chart');
            if (chartPlaylist) openAutoPlaylistModal(chartPlaylist);
        } else if (segments[0] === 'playlist' && segments[1]) {
            const plId = parseInt(segments[1]);
            const pl = autoPlaylists.find(p => p.id === plId);
            if (pl) openAutoPlaylistModal(pl);
        } else {
            // главная
            modal.classList.add('hidden');
            playlistModal.classList.add('hidden');
            artistPage.classList.add('hidden');
            mainContent.classList.remove('hidden');
        }
    }

    // Перехват кликов по ссылкам
    document.addEventListener('click', function(e) {
        const target = e.target.closest('a');
        if (!target) return;
        const href = target.getAttribute('href');
        if (!href) return;
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;

        e.preventDefault();
        const newPath = url.pathname.replace(/\/$/, '') || '/';
        if (newPath === window.location.pathname) return;
        window.history.pushState({}, '', newPath);
        handleRouting();
    });

    window.addEventListener('popstate', handleRouting);

    // ---------- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ----------
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

    function getAlbumType(count) {
        if (count === 1) return 'Сингл';
        if (count >= 2 && count <= 3) return 'Макси-сингл';
        if (count >= 4 && count <= 8) return 'EP';
        return 'Альбом';
    }

    function parseDurationToSeconds(durStr) {
        if (!durStr) return 0;
        const parts = durStr.split(':').map(Number);
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        return 0;
    }

    function formatSecondsToDuration(totalSec) {
        const mins = Math.floor(totalSec / 60);
        const secs = Math.floor(totalSec % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function getTotalDuration(tracks) {
        const totalSec = tracks.reduce((sum, t) => sum + parseDurationToSeconds(t.duration || '0:00'), 0);
        return formatSecondsToDuration(totalSec);
    }

    function formatTime(sec) {
        const mins = Math.floor(sec / 60) || 0;
        const secs = Math.floor(sec % 60) || 0;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    function getTrackCover(file, artistAlbums) {
        if (trackCovers[file]) return trackCovers[file];
        let latestCover = null;
        let latestDate = '';
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

    // ========== ИЗБРАННОЕ ==========
    function loadFavorites() {
        const stored = localStorage.getItem('favorites');
        if (stored) {
            try { favorites = JSON.parse(stored); } catch (e) { favorites = []; }
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
            const favEntry = {
                file: track.file,
                title: track.title,
                artist: track.artist,
                cover: track.cover || currentAlbum?.cover,
                albumTitle: track.albumTitle || currentAlbum?.title,
                duration: track.duration,
                plays: track.plays,
                dateAdded: new Date().toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                })
            };
            favorites.push(favEntry);
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
        if (isFavorite(track)) {
            removeFavorite(track);
        } else {
            addFavorite(track);
        }
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
        }
    }

    // ========== ДЕДУПЛИКАЦИЯ ДЛЯ АРТИСТА ==========
    function getArtistDeduplicatedStats(artistName) {
        const artistAlbums = allAlbums.filter(album => album.artist === artistName);
        const trackMap = new Map();

        artistAlbums.forEach(album => {
            album.tracks.forEach(track => {
                const file = track.file;
                const plays = parseInt(track.plays?.replace(/\s/g, '')) || 0;
                if (!trackMap.has(file)) {
                    trackMap.set(file, {
                        file: file,
                        title: track.title,
                        artist: artistName,
                        plays: plays,
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
            .slice(0, 5);

        return { totalPlays, topTracks };
    }

    // ========== ПОСТРОЕНИЕ ИСПОЛНИТЕЛЕЙ НА ГЛАВНОЙ ==========
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
                <img src="photo/${artist.cover}" alt="${artist.name}" onerror="this.src='photo/placeholder.jpg'">
                <div class="artist-name">${artist.name}</div>
                <div class="artist-plays">${artist.totalPlays.toLocaleString()} прослушиваний</div>
            `;
            artistsGrid.appendChild(card);
        });
    }

    // ========== ПЛЕЙЛИСТ ИЗБРАННОЕ ==========
    function buildPlaylists() {
        const oldFavCard = document.querySelector('.playlist-card.favorites');
        if (oldFavCard) oldFavCard.remove();

        const playlistCard = document.createElement('a');
        playlistCard.className = 'playlist-card favorites';
        playlistCard.href = BASE_PATH + 'favorites';
        playlistCard.innerHTML = `
            <img src="photo/favorites.png" alt="Избранное" onerror="this.src='photo/placeholder.jpg'">
            <div class="playlist-name">Избранное</div>
            <div class="playlist-track-count">${favorites.length} треков</div>
        `;
        playlistsGrid.insertBefore(playlistCard, playlistsGrid.firstChild);
    }

    // ========== АВТОМАТИЧЕСКИЕ ПЛЕЙЛИСТЫ ==========
    async function getPlaylistMeta(playlistId) {
        try {
            const res = await fetch('playlist-covers.json');
            if (!res.ok) throw new Error('playlist-covers.json не загрузился');
            const data = await res.json();
            const items = data[String(playlistId)];
            if (!items || items.length === 0) {
                return { cover: 'photo/placeholder.jpg', title: `Плейлист №${playlistId}` };
            }
            const randomIndex = Math.floor(Math.random() * items.length);
            const chosen = items[randomIndex];
            let coverFile = '';
            let titleText = `Плейлист №${playlistId}`;
            if (typeof chosen === 'object' && chosen !== null) {
                coverFile = chosen.cover || chosen.file || '';
                titleText = chosen.title || titleText;
            } else if (typeof chosen === 'string') {
                coverFile = chosen;
            }
            if (!coverFile) {
                return { cover: 'photo/placeholder.jpg', title: titleText };
            }
            const coverPath = `playlist/${playlistId}/${coverFile}`;
            return { cover: coverPath, title: titleText };
        } catch (e) {
            return { cover: 'photo/placeholder.jpg', title: `Плейлист №${playlistId}` };
        }
    }

    async function generateAutoPlaylists() {
        const allTracks = [];
        allAlbums.forEach(album => {
            album.tracks.forEach(track => {
                allTracks.push({
                    ...track,
                    artist: album.artist,
                    cover: getTrackCover(track.file, [album]),
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
            autoPlaylists.push({
                id: i,
                title: meta.title,
                cover: meta.cover,
                tracks: selected
            });
        }

        const parsePlays = (str) => parseInt(str.replace(/\s/g, '')) || 0;
        const uniqueMap = new Map();
        allTracks.forEach(track => {
            if (!uniqueMap.has(track.file)) {
                uniqueMap.set(track.file, track);
            } else {
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

    function renderAutoPlaylists() {
        document.querySelectorAll('.playlist-card.auto-playlist').forEach(c => c.remove());
        autoPlaylists.forEach(pl => {
            const card = document.createElement('a');
            card.className = 'playlist-card auto-playlist';
            card.href = (pl.id === 'chart') ? BASE_PATH + 'chart' : BASE_PATH + 'playlist/' + pl.id;
            card.innerHTML = `
                <img src="${pl.cover}" alt="${pl.title}" onerror="this.src='photo/placeholder.jpg'">
                <div class="playlist-name">${pl.title}</div>
                <div class="playlist-track-count">${pl.tracks.length} треков</div>
                ${pl.tracks.length > 0 ? `<img class="playlist-mini-cover" src="photo/${pl.tracks[0].cover}" alt="" onerror="this.style.display='none'">` : ''}
            `;
            playlistsGrid.appendChild(card);
        });
    }

    // Универсальная модалка плейлиста
    function showPlaylistModal(config) {
        const { title, cover, tracks, showDate, showFavorite, showAlbum, showPlays } = config;
        previousPath = window.location.pathname;
        let plPath = BASE_PATH;
        if (title === 'Избранное') plPath = BASE_PATH + 'favorites';
        else if (title === 'Fartify топ-50') plPath = BASE_PATH + 'chart';
        else {
            const pl = autoPlaylists.find(p => p.title === title);
            if (pl && typeof pl.id === 'number') plPath = BASE_PATH + 'playlist/' + pl.id;
        }
        window.history.pushState({}, '', plPath);

        playlistModalCover.src = cover || 'photo/placeholder.jpg';
        playlistModalCover.onerror = () => { playlistModalCover.src = 'photo/placeholder.jpg'; };
        playlistModalTitle.textContent = title;
        playlistModalMeta.textContent = `${tracks.length} треков`;

        let headerHTML = '<div class="tracks-header">';
        headerHTML += '<span>#</span>';
        headerHTML += '<span></span>';
        headerHTML += '<span>Название</span>';
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
            let rowHTML = `<span class="track-num">${index + 1}</span>`;
            rowHTML += `<img class="track-cover" src="photo/${track.cover}" alt="" onerror="this.style.display='none'">`;
            rowHTML += `<div class="track-title-col"><span>${track.title}</span><span class="track-artist">${track.artist}</span></div>`;
            if (showAlbum) rowHTML += `<span class="track-album">${track.albumTitle || ''}</span>`;
            if (showPlays) rowHTML += `<span class="track-plays">${track.plays || ''}</span>`;
            if (showDate) rowHTML += `<span class="track-date-added">${track.dateAdded || ''}</span>`;
            rowHTML += `<span class="track-duration">${track.duration || ''}</span>`;
            if (showFavorite) {
                const isFav = isFavorite(track);
                rowHTML += `<button class="favorite-btn ${isFav ? 'active' : ''}" data-file="${track.file}" data-artist="${track.artist}" title="${isFav ? 'Удалить из избранного' : 'Добавить в избранное'}">
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

            row.addEventListener('click', () => {
                if (tracks.length > 0) {
                    stopGlobalShuffle();
                    currentAlbum = {
                        artist: track.artist,
                        cover: track.cover,
                        title: title,
                        tracks: tracks
                    };
                    const idx = currentAlbum.tracks.findIndex(t => t.file === track.file && t.title === track.title);
                    if (idx !== -1) playTrackByIndex(idx);
                }
                playlistModal.classList.add('hidden');
                window.history.pushState({}, '', previousPath);
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
            stopGlobalShuffle();
            currentAlbum = {
                artist: tracks[0].artist,
                cover: tracks[0].cover,
                title: title,
                tracks: tracks
            };
            playTrackByIndex(0);
            playlistModal.classList.add('hidden');
        };

        playlistModal.classList.remove('hidden');
    }

    function openPlaylistModal() {
        const tracksWithDate = favorites.map(fav => ({
            file: fav.file, title: fav.title, artist: fav.artist, cover: fav.cover,
            albumTitle: fav.albumTitle, duration: fav.duration, dateAdded: fav.dateAdded, plays: fav.plays || ''
        }));
        showPlaylistModal({
            title: 'Избранное', cover: 'photo/favorites.png', tracks: tracksWithDate,
            showDate: true, showFavorite: true, showAlbum: true, showPlays: false
        });
    }

    function openAutoPlaylistModal(playlist) {
        showPlaylistModal({
            title: playlist.title, cover: playlist.cover, tracks: playlist.tracks,
            showDate: false, showFavorite: false, showAlbum: true, showPlays: true
        });
    }

    function restorePreviousUrl() {
        window.history.pushState({}, '', previousPath);
    }

    function closePlaylistAndRestoreUrl() {
        playlistModal.classList.add('hidden');
        restorePreviousUrl();
    }

    closePlaylistBtn.addEventListener('click', closePlaylistAndRestoreUrl);
    window.addEventListener('click', (e) => {
        if (e.target === playlistModal) closePlaylistAndRestoreUrl();
    });

    // ---------- ОТРИСОВКА АЛЬБОМОВ ----------
    function renderAlbums(albums) {
        albumsGrid.innerHTML = '';
        albums.forEach(album => {
            const type = getAlbumType(album.tracks.length);
            const card = document.createElement('a');
            card.className = 'album-card';
            card.href = BASE_PATH + 'release/' + encodeURIComponent(album.title);
            card.innerHTML = `
                <img src="photo/${album.cover}" alt="${album.title}" onerror="this.src='photo/placeholder.jpg'">
                <div class="title">${album.title}</div>
                <div class="artist">${album.artist}</div>
                <div class="type">${type}</div>
                <div class="date">${album.date || ''}</div>
                <button class="album-play-btn" title="Играть">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5,3 21,12 5,21"/>
                    </svg>
                </button>
            `;
            card.querySelector('.album-play-btn').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                playAlbumFromModal(album, shuffle ? Math.floor(Math.random() * album.tracks.length) : 0);
            });
            albumsGrid.appendChild(card);
        });
        callFitAfterRender();
    }

    // ---------- МОДАЛЬНОЕ ОКНО АЛЬБОМА ----------
    function openModal(album, type) {
        previousPath = window.location.pathname;
        window.history.pushState({}, '', BASE_PATH + 'release/' + encodeURIComponent(album.title));

        modalCover.src = `photo/${album.cover}`;
        modalCover.onerror = () => { modalCover.src = 'photo/placeholder.jpg'; };
        modalTitle.textContent = album.title;
        modalTypeLabel.textContent = type;

        const trackCount = album.tracks.length;
        const totalDuration = getTotalDuration(album.tracks);
        const date = album.date || '';
        const artist = album.artist;

        modalMeta.innerHTML = `
            <span>${artist}</span>
            <span class="separator">•</span>
            <span>${date}</span>
            <span class="separator">•</span>
            <span>${trackCount} трек${trackCount !== 1 ? 'а' : ''}</span>
            <span class="separator">•</span>
            <span>${totalDuration}</span>
        `;

        modalPlayBtn.onclick = () => {
            playAlbumFromModal(album, 0);
            modal.classList.add('hidden');
            restorePreviousUrl();
        };

        modalTracks.innerHTML = '';
        album.tracks.forEach((track, index) => {
            const row = document.createElement('li');
            row.className = 'track-row';
            const isFav = isFavorite({
                file: track.file, title: track.title, artist: album.artist,
                cover: album.cover, albumTitle: album.title, duration: track.duration, plays: track.plays
            });
            row.innerHTML = `
                <span class="track-num">${index + 1}</span>
                <span class="track-title-col">${track.title}</span>
                <span class="track-plays">${track.plays || ''}</span>
                <span class="track-duration">${track.duration || ''}</span>
                <button class="favorite-btn ${isFav ? 'active' : ''}" data-file="${track.file}" data-artist="${album.artist}" title="${isFav ? 'Удалить из избранного' : 'Добавить в избранное'}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                </button>
            `;
            const favBtn = row.querySelector('.favorite-btn');
            favBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavorite({
                    file: track.file, title: track.title, artist: album.artist,
                    cover: album.cover, albumTitle: album.title, duration: track.duration, plays: track.plays
                });
            });
            row.addEventListener('click', (e) => {
                e.stopPropagation();
                playAlbumFromModal(album, index);
                modal.classList.add('hidden');
                restorePreviousUrl();
            });
            modalTracks.appendChild(row);
        });

        modalFooterDate.textContent = date ? date : '';
        modalFooterLabel.textContent = album.label || '';

        modal.classList.remove('hidden');
    }

    function playAlbumFromModal(album, index = 0) {
        stopGlobalShuffle();
        currentAlbum = album;
        playTrackByIndex(index);
    }

    function closeAlbumAndRestoreUrl() {
        modal.classList.add('hidden');
        restorePreviousUrl();
    }

    closeBtn.addEventListener('click', closeAlbumAndRestoreUrl);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeAlbumAndRestoreUrl();
    });

    // ---------- ПРОИГРЫВАНИЕ ТРЕКА ----------
    function playTrackByIndex(index) {
        if (!currentAlbum) return;
        currentTrackIndex = index;
        loadAndPlay(currentAlbum.tracks[currentTrackIndex]);
        if (!history.includes(currentTrackIndex)) history.push(currentTrackIndex);
    }

    function getAverageColor(imgSrc, callback) {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let r = 0, g = 0, b = 0, count = 0;
            for (let i = 0; i < data.length; i += 4) {
                r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
            }
            r = Math.round(r / count);
            g = Math.round(g / count);
            b = Math.round(b / count);
            const bgColor = `rgb(${r},${g},${b})`;
            const darkerR = Math.max(0, r - 40);
            const darkerG = Math.max(0, g - 40);
            const darkerB = Math.max(0, b - 40);
            const cardColor = `rgb(${darkerR},${darkerG},${darkerB})`;
            callback(bgColor, cardColor);
        };
        img.onerror = () => callback('#070709', '#0f0f15');
        img.src = imgSrc;
    }

    function loadAndPlay(track) {
        audio.src = `music/${track.file}`;
        const trackCoverFile = track.cover || getTrackCover(track.file, allAlbums.filter(a => a.artist === track.artist));
        playerCover.src = `photo/${trackCoverFile}`;
        playerTitle.textContent = track.title || '';
        playerArtist.textContent = track.artist || (currentAlbum ? currentAlbum.artist : '');
        updatePlayPauseIcon(true);
        const trackWithMeta = {
            file: track.file, title: track.title,
            artist: track.artist || (currentAlbum ? currentAlbum.artist : ''),
            cover: trackCoverFile, albumTitle: track.albumTitle || currentAlbum?.title,
            duration: track.duration, plays: track.plays
        };
        const isFav = isFavorite(trackWithMeta);
        playerFavBtn.classList.toggle('active', isFav);
        playerFavBtn.onclick = () => toggleFavorite(trackWithMeta);
        audio.play().catch(e => console.warn('Автовоспроизведение:', e));
        updateLyricsPanel(track);
        updateMediaSession(trackWithMeta);

        const coverPath = `photo/${trackCoverFile}`;
        getAverageColor(coverPath, (bgColor, cardColor) => {
            document.documentElement.style.setProperty('--card-gradient-color', cardColor);
            const newLayer = document.getElementById(`bg-layer${activeBgLayer === 1 ? 2 : 1}`);
            const oldLayer = document.getElementById(`bg-layer${activeBgLayer}`);
            newLayer.style.background = `linear-gradient(135deg, ${bgColor} 0%, #070709 60%)`;
            newLayer.style.opacity = '1';
            oldLayer.style.opacity = '0';
            activeBgLayer = activeBgLayer === 1 ? 2 : 1;
        });
    }

    function updateMediaSession(track) {
        if (!('mediaSession' in navigator)) return;
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title || 'Неизвестный трек',
            artist: track.artist || 'Неизвестный исполнитель',
            album: track.albumTitle || '',
            artwork: [{ src: `photo/${track.cover || 'placeholder.jpg'}`, sizes: '512x512', type: 'image/jpeg' }]
        });
    }

    function updateLyricsPanel(track) {
        const text = texts[track.file] || 'Увы, Гладун забыл текст этой песни';
        lyricsText.textContent = text;
        const coverFile = track.cover || getTrackCover(track.file, allAlbums.filter(a => a.artist === track.artist));
        lyricsCover.src = `photo/${coverFile}`;
        lyricsBackground.style.backgroundImage = `url(photo/${coverFile})`;
    }

    function updatePlayPauseIcon(playing) {
        if (playing) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        } else {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        }
    }

    // ---------- ГЛОБАЛЬНЫЙ ПЛЕЙЛИСТ (РЕКОМЕНДАЦИИ) ----------
    function buildGlobalPlaylist() {
        const allTracks = [];
        allAlbums.forEach(album => {
            album.tracks.forEach(track => {
                allTracks.push({
                    ...track,
                    artist: album.artist,
                    cover: getTrackCover(track.file, [album]),
                    albumTitle: album.title
                });
            });
        });
        return allTracks.sort(() => Math.random() - 0.5);
    }

    function startGlobalShuffle() {
        globalPlaylist = buildGlobalPlaylist();
        if (globalPlaylist.length === 0) return;
        globalCurrentIndex = 0;
        isGlobalShuffle = true;
        shuffle = false;
        shuffleBtn.classList.remove('active');
        shuffleBtn.disabled = true;
        playGlobalTrack();
    }

    function playGlobalTrack() {
        if (globalPlaylist.length === 0 || globalCurrentIndex < 0) return;
        const track = globalPlaylist[globalCurrentIndex];
        currentAlbum = {
            artist: track.artist,
            cover: track.cover,
            title: track.albumTitle,
            tracks: [track]
        };
        currentTrackIndex = 0;
        loadAndPlay(track);
    }

    function stopGlobalShuffle() {
        if (isGlobalShuffle) {
            isGlobalShuffle = false;
            globalPlaylist = [];
            globalCurrentIndex = -1;
            shuffleBtn.disabled = false;
        }
    }

    function globalNext() {
        if (globalPlaylist.length === 0) return;
        globalCurrentIndex = (globalCurrentIndex + 1) % globalPlaylist.length;
        playGlobalTrack();
    }

    function globalPrev() {
        if (globalPlaylist.length === 0) return;
        globalCurrentIndex = (globalCurrentIndex - 1 + globalPlaylist.length) % globalPlaylist.length;
        playGlobalTrack();
    }

    // ---------- УПРАВЛЕНИЕ ПЛЕЕРОМ ----------
    function togglePlay() {
        if (!audio.src) return;
        if (audio.paused) { audio.play(); updatePlayPauseIcon(true); }
        else { audio.pause(); updatePlayPauseIcon(false); }
    }

    function nextTrack() {
        if (isGlobalShuffle) { globalNext(); return; }
        if (!currentAlbum || currentAlbum.tracks.length === 0) return;
        let nextIndex;
        if (shuffle) {
            nextIndex = Math.floor(Math.random() * currentAlbum.tracks.length);
        } else {
            nextIndex = currentTrackIndex + 1;
            if (nextIndex >= currentAlbum.tracks.length) {
                if (repeat === 'none') {
                    audio.pause();
                    updatePlayPauseIcon(false);
                    return;
                } else {
                    nextIndex = 0;
                }
            }
        }
        playTrackByIndex(nextIndex);
    }

    function prevTrack() {
        if (isGlobalShuffle) { globalPrev(); return; }
        if (!currentAlbum || currentAlbum.tracks.length === 0) return;
        if (shuffle && history.length > 1) {
            history.pop();
            const prevIndex = history.pop();
            if (prevIndex !== undefined) playTrackByIndex(prevIndex);
            else playTrackByIndex(0);
        } else {
            let prevIndex = currentTrackIndex - 1;
            if (prevIndex < 0) prevIndex = currentAlbum.tracks.length - 1;
            playTrackByIndex(prevIndex);
        }
    }

    function toggleShuffle() {
        if (isGlobalShuffle) return;
        shuffle = !shuffle;
        if (shuffle) {
            shuffleBtn.classList.add('active');
            history = [currentTrackIndex];
        } else {
            shuffleBtn.classList.remove('active');
        }
    }

    function updateRepeatIcon() {
        if (repeat === 'one') {
            repeatAllIcon.style.display = 'none';
            repeatOneIcon.style.display = 'block';
            repeatBtn.classList.add('active');
        } else if (repeat === 'all') {
            repeatAllIcon.style.display = 'block';
            repeatOneIcon.style.display = 'none';
            repeatBtn.classList.add('active');
        } else {
            repeatAllIcon.style.display = 'block';
            repeatOneIcon.style.display = 'none';
            repeatBtn.classList.remove('active');
        }
    }

    function toggleRepeat() {
        if (repeat === 'none') { repeat = 'all'; }
        else if (repeat === 'all') { repeat = 'one'; }
        else { repeat = 'none'; }
        updateRepeatIcon();
    }

    playPauseBtn.addEventListener('click', togglePlay);
    nextBtn.addEventListener('click', nextTrack);
    prevBtn.addEventListener('click', prevTrack);
    shuffleBtn.addEventListener('click', toggleShuffle);
    repeatBtn.addEventListener('click', toggleRepeat);
    updateRepeatIcon();

    // ---------- ПРОГРЕСС И ВРЕМЯ ----------
    audio.addEventListener('timeupdate', () => {
        if (!audio.duration) return;
        const percent = (audio.currentTime / audio.duration) * 100;
        progressBar.value = percent;
        progressFill.style.width = percent + '%';
        currentTimeEl.textContent = formatTime(audio.currentTime);
    });

    audio.addEventListener('loadedmetadata', () => {
        durationEl.textContent = formatTime(audio.duration);
        progressBar.max = 100;
        progressBar.value = 0;
        progressFill.style.width = '0%';
    });

    progressBar.addEventListener('input', () => {
        const seekTime = (progressBar.value / 100) * audio.duration;
        audio.currentTime = seekTime;
        progressFill.style.width = progressBar.value + '%';
    });

    audio.addEventListener('ended', () => {
        if (repeat === 'one') {
            audio.currentTime = 0;
            audio.play();
        } else {
            nextTrack();
        }
    });

    audio.addEventListener('play', () => {
        updatePlayPauseIcon(true);
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'playing';
        }
    });
    audio.addEventListener('pause', () => {
        updatePlayPauseIcon(false);
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'paused';
        }
    });

    // ---------- ГРОМКОСТЬ ----------
    function updateVolumeUI() {
        const vol = audio.volume;
        volumeBar.value = vol * 100;
        volumeFill.style.width = (vol * 100) + '%';
        if (vol === 0) {
            volumeOnIcon.style.display = 'none';
            volumeOffIcon.style.display = 'block';
        } else {
            volumeOnIcon.style.display = 'block';
            volumeOffIcon.style.display = 'none';
        }
    }

    volumeBar.addEventListener('input', () => {
        const vol = volumeBar.value / 100;
        audio.volume = vol;
        volumeFill.style.width = volumeBar.value + '%';
        updateVolumeUI();
    });

    volumeBtn.addEventListener('click', () => {
        if (audio.volume > 0) {
            lastVolume = audio.volume;
            audio.volume = 0;
        } else {
            audio.volume = lastVolume || 0.7;
        }
        updateVolumeUI();
    });

    // ---------- ПАНЕЛЬ ТЕКСТА ----------
    lyricsBtn.addEventListener('click', () => {
        lyricsPanel.classList.toggle('open');
        document.body.classList.toggle('lyrics-open');
    });

    lyricsCloseBtn.addEventListener('click', () => {
        lyricsPanel.classList.remove('open');
        document.body.classList.remove('lyrics-open');
    });

    lyricsCover.addEventListener('click', () => {
        if (!lyricsCover.src) return;
        imageModalImg.src = lyricsCover.src;
        imageModal.classList.remove('hidden');
    });

    // ========== MEDIA KEYS ==========
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
        if (e.code === 'MediaPlayPause') {
            e.preventDefault();
            togglePlay();
        } else if (e.code === 'MediaTrackNext') {
            e.preventDefault();
            nextTrack();
        } else if (e.code === 'MediaTrackPrevious') {
            e.preventDefault();
            prevTrack();
        }
    });

    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => {
            if (audio.paused) { audio.play(); updatePlayPauseIcon(true); }
        });
        navigator.mediaSession.setActionHandler('pause', () => {
            if (!audio.paused) { audio.pause(); updatePlayPauseIcon(false); }
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
        navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
    }

    // ========== ДИНАМИЧЕСКИЙ ШРИФТ НА КАРТОЧКАХ ==========
    function fitTitleFontSize() {
        const titles = document.querySelectorAll('.album-card .title, .artist-card .artist-name');
        titles.forEach(title => {
            const parent = title.parentElement;
            const maxWidth = parent.clientWidth - 32;
            let fontSize = 16;
            title.style.fontSize = fontSize + 'px';
            while (title.scrollWidth > maxWidth && fontSize > 8) {
                fontSize -= 0.5;
                title.style.fontSize = fontSize + 'px';
            }
        });
    }

    function callFitAfterRender() {
        setTimeout(fitTitleFontSize, 50);
    }

    window.addEventListener('resize', () => {
        fitTitleFontSize();
    });

    // ========== СТРАНИЦА АРТИСТА ==========
    function showArtistPage(artistName) {
        window.history.pushState({}, '', BASE_PATH + 'Artist/' + encodeURIComponent(artistName));

        const artistAlbums = allAlbums.filter(album => album.artist === artistName);
        if (artistAlbums.length === 0) return;

        const artistEntry = artistsMap[artistName];
        const avatarFile = artistEntry ? artistEntry.avatar : getLatestAlbumCover(artistName);
        artistAvatar.src = `photo/${avatarFile}`;
        artistAvatar.onerror = () => { artistAvatar.src = 'photo/placeholder.jpg'; };
        artistNameElem.textContent = artistName;

        const { totalPlays, topTracks } = getArtistDeduplicatedStats(artistName);
        artistTotalPlaysElem.textContent = totalPlays.toLocaleString() + ' прослушиваний';

        popularTracksList.innerHTML = '';
        topTracks.forEach((track, idx) => {
            const row = document.createElement('li');
            row.className = 'track-row';
            row.innerHTML = `
                <img class="track-cover" src="photo/${track.cover}" alt="" onerror="this.style.display='none'">
                <span class="track-num">${idx + 1}</span>
                <span class="track-title-col">${track.title}</span>
                <span class="track-plays">${track.plays.toLocaleString()}</span>
                <span class="track-duration">${track.duration || ''}</span>
            `;
            row.addEventListener('click', () => {
                stopGlobalShuffle();
                const allTracks = artistAlbums.flatMap(album =>
                    album.tracks.map(t => ({
                        ...t,
                        artist: album.artist,
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
            popularTracksList.appendChild(row);
        });

        artistPlayBtn.onclick = () => {
            stopGlobalShuffle();
            const allTracks = artistAlbums.flatMap(album =>
                album.tracks.map(t => ({
                    ...t,
                    artist: album.artist,
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

        artistAlbumsGrid.innerHTML = '';
        artistAlbums.forEach(album => {
            const type = getAlbumType(album.tracks.length);
            const card = document.createElement('a');
            card.className = 'album-card';
            card.href = BASE_PATH + 'release/' + encodeURIComponent(album.title);
            card.innerHTML = `
                <img src="photo/${album.cover}" alt="${album.title}" onerror="this.src='photo/placeholder.jpg'">
                <div class="title">${album.title}</div>
                <div class="artist">${album.artist}</div>
                <div class="type">${type}</div>
                <div class="date">${album.date || ''}</div>
            `;
            card.addEventListener('click', (e) => {
                e.preventDefault();
                stopGlobalShuffle();
                openModal(album, type);
            });
            artistAlbumsGrid.appendChild(card);
        });
        callFitAfterRender();

        mainContent.classList.add('hidden');
        artistPage.classList.remove('hidden');
        window.scrollTo(0, 0);
    }

    // ---------- БАННЕР РЕКОМЕНДАЦИЙ ----------
    recommendBanner.addEventListener('click', (e) => {
        if (e.target !== recommendPlayBtn && !recommendPlayBtn.contains(e.target)) {
            startGlobalShuffle();
        }
    });
    recommendPlayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        startGlobalShuffle();
    });

    // ---------- ОБРАБОТЧИКИ ПЛЕЕРА ----------
    playerArtist.addEventListener('click', () => {
        if (!currentAlbum) return;
        stopGlobalShuffle();
        showArtistPage(currentAlbum.artist);
    });

    playerCover.addEventListener('click', () => {
        if (!playerCover.src) return;
        imageModalImg.src = playerCover.src;
        imageModal.classList.remove('hidden');
    });

    backBtn.addEventListener('click', () => {
        window.history.pushState({}, '', BASE_PATH);
        artistPage.classList.add('hidden');
        mainContent.classList.remove('hidden');
    });

    if (closeImageModal) {
        closeImageModal.addEventListener('click', () => imageModal.classList.add('hidden'));
    }
    window.addEventListener('click', (e) => {
        if (e.target === imageModal) imageModal.classList.add('hidden');
    });

    window.playTrack = (track, album) => {
        stopGlobalShuffle();
        currentAlbum = album;
        const index = album.tracks.findIndex(t => t.file === track.file);
        if (index !== -1) playTrackByIndex(index);
    };
});