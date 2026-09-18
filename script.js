document.addEventListener('DOMContentLoaded', () => {
    const BASE_PATH = window.location.pathname.indexOf('/Fartify/') === 0 ? '/Fartify/' : '/';

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
    const recentGrid = document.getElementById('recent-grid');
    const recentSection = document.getElementById('recent-section');

    const carouselTrack = document.getElementById('carousel-track');
    const carouselDots = document.getElementById('carousel-dots');
    const artistOfYearBlock = document.getElementById('artist-of-year');
    const newReleasesBlock = document.getElementById('new-releases-block');

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
    const modalRating = document.getElementById('modal-rating');
    const modalCritics = document.getElementById('modal-critics');
    const modalCriticsList = document.getElementById('modal-critics-list');
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
    const lyricsContext = document.getElementById('lyrics-context');
    const lyricsNowTitle = document.getElementById('lyrics-now-title');
    const lyricsNowArtist = document.getElementById('lyrics-now-artist');
    const lyricsExpandBtn = document.getElementById('lyrics-expand-btn');
    const lyricsFullOverlay = document.getElementById('lyrics-full-overlay');
    const lyricsFullClose = document.getElementById('lyrics-full-close');
    const lyricsFullContent = document.getElementById('lyrics-full-content');
    const queueNext = document.getElementById('queue-next');
    const queueFull = document.getElementById('queue-full');
    const queueToggle = document.getElementById('queue-toggle');

    const imageModal = document.getElementById('image-modal');
    const imageModalImg = document.getElementById('image-modal-img');
    const closeImageModal = imageModal ? imageModal.querySelector('.close') : null;

    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const searchClear = document.getElementById('search-clear');

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
    let previousPath = BASE_PATH;
    let initialPath = false;
    let criticsData = [];
    let openedModalAlbum = null;
    let openedPlaylistTitle = null;

    let texts = {};
    let trackCovers = {};
    let autoPlaylists = [];

    let liveTexts = {};
    let currentLyricLines = [];
    let activeLyricIndex = -1;
    let currentTrackMeta = null;
    let shuffleQueue = [];
    let shuffleQueuePosition = -1;
    let isLyricsFullscreen = false;
    let lyricsPreviewParent = null;
    let queueExpanded = false;

    let currentSlide = 0;
    let carouselTimer = null;

    const AUTO_PLAYLIST_COUNT = 5;
    const TRACKS_PER_PLAYLIST = 10;

    // ---------- ИКОНКИ ----------
    function getPlaySvg(size) {
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 21,12 5,21"/></svg>`;
    }
    function getPauseSvg(size) {
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="3" width="6" height="18" rx="0.5"/><rect x="14" y="3" width="6" height="18" rx="0.5"/></svg>`;
    }
    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    // ---------- БОКОВАЯ ПАНЕЛЬ: КОНТЕКСТ И ОЧЕРЕДЬ ----------
    function getPlaybackSource() {
        if (isGlobalShuffle) return 'Рекомендации';
        if (!currentAlbum) return 'Ничего';

        if (currentAlbum.isPlaylist) {
            return currentAlbum.playlistTitle || currentAlbum.title || 'Плейлист';
        }

        if (typeof currentAlbum.title === 'string' && currentAlbum.title.startsWith('Все треки ')) {
            return currentAlbum.title;
        }

        return currentAlbum.title || 'Релиз';
    }

    function updateLyricsNowPlaying(track) {
        if (!track) {
            if (lyricsContext) {
                lyricsContext.textContent = 'Ничего';
                lyricsContext.title = 'Ничего';
            }
            if (lyricsNowTitle) lyricsNowTitle.textContent = 'Название трека';
            if (lyricsNowArtist) lyricsNowArtist.textContent = 'Исполнитель';
            return;
        }

        const artist = track.artist || currentAlbum?.artist || 'Неизвестный исполнитель';
        const source = getPlaybackSource();

        if (lyricsContext) {
            lyricsContext.textContent = source;
            lyricsContext.title = source;
        }
        if (lyricsNowTitle) {
            lyricsNowTitle.textContent = track.title || 'Без названия';
            lyricsNowTitle.title = track.title || '';
        }
        if (lyricsNowArtist) {
            lyricsNowArtist.textContent = artist;
            lyricsNowArtist.dataset.artist = artist;
            lyricsNowArtist.title = `Открыть профиль ${artist}`;
        }
    }

    function resetShuffleQueue(startIndex = currentTrackIndex) {
        if (!currentAlbum || !Array.isArray(currentAlbum.tracks) || currentAlbum.tracks.length === 0) {
            shuffleQueue = [];
            shuffleQueuePosition = -1;
            return;
        }

        const allIndexes = currentAlbum.tracks.map((_, index) => index);
        const rest = allIndexes.filter(index => index !== startIndex);
        rest.sort(() => Math.random() - 0.5);
        shuffleQueue = [startIndex, ...rest];
        shuffleQueuePosition = 0;
    }

    function syncShuffleQueueToCurrent() {
        if (!shuffle) return;
        const pos = shuffleQueue.indexOf(currentTrackIndex);
        if (pos === -1) resetShuffleQueue(currentTrackIndex);
        else shuffleQueuePosition = pos;
    }

    function getQueueTracks(limit = 15) {
        if (!currentAlbum || !Array.isArray(currentAlbum.tracks) || currentAlbum.tracks.length === 0) return [];

        // Глобальные рекомендации: очередь — это реальный заранее перемешанный глобальный список.
        if (isGlobalShuffle && globalPlaylist.length > 0) {
            const result = [];
            const total = globalPlaylist.length;
            const max = repeat === 'none' ? Math.min(limit, Math.max(0, total - 1)) : limit;
            for (let step = 1; step <= max; step++) {
                const idx = (globalCurrentIndex + step) % total;
                result.push({
                    track: globalPlaylist[idx],
                    globalIndex: idx,
                    index: -1,
                    position: step
                });
            }
            return result;
        }

        const tracks = currentAlbum.tracks;
        const result = [];

        if (repeat === 'one') {
            const current = tracks[currentTrackIndex];
            for (let i = 0; i < limit; i++) {
                if (current) result.push({ track: current, index: currentTrackIndex, position: i + 1, repeatOne: true });
            }
            return result;
        }

        if (shuffle) {
            syncShuffleQueueToCurrent();
            if (!shuffleQueue.length) return result;

            const remaining = shuffleQueue.length - shuffleQueuePosition - 1;
            const max = repeat === 'none' ? Math.min(limit, Math.max(0, remaining)) : limit;
            for (let step = 1; step <= max; step++) {
                let pos = shuffleQueuePosition + step;
                let cycleOffset = 0;
                if (pos >= shuffleQueue.length) {
                    if (repeat === 'none') break;
                    cycleOffset = Math.floor(pos / shuffleQueue.length);
                    pos %= shuffleQueue.length;
                }
                const index = shuffleQueue[pos];
                const track = tracks[index];
                if (track) {
                    result.push({ track, index, position: step, cycleOffset });
                }
            }
            return result;
        }

        for (let step = 1; step <= limit; step++) {
            let index = currentTrackIndex + step;
            if (index >= tracks.length) {
                if (repeat === 'none') break;
                index %= tracks.length;
            }
            const track = tracks[index];
            if (track) result.push({ track, index, position: step });
        }

        return result;
    }

    function createQueueItem(item, position) {
        const track = item.track;
        const row = document.createElement('div');
        row.className = 'queue-item';
        row.dataset.queueIndex = String(position);
        if (item.globalIndex >= 0) row.dataset.globalIndex = String(item.globalIndex);
        if (item.index >= 0) row.dataset.trackIndex = String(item.index);
        row.title = `Включить: ${track.title || 'Без названия'}`;

        const cover = track.cover || currentAlbum?.cover || 'placeholder.jpg';
        const artist = track.artist || currentAlbum?.artist || '';
        const albumTitle = track.albumTitle || (currentAlbum && !currentAlbum.isPlaylist ? currentAlbum.title : '');

        row.innerHTML = `
            <span class="queue-position">${position + 1}</span>
            <img class="queue-cover" src="photo/${escapeHtml(cover)}" alt="" onerror="this.src='photo/placeholder.jpg'">
            <div class="queue-info">
                <div class="queue-title">${escapeHtml(track.title || 'Без названия')}</div>
                <div class="queue-meta">${escapeHtml(artist)}${albumTitle ? ` <span>•</span> ${escapeHtml(albumTitle)}` : ''}</div>
            </div>
            <span class="queue-duration">${escapeHtml(track.duration || '')}</span>
        `;
        return row;
    }

    function renderQueue() {
        if (!queueNext) return;
        const items = getQueueTracks(15);
        queueNext.innerHTML = '';
        if (queueFull) queueFull.innerHTML = '';

        if (items.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'queue-empty';
            empty.textContent = isGlobalShuffle || repeat !== 'none'
                ? 'Очередь обновится после следующего трека'
                : 'Это последний трек в текущем списке';
            queueNext.appendChild(empty);
            if (queueToggle) queueToggle.style.display = 'none';
            return;
        }

        // В свернутом состоянии показываем только ближайший следующий трек.
        queueNext.appendChild(createQueueItem(items[0], 0));

        if (queueFull) {
            items.forEach((item, position) => {
                queueFull.appendChild(createQueueItem(item, position));
            });
            queueFull.classList.toggle('hidden', !queueExpanded);
        }

        if (queueToggle) {
            queueToggle.style.display = items.length > 1 ? 'inline-flex' : 'none';
            queueToggle.textContent = queueExpanded ? 'Свернуть' : `Все ${items.length}`;
            queueToggle.setAttribute('aria-expanded', queueExpanded ? 'true' : 'false');
            queueToggle.title = queueExpanded ? 'Свернуть очередь' : `Показать все ${items.length} следующих треков`;
        }
    }

    function playQueuedItem(row) {
        if (!row) return;
        const globalIndex = parseInt(row.dataset.globalIndex, 10);
        if (isGlobalShuffle && Number.isInteger(globalIndex)) {
            globalCurrentIndex = globalIndex;
            playGlobalTrack();
            return;
        }

        const index = parseInt(row.dataset.trackIndex, 10);
        if (!Number.isInteger(index) || !currentAlbum?.tracks?.[index]) return;
        playTrackByIndex(index, { fromShuffle: shuffle });
    }

    // ---------- ОБНОВЛЕНИЕ UI ----------
    function updatePlaybackUI() {
        const isPlaying = !audio.paused && !!audio.src;
        const isPlaylistPlaying = currentAlbum && currentAlbum.isPlaylist && !isGlobalShuffle;
        const isAlbumPlaying = currentAlbum && !currentAlbum.isPlaylist && !isGlobalShuffle;

        if (openedModalAlbum && !modal.classList.contains('hidden')) {
            const isThisAlbum = isAlbumPlaying
                && currentAlbum.title === openedModalAlbum.title
                && currentAlbum.artist === openedModalAlbum.artist;

            modalPlayBtn.innerHTML = isThisAlbum && isPlaying ? getPauseSvg(24) : getPlaySvg(24);

            const rows = modalTracks.querySelectorAll('.track-row');
            rows.forEach((row, idx) => {
                const isCurrent = isThisAlbum && idx === currentTrackIndex;
                row.classList.toggle('playing', isCurrent && isPlaying);
                const numSpan = row.querySelector('.track-num');
                if (numSpan) {
                    if (isCurrent && isPlaying) {
                        numSpan.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="3" width="6" height="18"/><rect x="14" y="3" width="6" height="18"/></svg>`;
                    } else if (isCurrent && !isPlaying) {
                        numSpan.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 21,12 5,21"/></svg>`;
                    } else {
                        numSpan.textContent = idx + 1;
                    }
                }
            });
        }

        if (openedPlaylistTitle && !playlistModal.classList.contains('hidden')) {
            const isThisPlaylist = isPlaylistPlaying
                && currentAlbum.playlistTitle === openedPlaylistTitle;

            playlistPlayBtn.innerHTML = isThisPlaylist && isPlaying ? getPauseSvg(24) : getPlaySvg(24);

            const rows = playlistTracksList.querySelectorAll('.track-row');
            rows.forEach((row, idx) => {
                const isCurrent = isThisPlaylist && idx === currentTrackIndex;
                row.classList.toggle('playing', isCurrent && isPlaying);
                const numSpan = row.querySelector('.track-num');
                if (numSpan) {
                    if (isCurrent && isPlaying) {
                        numSpan.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="3" width="6" height="18"/><rect x="14" y="3" width="6" height="18"/></svg>`;
                    } else if (isCurrent && !isPlaying) {
                        numSpan.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 21,12 5,21"/></svg>`;
                    } else {
                        numSpan.textContent = idx + 1;
                    }
                }
            });
        }

        document.querySelectorAll('.album-card').forEach(card => {
            const albumTitle = card.dataset.albumTitle;
            const albumArtist = card.dataset.albumArtist;
            const btn = card.querySelector('.album-play-btn');
            if (!btn || !albumTitle) return;

            const isThisAlbum = isAlbumPlaying
                && currentAlbum.title === albumTitle
                && currentAlbum.artist === albumArtist;

            if (isThisAlbum) {
                btn.innerHTML = isPlaying ? getPauseSvg(20) : getPlaySvg(20);
                btn.classList.add('is-playing-state');
                card.classList.add('is-playing');
            } else {
                btn.innerHTML = getPlaySvg(20);
                btn.classList.remove('is-playing-state');
                card.classList.remove('is-playing');
            }
        });

        document.querySelectorAll('.new-release-card').forEach(card => {
            const albumTitle = card.dataset.albumTitle;
            const albumArtist = card.dataset.albumArtist;
            const btn = card.querySelector('.new-release-play');
            if (!btn || !albumTitle) return;

            const isThisAlbum = isAlbumPlaying
                && currentAlbum.title === albumTitle
                && currentAlbum.artist === albumArtist;

            if (isThisAlbum) {
                btn.innerHTML = isPlaying ? getPauseSvg(16) : getPlaySvg(16);
                btn.classList.add('is-playing-state');
                card.classList.add('is-playing');
            } else {
                btn.innerHTML = getPlaySvg(16);
                btn.classList.remove('is-playing-state');
                card.classList.remove('is-playing');
            }
        });

        document.querySelectorAll('.playlist-card').forEach(card => {
            const plTitle = card.dataset.playlistTitle;
            const btn = card.querySelector('.playlist-play-btn');
            if (!btn || !plTitle) return;

            const isThisPlaylist = isPlaylistPlaying && currentAlbum.playlistTitle === plTitle;

            if (isThisPlaylist) {
                btn.innerHTML = isPlaying ? getPauseSvg(20) : getPlaySvg(20);
                btn.classList.add('is-playing-state');
                card.classList.add('is-playing');
            } else {
                btn.innerHTML = getPlaySvg(20);
                btn.classList.remove('is-playing-state');
                card.classList.remove('is-playing');
            }
        });

        if (isGlobalShuffle) {
            recommendPlayBtn.innerHTML = isPlaying ? getPauseSvg(32) : getPlaySvg(32);
        } else {
            recommendPlayBtn.innerHTML = getPlaySvg(32);
        }

        if (currentTrackMeta) updateLyricsNowPlaying(currentTrackMeta);
        renderQueue();
    }

    // ---------- СОХРАНЕНИЕ СОСТОЯНИЯ ----------
    const STORAGE_KEY = 'fartify_player_state';
    const RECENT_KEY = 'fartify_recent';
    let saveTimeTimeout;

    function savePlayerState() {
        if (!currentAlbum || currentTrackIndex < 0) return;
        const state = {
            album: currentAlbum.title ? {
                title: currentAlbum.title,
                artist: currentAlbum.artist,
                cover: currentAlbum.cover,
                isPlaylist: !!currentAlbum.isPlaylist,
                playlistTitle: currentAlbum.playlistTitle || null,
                tracks: currentAlbum.tracks.map(t => ({
                    file: t.file,
                    title: t.title,
                    artist: t.artist || currentAlbum.artist,
                    cover: t.cover || currentAlbum.cover,
                    duration: t.duration,
                    albumTitle: t.albumTitle || currentAlbum.title
                }))
            } : null,
            trackIndex: currentTrackIndex,
            currentTime: audio.currentTime,
            volume: audio.volume,
            shuffle: shuffle,
            repeat: repeat,
            isGlobalShuffle: isGlobalShuffle,
            globalPlaylist: isGlobalShuffle ? globalPlaylist : [],
            globalCurrentIndex: isGlobalShuffle ? globalCurrentIndex : -1
        };
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
    }

    function loadPlayerState() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (!data) return null;
            return JSON.parse(data);
        } catch (e) { return null; }
    }

    function restorePlayerFromState() {
        const state = loadPlayerState();
        if (!state || !state.album || !state.album.tracks || state.trackIndex < 0) return;
        const originalAlbum = !state.album.isPlaylist
            ? allAlbums.find(a => a.title === state.album.title && a.artist === state.album.artist)
            : null;
        if (originalAlbum) currentAlbum = originalAlbum;
        else currentAlbum = {
            artist: state.album.artist,
            cover: state.album.cover,
            title: state.album.title,
            tracks: state.album.tracks,
            isPlaylist: !!state.album.isPlaylist,
            playlistTitle: state.album.playlistTitle || null
        };
        currentTrackIndex = state.trackIndex;
        shuffle = state.shuffle || false;
        repeat = state.repeat || 'none';
        isGlobalShuffle = state.isGlobalShuffle || false;
        globalPlaylist = state.globalPlaylist || [];
        globalCurrentIndex = state.globalCurrentIndex !== undefined ? state.globalCurrentIndex : -1;

        const track = currentAlbum.tracks[currentTrackIndex];
        if (track) {
            audio.src = `music/${track.file}`;
            playerCover.src = `photo/${track.cover || currentAlbum.cover}`;
            playerTitle.textContent = track.title || '';
            playerArtist.textContent = track.artist || currentAlbum.artist;

            const trackWithMeta = {
                file: track.file,
                title: track.title,
                artist: track.artist || currentAlbum.artist,
                cover: track.cover || currentAlbum.cover,
                albumTitle: track.albumTitle || currentAlbum.title,
                duration: track.duration,
                plays: track.plays
            };
            const isFav = isFavorite(trackWithMeta);
            playerFavBtn.classList.toggle('active', isFav);
            updatePlayerHeartFill(isFav);
            playerFavBtn.onclick = () => toggleFavorite(trackWithMeta);

            audio.currentTime = state.currentTime || 0;
            audio.volume = state.volume || 0.7;
            updateVolumeUI();
            updatePlayPauseIcon(false);
        }

        if (shuffle) {
            shuffleBtn.classList.add('active');
            resetShuffleQueue(currentTrackIndex);
        } else {
            shuffleBtn.classList.remove('active');
        }
        updateLyricsNowPlaying(track);
        updateRepeatIcon();
        shuffleBtn.disabled = isGlobalShuffle;
        updatePlaybackUI();
    }

    // ---------- СВЕЖИЙ РЕЛИЗ ----------
    function isFreshRelease(dateStr) {
        if (!dateStr) return false;
        const today = new Date(); today.setHours(0,0,0,0);
        const d = new Date(dateStr);
        if (isNaN(d)) return false;
        d.setHours(0,0,0,0);
        const diffDays = (today - d) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays < 10;
    }

    // ---------- ПОИСК ----------
    // ---------- УМНЫЙ ПОИСК: транслитерация + fuzzy ----------
