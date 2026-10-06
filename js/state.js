// ============================================================
// js/state.js — базовое состояние приложения и DOM-ссылки
// ============================================================

// ---------- BASE PATH ----------
const BASE_PATH = window.location.pathname.indexOf('/Fartify/') === 0 ? '/Fartify/' : '/';

// ---------- DOM-ссылки (заполняются в initDom) ----------
let mainContent, artistPage, backBtn, artistAvatar, artistNameElem, artistTotalPlaysElem, artistPlayBtn, popularTracksList, artistAlbumsGrid;
let playlistsGrid, artistsGrid, albumsGrid, recentGrid, recentSection;
let carouselTrack, carouselDots, artistOfYearBlock, newReleasesBlock;
let recommendBanner, recommendPlayBtn;
let modal, modalCover, modalTitle, modalTypeLabel, modalMeta, modalTracks, modalPlayBtn, modalFooterDate, modalFooterLabel, modalRating, modalCritics, modalCriticsList, closeBtn;
let playlistModal, playlistModalCover, playlistModalTitle, playlistModalMeta, playlistTracksList, playlistPlayBtn, closePlaylistBtn;
let player, audio, playerCover, playerTitle, playerArtist, playerFavBtn, playPauseBtn, playIcon, pauseIcon, prevBtn, nextBtn, shuffleBtn, repeatBtn, repeatAllIcon, repeatOneIcon, progressBar, progressFill, currentTimeEl, durationEl, volumeBtn, volumeBar, volumeFill, volumeOnIcon, volumeOffIcon;
let lyricsBtn, lyricsPanel, lyricsCover, lyricsText, lyricsBackground, lyricsCloseBtn, lyricsContext, lyricsNowTitle, lyricsNowArtist, lyricsExpandBtn, lyricsFullOverlay, lyricsFullClose, lyricsFullContent, queueNext, queueFull, queueToggle;
let imageModal, imageModalImg, closeImageModal;
let searchInput, searchResults, searchClear;
let audioVisualizer, visualizerCanvas;

// ---------- Данные ----------
let allAlbums = [];
let artistsMap = {};
let criticsData = [];
let texts = {};
let trackCovers = {};
let autoPlaylists = [];
let liveTexts = {};
let releaseInfo = {};
let featsData = {};

// ---------- Плеер ----------
let currentAlbum = null;
let currentTrackIndex = 0;
let shuffle = false;
let repeat = 'none';
let history = [];
let lastVolume = 0.7;
let isGlobalShuffle = false;
let globalPlaylist = [];
let globalCurrentIndex = -1;
let currentTrackMeta = null;
let shuffleQueue = [];
let shuffleQueuePosition = -1;
let saveTimeTimeout;

// ---------- Очередь ----------
let manualQueue = [];
let manualQueueIdCounter = 0;
let manualResumeState = null;
let queueExpanded = false;

// ---------- Караоке ----------
let currentLyricLines = [];
let activeLyricIndex = -1;
let isLyricsFullscreen = false;
let lyricsPreviewParent = null;

// ---------- Модалки / навигация ----------
let previousPath = BASE_PATH;
let initialPath = false;
let openedModalAlbum = null;
let openedPlaylistTitle = null;

// ---------- Избранное / блокировка ----------
let favorites = [];
let blockedTracks = new Set();

// ---------- Карусель ----------
let currentSlide = 0;
let carouselTimer = null;

// ---------- Ключи localStorage ----------
const STORAGE_KEY = 'fartify_player_state';
const RECENT_KEY = 'fartify_recent';
const BLOCKED_STORAGE_KEY = 'fartify_blocked_tracks';

// ---------- Настройки авто-плейлистов ----------
const AUTO_PLAYLIST_COUNT = 5;
const TRACKS_PER_PLAYLIST = 10;