const CYR_TO_LAT = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z',
    'и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
    'с':'s','т':'t','у':'u','ф':'f','х':'x','ц':'ts','ч':'ch','ш':'sh','щ':'shch',
    'ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
    'і':'i','ї':'yi','є':'ye','ґ':'g'
};
const LAT_TO_CYR = {
    'a':'а','b':'б','c':'ц','d':'д','e':'е','f':'ф','g':'г','h':'х','i':'и',
    'j':'й','k':'к','l':'л','m':'м','n':'н','o':'о','p':'п','q':'к','r':'р',
    's':'с','t':'т','u':'у','v':'в','w':'в','x':'х','y':'и','z':'з'
};

// Нормализация: всё в нижний регистр, знаки препинания → пробелы
function normalizeStr(s) {
    return String(s)
        .toLowerCase()
        .replace(/[&,.!?;:()\[\]{}\-_/\\'"`«»""''…]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Транслит: кириллица → латиница
function cyrToLat(str) {
    let out = '';
    for (const ch of str) out += (CYR_TO_LAT[ch] !== undefined ? CYR_TO_LAT[ch] : ch);
    return out;
}

// Транслит: латиница → кириллица
function latToCyr(str) {
    let out = '';
    for (const ch of str) out += (LAT_TO_CYR[ch] !== undefined ? LAT_TO_CYR[ch] : ch);
    return out;
}

// Все варианты написания строки для сравнения
function generateVariants(str) {
    const set = new Set();
    const add = (v) => { if (v && v.length) set.add(v); };
    const norm = str.toLowerCase();

    add(norm);
    add(norm.replace(/\s+/g, ''));         // без пробелов

    if (/[а-яёіїєґ]/.test(norm)) {
        const lat = cyrToLat(norm);
        add(lat);
        add(lat.replace(/\s+/g, ''));
    }
    if (/[a-z]/.test(norm)) {
        const cyr = latToCyr(norm);
        add(cyr);
        add(cyr.replace(/\s+/g, ''));
    }

    return Array.from(set);
}

// Расстояние Левенштейна
function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const m = a.length, n = b.length;
    const prev = new Array(n + 1);
    const curr = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
        curr[0] = i;
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
        }
        for (let j = 0; j <= n; j++) prev[j] = curr[j];
    }
    return prev[n];
}

// Степень совпадения 0..1
function fuzzyScore(query, target) {
    const q = normalizeStr(query);
    const t = normalizeStr(target);
    if (!q || !t) return 0;

    // 1. Точное вхождение
    if (t.includes(q)) {
        return 0.95 + Math.min(0.05, q.length / Math.max(t.length, 1) * 0.1);
    }
    if (q.includes(t)) return 0.9;

    const qVariants = generateVariants(q);
    const tVariants = generateVariants(t);

    let best = 0;

    for (const qv of qVariants) {
        for (const tv of tVariants) {
            // Быстрый отсев по длине
            const lenDiff = Math.abs(qv.length - tv.length);
            const maxLen = Math.max(qv.length, tv.length);
            if (maxLen === 0) continue;
            if (lenDiff / maxLen > 0.7) continue;

            // 2. Вхождение транслитерированного варианта
            if (tv.includes(qv) || qv.includes(tv)) {
                const ratio = Math.min(qv.length, tv.length) / maxLen;
                best = Math.max(best, 0.8 + ratio * 0.15);
                continue;
            }

            // 3. Совпадение по словам (для многословных запросов)
            const qWords = qv.split(' ').filter(w => w.length >= 2);
            const tWords = tv.split(' ').filter(w => w.length >= 2);
            if (qWords.length > 1 && tWords.length > 0) {
                let matched = 0;
                for (const qw of qWords) {
                    const hit = tWords.some(tw => {
                        if (tw.includes(qw) || qw.includes(tw)) return true;
                        const ml = Math.max(qw.length, tw.length);
                        if (ml < 3) return false;
                        return levenshtein(qw, tw) / ml < 0.35;
                    });
                    if (hit) matched++;
                }
                const wordRatio = matched / qWords.length;
                if (wordRatio > 0) best = Math.max(best, wordRatio * 0.85);
            }

            // 4. Нечёткое сравнение всей строки
            const dist = levenshtein(qv, tv);
            const sim = 1 - dist / maxLen;
            if (sim > 0.45) best = Math.max(best, sim * 0.75);

            // 5. Сравнение без пробелов (склеенные слова)
            const qc = qv.replace(/\s+/g, '');
            const tc = tv.replace(/\s+/g, '');
            const mc = Math.max(qc.length, tc.length);
            if (mc > 0) {
                const distC = levenshtein(qc, tc);
                const simC = 1 - distC / mc;
                if (simC > 0.45) best = Math.max(best, simC * 0.8);
            }
        }
    }

    return best;
}

const SEARCH_MIN_SCORE = 0.32;