// ------------------------------------------------------------
// initDom() — находит все DOM-элементы и присваивает их глобальным переменным
// Вызывается первым делом в main.js
// ------------------------------------------------------------
function initDom() {
    mainContent = document.getElementById('main-content');
    artistPage = document.getElementById('artist-page');
    backBtn = document.getElementById('back-btn');
    artistAvatar = document.getElementById('artist-avatar');
    artistNameElem = document.getElementById('artist-name');
    artistTotalPlaysElem = document.getElementById('artist-total-plays');
    artistPlayBtn = document.getElementById('artist-play-btn');
    popularTracksList = document.getElementById('popular-tracks-list');
    artistAlbumsGrid = document.getElementById('artist-albums-grid');

    playlistsGrid = document.getElementById('playlists-grid');
    artistsGrid = document.getElementById('artists-grid');
    albumsGrid = document.getElementById('albums-grid');
    recentGrid = document.getElementById('recent-grid');
    recentSection = document.getElementById('recent-section');

    carouselTrack = document.getElementById('carousel-track');
    carouselDots = document.getElementById('carousel-dots');
    artistOfYearBlock = document.getElementById('artist-of-year');
    newReleasesBlock = document.getElementById('new-releases-block');

    recommendBanner = document.getElementById('recommendation-banner');
    recommendPlayBtn = document.getElementById('recommend-play-btn');

    modal = document.getElementById('album-modal');
    modalCover = document.getElementById('modal-cover');
    modalTitle = document.getElementById('modal-title');
    modalTypeLabel = document.getElementById('modal-type');
    modalMeta = document.getElementById('modal-meta');
    modalTracks = document.getElementById('modal-tracks');
    modalPlayBtn = document.getElementById('modal-play-btn');
    modalFooterDate = document.getElementById('modal-footer-date');
    modalFooterLabel = document.getElementById('modal-footer-label');
    modalRating = document.getElementById('modal-rating');
    modalCritics = document.getElementById('modal-critics');
    modalCriticsList = document.getElementById('modal-critics-list');
    closeBtn = document.querySelector('#album-modal .close');

    playlistModal = document.getElementById('playlist-modal');
    playlistModalCover = document.getElementById('playlist-modal-cover');
    playlistModalTitle = document.getElementById('playlist-modal-title');
    playlistModalMeta = document.getElementById('playlist-modal-meta');
    playlistTracksList = document.getElementById('playlist-tracks');
    playlistPlayBtn = document.getElementById('playlist-play-btn');
    closePlaylistBtn = document.querySelector('#playlist-modal .close');

    player = document.getElementById('player');
    audio = document.getElementById('audio');
    playerCover = document.getElementById('player-cover');
    playerTitle = document.getElementById('player-title');
    playerArtist = document.getElementById('player-artist');
    playerFavBtn = document.getElementById('player-favorite-btn');
    playPauseBtn = document.getElementById('play-pause-btn');
    playIcon = document.getElementById('play-icon');
    pauseIcon = document.getElementById('pause-icon');
    prevBtn = document.getElementById('prev-btn');
    nextBtn = document.getElementById('next-btn');
    shuffleBtn = document.getElementById('shuffle-btn');
    repeatBtn = document.getElementById('repeat-btn');
    repeatAllIcon = document.getElementById('repeat-all-icon');
    repeatOneIcon = document.getElementById('repeat-one-icon');
    progressBar = document.getElementById('progress-bar');
    progressFill = document.getElementById('progress-fill');
    currentTimeEl = document.getElementById('current-time');
    durationEl = document.getElementById('duration');
    volumeBtn = document.getElementById('volume-btn');
    volumeBar = document.getElementById('volume-bar');
    volumeFill = document.getElementById('volume-fill');
    volumeOnIcon = document.getElementById('volume-on-icon');
    volumeOffIcon = document.getElementById('volume-off-icon');

    lyricsBtn = document.getElementById('lyrics-btn');
    lyricsPanel = document.getElementById('lyrics-panel');
    lyricsCover = document.getElementById('lyrics-cover');
    lyricsText = document.getElementById('lyrics-text');
    lyricsBackground = document.querySelector('.lyrics-background');
    lyricsCloseBtn = document.getElementById('lyrics-close-btn');
    lyricsContext = document.getElementById('lyrics-context');
    lyricsNowTitle = document.getElementById('lyrics-now-title');
    lyricsNowArtist = document.getElementById('lyrics-now-artist');
    lyricsExpandBtn = document.getElementById('lyrics-expand-btn');
    lyricsFullOverlay = document.getElementById('lyrics-full-overlay');
    lyricsFullClose = document.getElementById('lyrics-full-close');
    lyricsFullContent = document.getElementById('lyrics-full-content');
    queueNext = document.getElementById('queue-next');
    queueFull = document.getElementById('queue-full');
    queueToggle = document.getElementById('queue-toggle');

    imageModal = document.getElementById('image-modal');
    imageModalImg = document.getElementById('image-modal-img');
    closeImageModal = imageModal ? imageModal.querySelector('.close') : null;

    searchInput = document.getElementById('search-input');
    searchResults = document.getElementById('search-results');
    searchClear = document.getElementById('search-clear');

    audioVisualizer = document.getElementById('audio-visualizer');
    visualizerCanvas = document.getElementById('visualizer-canvas');
}