function performSearch(query) {
    const raw = query.trim();
    if (!raw) return { tracks: [], albums: [], artists: [] };

    const tracks = [];
    const albums = [];
    const artists = [];

    // --- Треки ---
    const seenFiles = new Set();
    const trackScores = [];
    allAlbums.forEach(album => {
        album.tracks.forEach(track => {
            if (seenFiles.has(track.file)) return;
            const sTitle = fuzzyScore(raw, track.title);
            const sArtist = fuzzyScore(raw, album.artist);
            const score = Math.max(sTitle, sArtist * 0.82);
            if (score >= SEARCH_MIN_SCORE) {
                seenFiles.add(track.file);
                trackScores.push({
                    score,
                    data: {
                        file: track.file,
                        title: track.title,
                        artist: album.artist,
                        cover: track.cover || album.cover
                    }
                });
            }
        });
    });
    trackScores.sort((a, b) => b.score - a.score);
    trackScores.slice(0, 5).forEach(x => tracks.push(x.data));

    // --- Альбомы / синглы / EP ---
    const albumScores = [];
    allAlbums.forEach(album => {
        const sTitle = fuzzyScore(raw, album.title);
        const sArtist = fuzzyScore(raw, album.artist);
        const score = Math.max(sTitle, sArtist * 0.82);
        if (score >= SEARCH_MIN_SCORE) {
            albumScores.push({ score, data: album });
        }
    });
    albumScores.sort((a, b) => b.score - a.score);
    albumScores.slice(0, 5).forEach(x => albums.push(x.data));

    // --- Исполнители ---
    const seenArtists = new Set();
    const artistScores = [];
    allAlbums.forEach(album => {
        if (seenArtists.has(album.artist)) return;
        const score = fuzzyScore(raw, album.artist);
        if (score >= SEARCH_MIN_SCORE) {
            seenArtists.add(album.artist);
            const artistInfo = artistsMap[album.artist];
            artistScores.push({
                score,
                data: {
                    name: album.artist,
                    avatar: artistInfo ? artistInfo.avatar : getLatestAlbumCover(album.artist)
                }
            });
        }
    });
    artistScores.sort((a, b) => b.score - a.score);
    artistScores.slice(0, 5).forEach(x => artists.push(x.data));

    return { tracks, albums, artists };
}

    function renderSearchResults(query) {
        const results = performSearch(query);
        const total = results.tracks.length + results.albums.length + results.artists.length;

        if (total === 0) {
            searchResults.innerHTML = `<div class="search-result-empty">Ничего не найдено по запросу «${escapeHtml(query)}»</div>`;
            searchResults.classList.remove('hidden');
            return;
        }

        let html = '';

        if (results.artists.length > 0) {
            html += `<div class="search-section-title">Исполнители</div>`;
            results.artists.forEach(artist => {
                html += `
                    <div class="search-result-item" data-type="artist" data-name="${escapeHtml(artist.name)}">
                        <img class="search-result-avatar" src="photo/${artist.avatar}" onerror="this.src='photo/placeholder.jpg'" alt="">
                        <div class="search-result-info">
                            <div class="search-result-title">${escapeHtml(artist.name)}</div>
                            <div class="search-result-meta">
                                <span class="search-result-type">Исполнитель</span>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        if (results.albums.length > 0) {
            html += `<div class="search-section-title">Релизы</div>`;
            results.albums.forEach(album => {
                const type = getAlbumType(album.tracks.length);
                html += `
                    <div class="search-result-item" data-type="album" data-title="${escapeHtml(album.title)}">
                        <img class="search-result-cover" src="photo/${album.cover}" onerror="this.src='photo/placeholder.jpg'" alt="">
                        <div class="search-result-info">
                            <div class="search-result-title">${escapeHtml(album.title)}</div>
                            <div class="search-result-meta">
                                <span class="search-result-type">${type}</span>
                                <span class="search-result-dot">•</span>
                                <span class="search-result-artist">${escapeHtml(album.artist)}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        if (results.tracks.length > 0) {
            html += `<div class="search-section-title">Треки</div>`;
            results.tracks.forEach(track => {
                html += `
                    <div class="search-result-item" data-type="track" data-file="${escapeHtml(track.file)}">
                        <img class="search-result-cover" src="photo/${track.cover}" onerror="this.src='photo/placeholder.jpg'" alt="">
                        <div class="search-result-info">
                            <div class="search-result-title">${escapeHtml(track.title)}</div>
                            <div class="search-result-meta">
                                <span class="search-result-type">Трек</span>
                                <span class="search-result-dot">•</span>
                                <span class="search-result-artist">${escapeHtml(track.artist)}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        searchResults.innerHTML = html;
        searchResults.classList.remove('hidden');
    }

    // ---------- НЕДАВНО ----------
    function addToRecent(album) {
        if (!album || !album.title || !album.artist) return;
        if (album.title.startsWith('Все треки ') || album.title === 'Избранное' || album.title === 'Fartify топ-50') return;
        if (!allAlbums.some(a => a.title === album.title && a.artist === album.artist)) return;
        try {
            let recent = JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
            recent = recent.filter(r => !(r.title === album.title && r.artist === album.artist));
            recent.push({ title: album.title, artist: album.artist, cover: album.cover, date: album.date || '', timestamp: Date.now() });
            if (recent.length > 50) recent = recent.slice(recent.length - 50);
            localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
            renderRecent();
        } catch (e) {}
    }

    function loadRecent() {
        try {
            let recent = JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
            recent.sort((a, b) => b.timestamp - a.timestamp);
            const seen = new Set();
            const unique = [];
            for (const item of recent) {
                const key = `${item.artist}||${item.title}`;
                if (!seen.has(key)) { seen.add(key); unique.push(item); }
            }
            return unique.slice(0, 16);
        } catch (e) { return []; }
    }

    function renderRecent() {
        const recent = loadRecent();
        if (!recentGrid || !recentSection) return;
        if (recent.length === 0) { recentSection.style.display = 'none'; return; }
        recentSection.style.display = '';
        recentGrid.innerHTML = '';
        recent.forEach(item => {
            const albumFromData = allAlbums.find(a => a.title === item.title && a.artist === item.artist);
            const type = albumFromData ? getAlbumType(albumFromData.tracks.length) : '';
            const isNew = isFreshRelease(item.date);

            const card = document.createElement('a');
            card.className = 'album-card';
            card.href = BASE_PATH + 'release/' + encodeURIComponent(item.title);
            card.dataset.albumTitle = item.title;
            card.dataset.albumArtist = item.artist;
            card.innerHTML = `
                ${type ? `<span class="release-type-badge ${isNew ? 'is-new' : ''}">
                    <span class="badge-new">Новое</span>
                    <span class="badge-type">${type}</span>
                </span>` : ''}
                <img src="photo/${item.cover}" alt="${item.title}" onerror="this.src='photo/placeholder.jpg'">
                <button class="album-play-btn" title="Играть">${getPlaySvg(20)}</button>
                <div class="title">${item.title}</div>
                <div class="artist">${item.artist}</div>
                <div class="date">${item.date || ''}</div>
            `;
            const playBtn = card.querySelector('.album-play-btn');
            playBtn.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                const album = allAlbums.find(a => a.title === item.title && a.artist === item.artist);
                if (album) handleCardPlayClick(album);
            });
            recentGrid.appendChild(card);
        });
        callFitAfterRender();
        updatePlaybackUI();
    }

    // ---------- НОВИНКИ ----------
    function formatReleaseDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d)) return dateStr;
        const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
        return `${d.getDate()} ${months[d.getMonth()]}`;
    }

    function renderNewReleases() {
        if (!newReleasesBlock) return;
        const recentReleases = allAlbums.filter(album => isFreshRelease(album.date));
        recentReleases.sort((a, b) => new Date(b.date) - new Date(a.date));

        const slideEl = newReleasesBlock.closest('.carousel-slide');
        const dotEl = carouselDots ? carouselDots.querySelector('[data-index="0"]') : null;

        if (recentReleases.length === 0) {
            newReleasesBlock.innerHTML = '';
            if (slideEl) slideEl.style.display = 'none';
            if (dotEl) dotEl.style.display = 'none';
            return;
        }

        if (slideEl) slideEl.style.display = '';
        if (dotEl) dotEl.style.display = '';

        newReleasesBlock.innerHTML = '';
        recentReleases.forEach(album => {
            const card = document.createElement('a');
            card.className = 'new-release-card';
            card.href = BASE_PATH + 'release/' + encodeURIComponent(album.title);
            card.dataset.albumTitle = album.title;
            card.dataset.albumArtist = album.artist;
            card.innerHTML = `
                <span class="new-release-badge">Новое</span>
                <img src="photo/${album.cover}" alt="${album.title}" onerror="this.src='photo/placeholder.jpg'">
                <button class="new-release-play" title="Играть">${getPlaySvg(16)}</button>
                <div class="new-release-info">
                    <div class="new-release-title">${album.title}</div>
                    <div class="new-release-artist">${album.artist}</div>
                    <div class="new-release-date">${formatReleaseDate(album.date)}</div>
                </div>
            `;
            card.querySelector('.new-release-play').addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                handleCardPlayClick(album);
            });
            newReleasesBlock.appendChild(card);
        });
        callFitAfterRender();
        updatePlaybackUI();
    }

    // ---------- ОБРАБОТЧИК PLAY КАРТОЧКИ РЕЛИЗА ----------
    function handleCardPlayClick(album) {
        const isThisAlbum = currentAlbum
            && !currentAlbum.isPlaylist
            && currentAlbum.title === album.title
            && currentAlbum.artist === album.artist
            && !isGlobalShuffle;
        if (isThisAlbum) {
            if (audio.paused) audio.play();
            else audio.pause();
        } else {
            playAlbumFromModal(album, shuffle ? Math.floor(Math.random() * album.tracks.length) : 0);
        }
    }

    // ---------- КРИТИКИ ----------
    function getCriticsRating(albumTitle) {
        if (!criticsData.length) return null;
        const ratings = [];
        criticsData.forEach(critic => {
            if (critic.albums) {
                critic.albums.forEach(entry => {
                    if (entry.album === albumTitle && typeof entry.rating === 'number') {
                        ratings.push({ critic: critic.critic, rating: entry.rating, review: entry.review || '' });
                    }
                });
            }
        });
        if (ratings.length === 0) return null;
        const avg = ratings.reduce((s, r) => s + r.rating, 0) / ratings.length;
        return { average: Math.round(avg * 10) / 10, reviews: ratings };
    }

    function showCriticsForAlbum(albumTitle) {
        const info = getCriticsRating(albumTitle);
        if (info) {
            modalRating.textContent = info.average.toFixed(1) + '/10';
            modalRating.style.cursor = 'pointer';
            modalRating.onclick = () => {
                modalCritics.classList.toggle('hidden');
                if (!modalCritics.classList.contains('hidden')) {
                    modalCriticsList.innerHTML = '';
                    info.reviews.forEach(r => {
                        const li = document.createElement('li');
                        li.innerHTML = `<div class="critic-name">${r.critic} <span class="critic-rating">${r.rating}/10</span></div>
                                         <div class="critic-review">${r.review}</div>`;
                        modalCriticsList.appendChild(li);
                    });
                }
            };
        } else {
            modalRating.textContent = '';
            modalRating.onclick = null;
            modalCritics.classList.add('hidden');
        }
    }

    // ---------- ИСПОЛНИТЕЛЬ ГОДА ----------
    function renderArtistOfYear(data) {
        if (!data || !artistOfYearBlock) return;
        const trackInfo = data.track || {};
        let album = null, track = null;
        if (trackInfo.file) {
            album = allAlbums.find(a => a.tracks.some(t => t.file === trackInfo.file));
            if (album) track = album.tracks.find(t => t.file === trackInfo.file);
        }
        const trackCover = trackInfo.cover || (track && track.cover) || (album && album.cover) || 'placeholder.jpg';
        const trackTitle = trackInfo.title || (track && track.title) || 'Неизвестный трек';
        const trackArtist = trackInfo.artist || (album && album.artist) || data.name;
        const labelText = (album && album.label) ? album.label : '';

        artistOfYearBlock.innerHTML = `
            <div class="aoy-left">
                <div class="aoy-name">${data.name}</div>
                <img class="aoy-photo" src="photo/${data.photo}" alt="${data.name}" onerror="this.src='photo/placeholder.jpg'">
            </div>
            <div class="aoy-right">
                <div class="aoy-description">${data.description || ''}</div>
                <div class="aoy-track" id="aoy-track">
                    <div class="aoy-track-cover-wrapper">
                        <img class="aoy-track-cover" src="photo/${trackCover}" alt="" onerror="this.src='photo/placeholder.jpg'">
                        <div class="aoy-track-play">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 20,12 6,21"/></svg>
                        </div>
                    </div>
                    <div class="aoy-track-info">
                        <div class="aoy-track-text">
                            <span class="aoy-track-title">${trackTitle}</span>
                            <span class="aoy-track-artist">${trackArtist}</span>
                        </div>
                        ${labelText ? `<span class="aoy-track-label">${labelText}</span>` : ''}
                    </div>
                </div>
            </div>
        `;

        const trackEl = document.getElementById('aoy-track');
        trackEl.addEventListener('click', () => {
            if (album && track) {
                stopGlobalShuffle();
                currentAlbum = album;
                const idx = album.tracks.findIndex(t => t.file === track.file);
                if (idx !== -1) playTrackByIndex(idx);
            } else if (trackInfo.file) {
                stopGlobalShuffle();
                currentAlbum = {
                    artist: trackArtist, cover: trackCover, title: 'Исполнитель года',
                    tracks: [{ file: trackInfo.file, title: trackTitle, artist: trackArtist, cover: trackCover,
                        duration: trackInfo.duration || '0:00', plays: trackInfo.plays || '' }]
                };
                currentTrackIndex = 0;
                loadAndPlay(currentAlbum.tracks[0]);
            }
        });
    }

    // ---------- КАРУСЕЛЬ ----------
    function goToSlide(index) {
        const allSlides = Array.from(document.querySelectorAll('.carousel-slide'));
        const visibleSlides = allSlides.filter(s => s.style.display !== 'none');
        if (!carouselTrack || visibleSlides.length === 0) return;

        const total = allSlides.length;
        if (index < 0) index = total - 1;
        if (index >= total) index = 0;

        let attempts = 0;
        while (allSlides[index].style.display === 'none' && attempts < total) {
            index = (index + 1) % total;
            attempts++;
        }

        const targetSlide = allSlides[index];
        currentSlide = index;

        // Смещаем трек на реальную позицию слайда. Так соседние панели не
        // проваливаются/исчезают при перелистывании и корректно работают
        // даже когда ширина карусели меняется адаптивно.
        carouselTrack.style.transform = `translate3d(-${targetSlide.offsetLeft}px, 0, 0)`;

        allSlides.forEach((slide, i) => {
            const active = i === index;
            slide.classList.toggle('is-active', active);
            slide.setAttribute('aria-hidden', active ? 'false' : 'true');
        });
        document.querySelectorAll('#carousel-dots .dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
    }

    function startCarouselAuto() {
        clearInterval(carouselTimer);
        carouselTimer = setInterval(() => { goToSlide(currentSlide + 1); }, 25000);
    }

    if (carouselDots) {
        carouselDots.addEventListener('click', (e) => {
            const dot = e.target.closest('.dot');
            if (!dot) return;
            if (dot.style.display === 'none') return;
            goToSlide(parseInt(dot.dataset.index, 10));
            startCarouselAuto();
        });
    }

    let touchStartX = 0;
    if (carouselTrack) {
        carouselTrack.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
        carouselTrack.addEventListener('touchend', (e) => {
            const diff = touchStartX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) {
                if (diff > 0) goToSlide(currentSlide + 1);
                else goToSlide(currentSlide - 1);
                startCarouselAuto();
            }
        });
    }

    // ---------- РЕСАЙЗ ----------
    (function initLyricsResize() {
        const resizer = document.getElementById('lyrics-resizer');
        if (!resizer) return;
        const BASE_WIDTH = 350;
        const MIN_WIDTH = Math.round(BASE_WIDTH * 0.8);
        const MAX_WIDTH = Math.round(BASE_WIDTH * 1.5);
        const LS_KEY = 'fartify_lyrics_width';
        let saved = parseInt(localStorage.getItem(LS_KEY), 10);
        if (isNaN(saved)) saved = BASE_WIDTH;
        saved = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, saved));
        function applyWidth(w) { document.documentElement.style.setProperty('--lyrics-width', w + 'px'); }
        applyWidth(saved);
        let isDragging = false, startX = 0, startWidth = 0;
        function getCurrentWidth() {
            const v = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--lyrics-width'), 10);
            return isNaN(v) ? BASE_WIDTH : v;
        }
        function beginDrag(clientX) {
            isDragging = true; startX = clientX; startWidth = getCurrentWidth();
            resizer.classList.add('active');
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'ew-resize';
        }
        function doDrag(clientX) {
            if (!isDragging) return;
            let newWidth = startWidth - (clientX - startX);
            newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
            applyWidth(newWidth);
        }
        function endDrag() {
            if (!isDragging) return;
            isDragging = false;
            resizer.classList.remove('active');
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            localStorage.setItem(LS_KEY, getCurrentWidth());
        }
        resizer.addEventListener('mousedown', (e) => { e.preventDefault(); beginDrag(e.clientX); });
        document.addEventListener('mousemove', (e) => doDrag(e.clientX));
        document.addEventListener('mouseup', endDrag);
        resizer.addEventListener('touchstart', (e) => { e.preventDefault(); beginDrag(e.touches[0].clientX); }, { passive: false });
        document.addEventListener('touchmove', (e) => { if (!isDragging) return; doDrag(e.touches[0].clientX); }, { passive: true });
        document.addEventListener('touchend', endDrag);
    })();

    // ---------- ИНИЦИАЛИЗАЦИЯ ----------
    audio.volume = 0.7;
    updateVolumeUI();
    loadFavorites();

    (function initPath() {
        const params = new URLSearchParams(window.location.search);
        const path = params.get('path');
        if (path) {
            initialPath = true;
            const cleanPath = path.replace(/^\//, '');
            window.history.replaceState({}, '', BASE_PATH + cleanPath);
        }
    })();

    Promise.all([
        fetch('data.json').then(r => r.json()),
        fetch('artists.json').then(r => r.json()).catch(() => []),
        fetch('text.json').then(r => r.json()).catch(() => []),
        fetch('track-covers.json').then(r => r.json()).catch(() => []),
        fetch('critics.json').then(r => r.json()).catch(() => []),
        fetch('artist-of-year.json').then(r => r.json()).catch(() => null),
        fetch('live_text.json').then(r => r.json()).catch(() => ({}))
    ])
    .then(([albumsData, artistsData, textData, trackCoverData, critics, aoyData, liveData]) => {
        allAlbums = albumsData;
        artistsMap = {};
        artistsData.forEach(a => { artistsMap[a.name] = a; });
        texts = {};
        textData.forEach(t => { texts[t.file] = t.text; });
        trackCovers = {};
        trackCoverData.forEach(t => { trackCovers[t.file] = t.cover; });
        criticsData = critics;
        liveTexts = liveData || {};

        buildUniqueArtists(albumsData);
        buildPlaylists();
        const shuffled = [...albumsData].sort(() => Math.random() - 0.5);
        renderAlbums(shuffled);
        generateAutoPlaylists();
        renderRecent();
        renderArtistOfYear(aoyData);
        renderNewReleases();
        callFitAfterRender();
        handleRouting();
        goToSlide(currentSlide);
        startCarouselAuto();
        updatePlaybackUI();

        if (!initialPath && (getRelativePath() === '/' || getRelativePath() === BASE_PATH.replace(/\/$/, ''))) {
            restorePlayerFromState();
        }
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
            modal.classList.add('hidden');
            openedModalAlbum = null;
            playlistModal.classList.add('hidden');
            openedPlaylistTitle = null;
            artistPage.classList.add('hidden');
            mainContent.classList.remove('hidden');
            renderRecent();
            updatePlaybackUI();
            callFitAfterRender();
        }
    }

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
        previousPath = window.location.pathname;
        window.history.pushState({}, '', newPath);
        handleRouting();
    });

    window.addEventListener('popstate', handleRouting);

    // ---------- ВСПОМОГАТЕЛЬНЫЕ ----------
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

    // ---------- ИЗБРАННОЕ ----------
    function loadFavorites() {
        const stored = localStorage.getItem('favorites');
        if (stored) { try { favorites = JSON.parse(stored); } catch (e) { favorites = []; } }
        else favorites = [];
    }
    function saveFavorites() { localStorage.setItem('favorites', JSON.stringify(favorites)); }
    function isFavorite(track) {
        return favorites.some(fav => fav.file === track.file && fav.artist === track.artist && fav.title === track.title);
    }
    function addFavorite(track) {
        if (!isFavorite(track)) {
            favorites.push({
                file: track.file, title: track.title, artist: track.artist,
                cover: track.cover || currentAlbum?.cover,
                albumTitle: track.albumTitle || currentAlbum?.title,
                duration: track.duration, plays: track.plays,
                dateAdded: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
            });
            saveFavorites();
        }
    }
    function removeFavorite(track) {
        favorites = favorites.filter(fav => !(fav.file === track.file && fav.artist === track.artist && fav.title === track.title));
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

    // ---------- ДЕДУПЛИКАЦИЯ ----------
    function getArtistDeduplicatedStats(artistName) {
        const artistAlbums = allAlbums.filter(album => album.artist === artistName);
        const trackMap = new Map();
        artistAlbums.forEach(album => {
            album.tracks.forEach(track => {
                const file = track.file;
                const plays = parseInt(track.plays?.replace(/\s/g, '')) || 0;
                if (!trackMap.has(file)) {
                    trackMap.set(file, { file, title: track.title, artist: artistName, plays, duration: track.duration, cover: null, albumDate: album.date });
                } else {
                    const existing = trackMap.get(file);
                    if (plays > existing.plays) {
                        existing.plays = plays; existing.title = track.title;
                        existing.duration = track.duration; existing.albumDate = album.date;
                    }
                }
            });
        });
        for (const [file, track] of trackMap) track.cover = getTrackCover(file, artistAlbums);
        const totalPlays = Array.from(trackMap.values()).reduce((sum, t) => sum + t.plays, 0);
        const topTracks = Array.from(trackMap.values()).sort((a, b) => b.plays - a.plays).slice(0, 5);
        return { totalPlays, topTracks };
    }

    // ---------- ИСПОЛНИТЕЛИ ----------
    function buildUniqueArtists(albums) {
        const artistStats = {};
        albums.forEach(album => {
            if (!artistStats[album.artist]) artistStats[album.artist] = { totalPlays: 0, cover: album.cover };
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
        callFitAfterRender();
    }

    // ---------- ПЛЕЙЛИСТ ИЗБРАННОЕ ----------
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
                albumTitle: fav.albumTitle, duration: fav.duration, dateAdded: fav.dateAdded, plays: fav.plays || ''
            }));
            if (tracks.length === 0) return;
            handlePlaylistPlayClick('Избранное', tracks);
        });
        playlistsGrid.insertBefore(playlistCard, playlistsGrid.firstChild);
        updatePlaybackUI();
    }

    function handlePlaylistPlayClick(playlistTitle, tracks) {
        const isThisPlaylist = currentAlbum
            && currentAlbum.isPlaylist
            && currentAlbum.playlistTitle === playlistTitle
            && !isGlobalShuffle;
        if (isThisPlaylist) {
            if (audio.paused) audio.play();
            else audio.pause();
        } else {
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

    // ---------- АВТО-ПЛЕЙЛИСТЫ ----------
    async function getPlaylistMeta(playlistId) {
        try {
            const res = await fetch('playlist-covers.json');
            if (!res.ok) throw new Error('playlist-covers.json не загрузился');
            const data = await res.json();
            const items = data[String(playlistId)];
            if (!items || items.length === 0) return { cover: 'photo/placeholder.jpg', title: `Плейлист №${playlistId}` };
            const chosen = items[Math.floor(Math.random() * items.length)];
            let coverFile = '', titleText = `Плейлист №${playlistId}`;
            if (typeof chosen === 'object' && chosen !== null) {
                coverFile = chosen.cover || chosen.file || '';
                titleText = chosen.title || titleText;
            } else if (typeof chosen === 'string') coverFile = chosen;
            if (!coverFile) return { cover: 'photo/placeholder.jpg', title: titleText };
            return { cover: `playlist/${playlistId}/${coverFile}`, title: titleText };
        } catch (e) {
            return { cover: 'photo/placeholder.jpg', title: `Плейлист №${playlistId}` };
        }
    }

    async function generateAutoPlaylists() {
        const allTracks = [];
        allAlbums.forEach(album => {
            album.tracks.forEach(track => {
                allTracks.push({
                    ...track, artist: album.artist,
                    cover: getTrackCover(track.file, [album]), albumTitle: album.title
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
                    selected.push(track); usedFiles.add(track.file);
                    if (selected.length >= TRACKS_PER_PLAYLIST) break;
                }
            }
            const meta = await getPlaylistMeta(i);
            autoPlaylists.push({ id: i, title: meta.title, cover: meta.cover, tracks: selected });
        }
        const parsePlays = (str) => parseInt(str.replace(/\s/g, '')) || 0;
        const uniqueMap = new Map();
        allTracks.forEach(track => {
            if (!uniqueMap.has(track.file)) uniqueMap.set(track.file, track);
            else {
                const existing = uniqueMap.get(track.file);
                if (parsePlays(track.plays) > parsePlays(existing.plays)) uniqueMap.set(track.file, track);
            }
        });
        const top50 = Array.from(uniqueMap.values())
            .sort((a, b) => parsePlays(b.plays) - parsePlays(a.plays))
            .slice(0, 50);
        autoPlaylists.push({ id: 'chart', title: 'Fartify топ-50', cover: 'photo/chart.png', tracks: top50 });
        renderAutoPlaylists();
    }

    function renderAutoPlaylists() {
        document.querySelectorAll('.playlist-card.auto-playlist').forEach(c => c.remove());
        autoPlaylists.forEach(pl => {
            const card = document.createElement('a');
            card.className = 'playlist-card auto-playlist';
            card.href = (pl.id === 'chart') ? BASE_PATH + 'chart' : BASE_PATH + 'playlist/' + pl.id;
            card.dataset.playlistTitle = pl.title;
            card.innerHTML = `
                <img src="${pl.cover}" alt="${pl.title}" onerror="this.src='photo/placeholder.jpg'">
                <button class="playlist-play-btn" title="Играть">${getPlaySvg(20)}</button>
                <div class="playlist-name">${pl.title}</div>
                <div class="playlist-track-count">${pl.tracks.length} треков</div>
                ${pl.tracks.length > 0 ? `<img class="playlist-mini-cover" src="photo/${pl.tracks[0].cover}" alt="" onerror="this.style.display='none'">` : ''}
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

    // ---------- МОДАЛКА ПЛЕЙЛИСТА ----------
    function showPlaylistModal(config) {
        const { title, cover, tracks, showDate, showFavorite, showAlbum, showPlays } = config;
        let plPath = BASE_PATH;
        if (title === 'Избранное') plPath = BASE_PATH + 'favorites';
        else if (title === 'Fartify топ-50') plPath = BASE_PATH + 'chart';
        else {
            const pl = autoPlaylists.find(p => p.title === title);
            if (pl && typeof pl.id === 'number') plPath = BASE_PATH + 'playlist/' + pl.id;
        }
        if (window.location.pathname !== plPath) {
            window.history.pushState({}, '', plPath);
        }

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
            let rowHTML = `<span class="track-num">${index + 1}</span>`;
            rowHTML += `<img class="track-cover" src="photo/${track.cover}" alt="" onerror="this.style.display='none'">`;
            rowHTML += `<div class="track-title-col"><span>${track.title}</span><span class="track-artist">${track.artist}</span></div>`;
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
                favBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleFavorite(track); });
            }

            row.addEventListener('click', () => {
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
        if (window.location.pathname !== previousPath) {
            window.history.pushState({}, '', previousPath);
        }
    }

    function closePlaylistAndRestoreUrl() {
        playlistModal.classList.add('hidden');
        openedPlaylistTitle = null;
        restorePreviousUrl();
        updatePlaybackUI();
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
                <img src="photo/${album.cover}" alt="${album.title}" onerror="this.src='photo/placeholder.jpg'">
                <button class="album-play-btn" title="Играть">${getPlaySvg(20)}</button>
                <div class="title">${album.title}</div>
                <div class="artist">${album.artist}</div>
                <div class="date">${album.date || ''}</div>
            `;
            card.querySelector('.album-play-btn').addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                handleCardPlayClick(album);
            });
            albumsGrid.appendChild(card);
        });
        callFitAfterRender();
        updatePlaybackUI();
    }

    // ---------- МОДАЛКА АЛЬБОМА ----------
    function openModal(album, type) {
        const releasePath = BASE_PATH + 'release/' + encodeURIComponent(album.title);
        if (window.location.pathname !== releasePath) {
            window.history.pushState({}, '', releasePath);
        }
        openedModalAlbum = album;

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

        showCriticsForAlbum(album.title);

        modalPlayBtn.onclick = () => {
            const isThisAlbum = currentAlbum
                && !currentAlbum.isPlaylist
                && currentAlbum.title === openedModalAlbum.title
                && currentAlbum.artist === openedModalAlbum.artist
                && !isGlobalShuffle;
            if (isThisAlbum) {
                if (audio.paused) audio.play();
                else audio.pause();
            } else {
                playAlbumFromModal(album, 0);
            }
        };

        modalTracks.innerHTML = '';
        album.tracks.forEach((track, index) => {
            const row = document.createElement('li');
            row.className = 'track-row';
            const isFav = isFavorite({
                file: track.file, title: track.title, artist: album.artist,
                cover: album.cover, albumTitle: album.title,
                duration: track.duration, plays: track.plays
            });
            row.innerHTML = `
                <span class="track-num">${index + 1}</span>
                <span class="track-title-col">${track.title}</span>
                <span class="track-plays">${track.plays || ''}</span>
                <span class="track-duration">${track.duration || ''}</span>
                <button class="favorite-btn ${isFav ? 'active' : ''}" data-file="${track.file}" data-artist="${album.artist}">
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
                    cover: album.cover, albumTitle: album.title,
                    duration: track.duration, plays: track.plays
                });
            });
            row.addEventListener('click', (e) => {
                e.stopPropagation();
                const isSame = currentAlbum
                    && !currentAlbum.isPlaylist
                    && currentAlbum.title === album.title
                    && currentAlbum.artist === album.artist
                    && currentTrackIndex === index
                    && !isGlobalShuffle;
                if (isSame) {
                    if (audio.paused) audio.play();
                    else audio.pause();
                } else {
                    playAlbumFromModal(album, index);
                }
            });
            modalTracks.appendChild(row);
        });

        modalFooterDate.textContent = date ? date : '';
        modalFooterLabel.textContent = album.label || '';
        modalCritics.classList.add('hidden');
        modal.classList.remove('hidden');
        updatePlaybackUI();
    }

    function playAlbumFromModal(album, index = 0) {
        stopGlobalShuffle();
        currentAlbum = album;
        playTrackByIndex(index);
        addToRecent(album);
    }

    function closeAlbumAndRestoreUrl() {
        modal.classList.add('hidden');
        openedModalAlbum = null;
        restorePreviousUrl();
        updatePlaybackUI();
    }

    closeBtn.addEventListener('click', closeAlbumAndRestoreUrl);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeAlbumAndRestoreUrl();
    });

    // ---------- ВОСПРОИЗВЕДЕНИЕ ----------
    function playTrackByIndex(index, options = {}) {
        if (!currentAlbum || !currentAlbum.tracks?.[index]) return;
        currentTrackIndex = index;
        if (shuffle && !options.fromShuffle) resetShuffleQueue(currentTrackIndex);
        else if (shuffle) syncShuffleQueueToCurrent();
        loadAndPlay(currentAlbum.tracks[currentTrackIndex]);
        if (!history.includes(currentTrackIndex)) history.push(currentTrackIndex);
        savePlayerState();
        renderQueue();
    }

    function loadAndPlay(track) {
        if (!track) return;
        audio.src = `music/${track.file}`;
        const trackCoverFile = track.cover || getTrackCover(track.file, allAlbums.filter(a => a.artist === track.artist));
        playerCover.src = `photo/${trackCoverFile}`;
        playerTitle.textContent = track.title || '';
        playerArtist.textContent = track.artist || (currentAlbum ? currentAlbum.artist : '');
        currentTrackMeta = { ...track, artist: track.artist || (currentAlbum ? currentAlbum.artist : '') };
        updateLyricsNowPlaying(currentTrackMeta);
        updatePlayPauseIcon(true);
        const trackWithMeta = {
            file: track.file, title: track.title,
            artist: track.artist || (currentAlbum ? currentAlbum.artist : ''),
            cover: trackCoverFile, albumTitle: track.albumTitle || currentAlbum?.title,
            duration: track.duration, plays: track.plays
        };
        const isFav = isFavorite(trackWithMeta);
        playerFavBtn.classList.toggle('active', isFav);
        updatePlayerHeartFill(isFav);
        playerFavBtn.onclick = () => toggleFavorite(trackWithMeta);
        audio.play().catch(e => console.warn('Автовоспроизведение:', e));
        updateLyricsPanel(track);
        updateMediaSession(trackWithMeta);
        savePlayerState();
        updatePlaybackUI();
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

    // ---------- ТЕКСТ / КАРАОКЕ ----------
    function updateLyricsPanel(track) {
        const coverFile = track.cover || getTrackCover(track.file, allAlbums.filter(a => a.artist === track.artist));
        lyricsCover.src = `photo/${coverFile}`;
        lyricsBackground.style.backgroundImage = `url(photo/${coverFile})`;

        currentLyricLines = [];
        activeLyricIndex = -1;

        const liveData = liveTexts[track.file];

        if (Array.isArray(liveData) && liveData.length > 0) {
            lyricsText.classList.add('karaoke');
            lyricsText.innerHTML = '';
            liveData.forEach(line => {
                const div = document.createElement('div');
                div.className = 'lyric-line';
                div.dataset.time = line.time;

                const textSpan = document.createElement('span');
                textSpan.textContent = line.text || '';
                div.appendChild(textSpan);

                if (line.gif) {
                    const gif = document.createElement('img');
                    gif.className = 'lyric-line-gif';
                    gif.src = line.gif;
                    gif.alt = '';
                    gif.onerror = () => { gif.style.display = 'none'; };
                    div.appendChild(gif);
                }
                lyricsText.appendChild(div);
                currentLyricLines.push(div);
            });
            updateKaraokeLines();
        } else {
            lyricsText.classList.remove('karaoke');
            const text = texts[track.file] || 'Увы, Гладун забыл текст этой песни';
            const pre = document.createElement('pre');
            pre.className = 'lyrics-plain';
            pre.textContent = text;
            lyricsText.innerHTML = '';
            lyricsText.appendChild(pre);
        }
    }

    function updateKaraokeLines() {
        if (!currentLyricLines.length) return;
        const t = audio.currentTime;
        let newActiveIndex = -1;
        for (let i = 0; i < currentLyricLines.length; i++) {
            const lineTime = parseFloat(currentLyricLines[i].dataset.time);
            if (!isNaN(lineTime) && t >= lineTime) newActiveIndex = i;
            else break;
        }
        if (newActiveIndex === activeLyricIndex) return;
        currentLyricLines.forEach((line, i) => {
            const dist = Math.abs(i - newActiveIndex);
            line.classList.toggle('active', i === newActiveIndex);
            line.classList.toggle('past', i < newActiveIndex);
            line.classList.toggle('near', dist >= 1 && dist <= 2);
            line.classList.toggle('far', dist >= 3);
        });
        activeLyricIndex = newActiveIndex;
        if (newActiveIndex >= 0) {
            const el = currentLyricLines[newActiveIndex];
            const container = el.closest('[data-lyrics-scroll]') || el.closest('.lyrics-content');
            if (container) {
                const targetTop = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
                container.scrollTo({ top: targetTop, behavior: 'smooth' });
            }
        }
    }

    function updatePlayPauseIcon(playing) {
        if (playing) { playIcon.style.display = 'none'; pauseIcon.style.display = 'block'; }
        else { playIcon.style.display = 'block'; pauseIcon.style.display = 'none'; }
    }

    // ---------- РЕКОМЕНДАЦИИ ----------
    function buildGlobalPlaylist() {
        const allTracks = [];
        allAlbums.forEach(album => {
            album.tracks.forEach(track => {
                allTracks.push({
                    ...track, artist: album.artist,
                    cover: getTrackCover(track.file, [album]), albumTitle: album.title
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
        savePlayerState();
        updatePlaybackUI();
    }

    function playGlobalTrack() {
        if (globalPlaylist.length === 0 || globalCurrentIndex < 0) return;
        const track = globalPlaylist[globalCurrentIndex];
        currentAlbum = { artist: track.artist, cover: track.cover, title: track.albumTitle, tracks: [track] };
        currentTrackIndex = 0;
        loadAndPlay(track);
        renderQueue();
    }

    function stopGlobalShuffle() {
        if (isGlobalShuffle) {
            isGlobalShuffle = false; globalPlaylist = []; globalCurrentIndex = -1;
            shuffleBtn.disabled = false; savePlayerState();
            updatePlaybackUI();
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

    // ---------- УПРАВЛЕНИЕ ----------
    function togglePlay() {
        if (!audio.src) return;
        if (audio.paused) { audio.play(); updatePlayPauseIcon(true); }
        else { audio.pause(); updatePlayPauseIcon(false); }
        savePlayerState();
    }
    function nextTrack() {
        if (isGlobalShuffle) { globalNext(); return; }
        if (!currentAlbum || currentAlbum.tracks.length === 0) return;
        if (repeat === 'one') {
            audio.currentTime = 0;
            audio.play().catch(() => {});
            return;
        }

        let nextIndex = -1;
        if (shuffle) {
            syncShuffleQueueToCurrent();
            const nextPos = shuffleQueuePosition + 1;
            if (nextPos < shuffleQueue.length) {
                shuffleQueuePosition = nextPos;
                nextIndex = shuffleQueue[nextPos];
            } else if (repeat === 'all') {
                resetShuffleQueue(currentTrackIndex);
                nextIndex = shuffleQueue.length > 1 ? shuffleQueue[1] : shuffleQueue[0];
                shuffleQueuePosition = shuffleQueue.length > 1 ? 1 : 0;
            }
        } else {
            nextIndex = currentTrackIndex + 1;
            if (nextIndex >= currentAlbum.tracks.length) {
                if (repeat === 'none') { audio.pause(); updatePlayPauseIcon(false); return; }
                nextIndex = 0;
            }
        }

        if (nextIndex < 0) {
            audio.pause();
            updatePlayPauseIcon(false);
            renderQueue();
            return;
        }
        playTrackByIndex(nextIndex, { fromShuffle: shuffle });
    }

    function prevTrack() {
        if (isGlobalShuffle) { globalPrev(); return; }
        if (!currentAlbum || currentAlbum.tracks.length === 0) return;
        if (shuffle && history.length > 1) {
            history.pop();
            const prevIndex = history.pop();
            if (prevIndex !== undefined) playTrackByIndex(prevIndex, { fromShuffle: true });
            else playTrackByIndex(0, { fromShuffle: true });
        } else {
            let prevIndex = currentTrackIndex - 1;
            if (prevIndex < 0) prevIndex = currentAlbum.tracks.length - 1;
            playTrackByIndex(prevIndex, { fromShuffle: shuffle });
        }
    }

    function toggleShuffle() {
        if (isGlobalShuffle) return;
        shuffle = !shuffle;
        if (shuffle) {
            shuffleBtn.classList.add('active');
            history = [currentTrackIndex];
            resetShuffleQueue(currentTrackIndex);
        } else {
            shuffleBtn.classList.remove('active');
            shuffleQueue = [];
            shuffleQueuePosition = -1;
        }
        savePlayerState();
        renderQueue();
    }
    function updateRepeatIcon() {
        if (repeat === 'one') {
            repeatAllIcon.style.display = 'none'; repeatOneIcon.style.display = 'block';
            repeatBtn.classList.add('active');
        } else if (repeat === 'all') {
            repeatAllIcon.style.display = 'block'; repeatOneIcon.style.display = 'none';
            repeatBtn.classList.add('active');
        } else {
            repeatAllIcon.style.display = 'block'; repeatOneIcon.style.display = 'none';
            repeatBtn.classList.remove('active');
        }
    }
    function toggleRepeat() {
        if (repeat === 'none') repeat = 'all';
        else if (repeat === 'all') repeat = 'one';
        else repeat = 'none';
        updateRepeatIcon();
        savePlayerState();
    }

    playPauseBtn.addEventListener('click', togglePlay);
    nextBtn.addEventListener('click', nextTrack);
    prevBtn.addEventListener('click', prevTrack);
    shuffleBtn.addEventListener('click', toggleShuffle);
    repeatBtn.addEventListener('click', toggleRepeat);
    updateRepeatIcon();

    // ---------- ПРОГРЕСС ----------
    audio.addEventListener('timeupdate', () => {
        if (!audio.duration) return;
        const percent = (audio.currentTime / audio.duration) * 100;
        progressBar.value = percent;
        progressFill.style.width = percent + '%';
        currentTimeEl.textContent = formatTime(audio.currentTime);
        updateKaraokeLines();
        clearTimeout(saveTimeTimeout);
        saveTimeTimeout = setTimeout(savePlayerState, 5000);
    });
    audio.addEventListener('loadedmetadata', () => {
        durationEl.textContent = formatTime(audio.duration);
        progressBar.max = 100; progressBar.value = 0;
        progressFill.style.width = '0%';
    });
    audio.addEventListener('seeked', () => {
        activeLyricIndex = -1;
        updateKaraokeLines();
    });
    progressBar.addEventListener('input', () => {
        const seekTime = (progressBar.value / 100) * audio.duration;
        audio.currentTime = seekTime;
        progressFill.style.width = progressBar.value + '%';
        clearTimeout(saveTimeTimeout);
        saveTimeTimeout = setTimeout(savePlayerState, 1000);
    });
    audio.addEventListener('ended', () => {
        if (repeat === 'one') { audio.currentTime = 0; audio.play(); }
        else nextTrack();
    });
    audio.addEventListener('play', () => {
        updatePlayPauseIcon(true);
        updatePlaybackUI();
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    });
    audio.addEventListener('pause', () => {
        updatePlayPauseIcon(false);
        updatePlaybackUI();
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    });

    // ---------- ГРОМКОСТЬ ----------
    function updateVolumeUI() {
        const vol = audio.volume;
        volumeBar.value = vol * 100;
        volumeFill.style.width = (vol * 100) + '%';
        if (vol === 0) { volumeOnIcon.style.display = 'none'; volumeOffIcon.style.display = 'block'; }
        else { volumeOnIcon.style.display = 'block'; volumeOffIcon.style.display = 'none'; }
    }
    volumeBar.addEventListener('input', () => {
        const vol = volumeBar.value / 100;
        audio.volume = vol;
        volumeFill.style.width = volumeBar.value + '%';
        updateVolumeUI();
        savePlayerState();
    });
    volumeBtn.addEventListener('click', () => {
        if (audio.volume > 0) { lastVolume = audio.volume; audio.volume = 0; }
        else audio.volume = lastVolume || 0.7;
        updateVolumeUI();
        savePlayerState();
    });

    // ---------- ПАНЕЛЬ ТЕКСТА ----------
    function openLyricsFullscreen() {
        if (!lyricsFullOverlay || !lyricsFullContent || !lyricsText) return;
        if (!lyricsPreviewParent) lyricsPreviewParent = lyricsText.parentElement;
        if (!lyricsFullContent.contains(lyricsText)) lyricsFullContent.appendChild(lyricsText);
        lyricsFullOverlay.classList.remove('hidden');
        lyricsPanel.classList.add('lyrics-fullscreen-open');
        isLyricsFullscreen = true;
        if (lyricsExpandBtn) lyricsExpandBtn.textContent = 'Свернуть';
        requestAnimationFrame(() => updateKaraokeLines());
    }

    function closeLyricsFullscreen() {
        if (!lyricsFullOverlay || !lyricsText) return;
        if (lyricsPreviewParent && !lyricsPreviewParent.contains(lyricsText)) lyricsPreviewParent.appendChild(lyricsText);
        lyricsFullOverlay.classList.add('hidden');
        lyricsPanel.classList.remove('lyrics-fullscreen-open');
        isLyricsFullscreen = false;
        if (lyricsExpandBtn) lyricsExpandBtn.textContent = 'Развернуть';
        requestAnimationFrame(() => updateKaraokeLines());
    }

    lyricsBtn.addEventListener('click', () => {
        const willOpen = !lyricsPanel.classList.contains('open');
        lyricsPanel.classList.toggle('open', willOpen);
        document.body.classList.toggle('lyrics-open', willOpen);

        if (willOpen) {
            // Каждый новый вход в «Сейчас играет» начинается с компактной
            // очереди — один следующий трек виден сразу.
            queueExpanded = false;
            renderQueue();
        }

        if (!willOpen && isLyricsFullscreen) closeLyricsFullscreen();
    });

    lyricsCloseBtn.addEventListener('click', () => {
        if (isLyricsFullscreen) closeLyricsFullscreen();
        lyricsPanel.classList.remove('open');
        document.body.classList.remove('lyrics-open');
    });

    if (lyricsExpandBtn) {
        lyricsExpandBtn.addEventListener('click', () => {
            if (isLyricsFullscreen) closeLyricsFullscreen();
            else openLyricsFullscreen();
        });
    }

    if (lyricsFullClose) lyricsFullClose.addEventListener('click', closeLyricsFullscreen);
    if (lyricsFullOverlay) lyricsFullOverlay.addEventListener('click', (e) => {
        if (e.target === lyricsFullOverlay) closeLyricsFullscreen();
    });

    if (lyricsNowArtist) {
        lyricsNowArtist.addEventListener('click', () => {
            const artist = lyricsNowArtist.dataset.artist || currentTrackMeta?.artist;
            if (!artist) return;
            if (isLyricsFullscreen) closeLyricsFullscreen();
            stopGlobalShuffle();
            showArtistPage(artist);
        });
    }

    if (queueNext) queueNext.addEventListener('click', (e) => {
        const row = e.target.closest('.queue-item');
        if (!row) return;
        playQueuedItem(row);
    });
    if (queueFull) queueFull.addEventListener('click', (e) => {
        const row = e.target.closest('.queue-item');
        if (!row) return;
        playQueuedItem(row);
    });
    if (queueToggle) queueToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        queueExpanded = !queueExpanded;

        // Не перерисовываем всю очередь при обычном раскрытии/сворачивании:
        // так кнопка никогда не теряет фокус/событие, а список плавно меняет состояние.
        if (queueFull) queueFull.classList.toggle('hidden', !queueExpanded);
        queueToggle.textContent = queueExpanded
            ? 'Свернуть'
            : `Все ${Math.min(15, getQueueTracks(15).length)}`;
        queueToggle.setAttribute('aria-expanded', queueExpanded ? 'true' : 'false');
        queueToggle.title = queueExpanded
            ? 'Свернуть очередь'
            : `Показать следующие треки`;

        if (queueExpanded) {
            requestAnimationFrame(() => {
                queueFull?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        }
    });

    lyricsCover.addEventListener('click', () => {
        if (!lyricsCover.src) return;
        imageModalImg.src = lyricsCover.src;
        imageModal.classList.remove('hidden');
    });

    // ---------- ПОИСК ----------
    if (searchInput && searchResults) {
        searchInput.addEventListener('input', () => {
            const q = searchInput.value.trim();
            if (q.length === 0) {
                searchResults.classList.add('hidden');
                searchClear.classList.add('hidden');
                return;
            }
            searchClear.classList.remove('hidden');
            renderSearchResults(q);
        });

        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            searchResults.classList.add('hidden');
            searchClear.classList.add('hidden');
            searchInput.focus();
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                searchResults.classList.add('hidden');
                searchInput.blur();
            }
        });

        searchResults.addEventListener('click', (e) => {
            const item = e.target.closest('.search-result-item');
            if (!item) return;
            const type = item.dataset.type;

            const closeSearch = () => {
                searchResults.classList.add('hidden');
                searchInput.value = '';
                searchClear.classList.add('hidden');
            };

            if (type === 'artist') {
                const name = item.dataset.name;
                closeSearch();
                stopGlobalShuffle();
                showArtistPage(name);
            } else if (type === 'album') {
                const title = item.dataset.title;
                const album = allAlbums.find(a => a.title === title);
                if (album) {
                    closeSearch();
                    stopGlobalShuffle();
                    openModal(album, getAlbumType(album.tracks.length));
                }
            } else if (type === 'track') {
                const file = item.dataset.file;
                for (const album of allAlbums) {
                    const idx = album.tracks.findIndex(t => t.file === file);
                    if (idx !== -1) {
                        closeSearch();
                        stopGlobalShuffle();
                        currentAlbum = album;
                        playTrackByIndex(idx);
                        break;
                    }
                }
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-wrapper')) {
                searchResults.classList.add('hidden');
            }
        });
    }

    // ---------- MEDIA KEYS ----------
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
        if (e.code === 'MediaPlayPause') { e.preventDefault(); togglePlay(); }
        else if (e.code === 'MediaTrackNext') { e.preventDefault(); nextTrack(); }
        else if (e.code === 'MediaTrackPrevious') { e.preventDefault(); prevTrack(); }
    });
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => { if (audio.paused) { audio.play(); updatePlayPauseIcon(true); } });
        navigator.mediaSession.setActionHandler('pause', () => { if (!audio.paused) { audio.pause(); updatePlayPauseIcon(false); } });
        navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
        navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
    }

    // ---------- АВТОШРИФТ ----------
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
    window.addEventListener('resize', () => { fitTitleFontSize(); });

    // ---------- СТРАНИЦА АРТИСТА ----------
    function showArtistPage(artistName) {
        const artistPath = BASE_PATH + 'Artist/' + encodeURIComponent(artistName);
        if (window.location.pathname !== artistPath) {
            window.history.pushState({}, '', artistPath);
        }
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
            popularTracksList.appendChild(row);
        });

        artistPlayBtn.onclick = () => {
            stopGlobalShuffle();
            const allTracks = artistAlbums.flatMap(album =>
                album.tracks.map(t => ({
                    ...t, artist: album.artist,
                    cover: getTrackCover(t.file, artistAlbums),
                    albumTitle: album.title
                }))
            );
            if (allTracks.length > 0) {
                currentAlbum = { artist: artistName, cover: allTracks[0].cover, title: 'Все треки ' + artistName, tracks: allTracks };
                playTrackByIndex(0);
            }
        };

        artistAlbumsGrid.innerHTML = '';
        artistAlbums.forEach(album => {
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
                <img src="photo/${album.cover}" alt="${album.title}" onerror="this.src='photo/placeholder.jpg'">
                <div class="title">${album.title}</div>
                <div class="artist">${album.artist}</div>
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
        updatePlaybackUI();
    }

    // ---------- БАННЕР ----------
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

    // ---------- ОБРАБОТЧИКИ ----------
    playerArtist.addEventListener('click', () => {
        const artist = currentTrackMeta?.artist || currentAlbum?.artist;
        if (!artist) return;
        stopGlobalShuffle();
        showArtistPage(artist);
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
        callFitAfterRender();
    });

    if (closeImageModal) closeImageModal.addEventListener('click', () => imageModal.classList.add('hidden'));
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