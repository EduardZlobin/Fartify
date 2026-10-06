// ============================================================
// js/recent.js — недавно прослушано, новинки, артист месяца
// ============================================================

// ---------- Недавно прослушано ----------
function addToRecent(album) {
    if (!album || !album.title || !album.artist) return;
    if (album.title.startsWith('Все треки ')) return;
    if (album.title === 'Избранное' || album.title === 'Fartify топ-50') return;
    if (!allAlbums.some(a => a.title === album.title && a.artist === album.artist)) return;

    try {
        let recent = JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
        recent = recent.filter(r => !(r.title === album.title && r.artist === album.artist));
        recent.push({
            title: album.title,
            artist: album.artist,
            cover: album.cover,
            date: album.date || '',
            timestamp: Date.now()
        });
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
            e.preventDefault();
            e.stopPropagation();
            const album = allAlbums.find(a => a.title === item.title && a.artist === item.artist);
            if (album) handleCardPlayClick(album);
        });
        recentGrid.appendChild(card);
    });

    callFitAfterRender();
    updatePlaybackUI();
}

// ---------- Свежий релиз (hero-new-release) ----------
// ---------- Свежие релизы (hero-new-release) — карусель ----------
let __heroNewCarouselTimer = null;
let __heroNewCarouselIndex = 0;
let __heroNewCarouselCount = 0;

function renderNewReleases() {
    const block = document.getElementById('hero-new-release');
    if (!block) return;

    stopHeroNewCarouselAuto();

    const recentReleases = allAlbums.filter(album => isFreshRelease(album.date));
    recentReleases.sort((a, b) => new Date(b.date) - new Date(a.date));

    // ── Заглушка, если новинок нет ──
    if (recentReleases.length === 0) {
        block.classList.add('is-empty');
        block.innerHTML = `
            <div class="hero-new-empty">
                <div class="hero-new-empty-icon">
                    <svg width="38" height="38" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="1.6"
                         stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 18V5l12-2v13"/>
                        <circle cx="6" cy="18" r="3"/>
                        <circle cx="18" cy="16" r="3"/>
                    </svg>
                </div>
                <div class="hero-new-empty-title">Пока новинок нет</div>
                <div class="hero-new-empty-text">Свежие релизы появятся здесь первыми</div>
            </div>
        `;
        updatePlaybackUI();
        callFitAfterRender();
        return;
    }

    block.classList.remove('is-empty');

    const slidesHTML = recentReleases.map(buildHeroNewSlideHTML).join('');
    const dotsHTML = recentReleases.length > 1
        ? `<div class="hero-new-dots">${
            recentReleases.map((_, i) => `
                <button class="hero-new-dot ${i === 0 ? 'is-active' : ''}"
                        data-index="${i}" type="button"
                        aria-label="Релиз ${i + 1}"></button>
          `).join('')
          }</div>`
        : '';

    block.innerHTML = `
        <div class="hero-new-badge">Свежие релизы</div>

        <div class="hero-new-carousel">
            <div class="hero-new-carousel-track" id="hero-new-carousel-track">
                ${slidesHTML}
            </div>
        </div>

        ${dotsHTML}
    `;

    // Привязка событий к каждому слайду
    block.querySelectorAll('.hero-new-slide').forEach((slideEl, idx) => {
        bindHeroNewSlideEvents(slideEl, recentReleases[idx]);
    });

    // Клик по точкам
    block.querySelectorAll('.hero-new-dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
            e.stopPropagation();
            const i = parseInt(dot.dataset.index, 10);
            if (!isNaN(i)) {
                goToHeroNewSlide(i);
                startHeroNewCarouselAuto();
            }
        });
    });

    // Состояние карусели
    __heroNewCarouselCount = recentReleases.length;
    __heroNewCarouselIndex = 0;

    // Автопрокрутка + пауза при hover/focus
    if (recentReleases.length > 1) {
        startHeroNewCarouselAuto();

        block.onmouseenter = () => stopHeroNewCarouselAuto();
        block.onmouseleave = () => startHeroNewCarouselAuto();
        block.onfocusin   = () => stopHeroNewCarouselAuto();
        block.onfocusout  = (e) => {
            if (!block.contains(e.relatedTarget)) startHeroNewCarouselAuto();
        };
    }

    updatePlaybackUI();
    callFitAfterRender();
}

// ── Вёрстка одного слайда ──
function buildHeroNewSlideHTML(album) {
    const total = album.tracks.length;
    const type = getAlbumType(total);
    const previewTracks = album.tracks.slice(0, 5);
    const hasMore = total > 5;

    return `
        <div class="hero-new-slide"
             data-album-title="${escapeHtml(album.title)}"
             data-album-artist="${escapeHtml(album.artist)}">
            <div class="hero-new-grid">
                <div class="hero-new-cover-col">
                    <div class="hero-new-cover-wrap">
                        <img src="photo/${escapeHtml(album.cover)}" alt="${escapeHtml(album.title)}"
                             onerror="this.src='photo/placeholder.jpg'">
                        <button class="hero-new-play" title="Слушать" aria-label="Слушать"
                                data-album-title="${escapeHtml(album.title)}"
                                data-album-artist="${escapeHtml(album.artist)}">
                            ${getPlaySvg(26)}
                        </button>
                    </div>
                    ${album.label ? `<div class="hero-new-copyright">${escapeHtml(album.label)}</div>` : ''}
                </div>

                <div class="hero-new-info">
                    <div class="hero-new-kicker">${type}${album.date ? ' · ' + formatReleaseDate(album.date) : ''}</div>
                    <h2 class="hero-new-title" title="${escapeHtml(album.title)}">${escapeHtml(album.title)}</h2>
                    <div class="hero-new-artist">${escapeHtml(album.artist)}</div>

                    <div class="hero-new-actions">
                        <button class="hero-new-listen" type="button">Слушать</button>
                        <button class="hero-new-open" type="button">Открыть релиз</button>
                    </div>

                    <ul class="hero-new-tracks">
                        ${previewTracks.map((t, i) => `
                            <li class="hero-new-track" data-file="${escapeHtml(t.file)}">
                                <span class="hero-new-track-num">${i + 1}</span>
                                <span class="hero-new-track-title">${escapeHtml(t.title)}</span>
                                <span class="hero-new-track-duration">${escapeHtml(t.duration || '')}</span>
                            </li>
                        `).join('')}
                        ${hasMore ? `<li class="hero-new-track-more">и ещё ${total - 5} ${total - 5 === 1 ? 'трек' : 'трека'}</li>` : ''}
                    </ul>
                </div>
            </div>
        </div>
    `;
}

// ── События слайда ──
function bindHeroNewSlideEvents(slideEl, album) {
    if (!slideEl || !album) return;
    const type = getAlbumType(album.tracks.length);

    const play = () => {
        const isThis = currentAlbum
            && !currentAlbum.isPlaylist
            && currentAlbum.title === album.title
            && currentAlbum.artist === album.artist
            && !isGlobalShuffle;
        if (isThis) {
            if (audio.paused) audio.play();
            else audio.pause();
        } else {
            playAlbumFromModal(album, 0);
            addToRecent(album);
        }
    };

    const playBtn = slideEl.querySelector('.hero-new-play');
    if (playBtn) playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        play();
    });

    const listenBtn = slideEl.querySelector('.hero-new-listen');
    if (listenBtn) listenBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        play();
    });

    const openBtn = slideEl.querySelector('.hero-new-open');
    if (openBtn) openBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        stopGlobalShuffle();
        openModal(album, type);
    });

    slideEl.querySelectorAll('.hero-new-track').forEach((row, i) => {
        row.addEventListener('click', (e) => {
            e.stopPropagation();
            clearManualContext();
            stopGlobalShuffle();
            currentAlbum = album;
            playTrackByIndex(i);
            addToRecent(album);
        });
    });
}

// ── Управление каруселью ──
function goToHeroNewSlide(index) {
    const track = document.getElementById('hero-new-carousel-track');
    if (!track || __heroNewCarouselCount === 0) return;

    index = ((index % __heroNewCarouselCount) + __heroNewCarouselCount) % __heroNewCarouselCount;
    __heroNewCarouselIndex = index;

    track.style.transform = `translate3d(-${index * 100}%, 0, 0)`;

    document.querySelectorAll('.hero-new-dot').forEach((dot, i) => {
        dot.classList.toggle('is-active', i === index);
    });
}

function startHeroNewCarouselAuto() {
    stopHeroNewCarouselAuto();
    if (__heroNewCarouselCount <= 1) return;
    __heroNewCarouselTimer = setInterval(() => {
        goToHeroNewSlide(__heroNewCarouselIndex + 1);
    }, 25000);
}

function stopHeroNewCarouselAuto() {
    if (__heroNewCarouselTimer) {
        clearInterval(__heroNewCarouselTimer);
        __heroNewCarouselTimer = null;
    }
}

// ---------- Артист месяца (hero-artist-of-month) ----------
function renderArtistOfYear(data) {
    const block = document.getElementById('artist-of-year');
    if (!block) return;

    if (!data) {
        block.style.display = 'none';
        return;
    }
    block.style.display = '';

    const trackInfo = data.track || {};
    let album = null, track = null;
    if (trackInfo.file) {
        album = allAlbums.find(a => a.tracks.some(t => t.file === trackInfo.file));
        if (album) track = album.tracks.find(t => t.file === trackInfo.file);
    }

    const trackTitle  = trackInfo.title  || (track && track.title)  || 'Трек месяца';
    const trackArtist = trackInfo.artist || (album && album.artist) || data.name;
    const photo       = data.photo       || 'placeholder.jpg';

    // Обложка трека (для фона карточки)
    // Приоритет: trackInfo.cover → resolveTrackCover (track-covers.json) → обложка альбома → фото артиста
    const trackCover = trackInfo.cover
        || (track && (typeof resolveTrackCover === 'function'
            ? resolveTrackCover(track, album)
            : track.cover))
        || (album && album.cover)
        || photo;

    block.innerHTML = `
        <div class="hero-artist-label">Артист месяца</div>

        <div class="hero-artist-top">
            <img class="hero-artist-photo" src="photo/${photo}" alt="${data.name}" onerror="this.src='photo/placeholder.jpg'">
            <div class="hero-artist-name" title="${data.name}">${data.name}</div>
        </div>

        ${data.description
            ? `<div class="hero-artist-description">${data.description}</div>`
            : ''}

        <div class="hero-artist-track" id="hero-artist-track" role="button" tabindex="0" data-file="${trackInfo.file || ''}">
            <img class="hero-artist-bg" src="photo/${trackCover}" alt="" onerror="this.style.display='none'">
            <div class="hero-artist-track-play">
                <svg class="hero-artist-track-play-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5,3 21,12 5,21"/>
                </svg>
                <svg class="hero-artist-track-pause-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="display:none">
                    <rect x="5" y="4" width="4" height="16" rx="1"/>
                    <rect x="14" y="4" width="4" height="16" rx="1"/>
                </svg>
            </div>
            <div class="hero-artist-track-text">
                <div class="hero-artist-track-title" title="${trackTitle}">${trackTitle}</div>
                <div class="hero-artist-track-artist">${trackArtist}</div>
            </div>
        </div>
    `;

    const trackEl = document.getElementById('hero-artist-track');
    if (trackEl) {
        trackEl.addEventListener('click', () => {
            const isThis = currentAlbum
                && !currentAlbum.isPlaylist
                && currentAlbum.tracks
                && currentAlbum.tracks[currentTrackIndex]
                && currentAlbum.tracks[currentTrackIndex].file === trackInfo.file
                && !isGlobalShuffle;

            if (isThis) {
                if (audio.paused) audio.play();
                else audio.pause();
                return;
            }

            clearManualContext();
            if (album && track) {
                stopGlobalShuffle();
                currentAlbum = album;
                const idx = album.tracks.findIndex(t => t.file === track.file);
                if (idx !== -1) playTrackByIndex(idx);
            } else if (trackInfo.file) {
                stopGlobalShuffle();
                currentAlbum = {
                    artist: trackArtist,
                    cover: trackCover,
                    title: 'Артист месяца',
                    tracks: [{
                        file: trackInfo.file,
                        title: trackTitle,
                        artist: trackArtist,
                        cover: trackCover,
                        duration: trackInfo.duration || '0:00',
                        plays: trackInfo.plays || ''
                    }]
                };
                currentTrackIndex = 0;
                loadAndPlay(currentAlbum.tracks[0]);
            }
        });
    }

    updateHeroPlayState();
}

// ---------- Обновление play/pause в hero-блоках ----------
function updateHeroPlayState() {
    const isPlaying = !audio.paused && !!audio.src;

        // ── Кнопки в «Свежих релизах» (у каждого слайда своя) ──
    document.querySelectorAll('.hero-new-play').forEach(btn => {
        const albumTitle  = btn.dataset.albumTitle;
        const albumArtist = btn.dataset.albumArtist;
        if (!albumTitle) return;

        const isThisAlbum = currentAlbum
            && !currentAlbum.isPlaylist
            && currentAlbum.title === albumTitle
            && currentAlbum.artist === albumArtist
            && !isGlobalShuffle;

        if (isThisAlbum && isPlaying) {
            btn.innerHTML = getPauseSvg(26);
            btn.classList.add('is-playing-state');
            btn.setAttribute('title', 'Пауза');
        } else {
            btn.innerHTML = getPlaySvg(26);
            btn.classList.remove('is-playing-state');
            btn.setAttribute('title', 'Слушать');
        }
    });

    // ── Кнопка в «Артисте месяца» ──
    const artistTrackEl = document.getElementById('hero-artist-track');
    if (artistTrackEl) {
        const file = artistTrackEl.dataset.file;
        const isThisTrack = file
            && currentAlbum
            && !currentAlbum.isPlaylist
            && currentAlbum.tracks
            && currentAlbum.tracks[currentTrackIndex]
            && currentAlbum.tracks[currentTrackIndex].file === file
            && !isGlobalShuffle;

        const playIcon  = artistTrackEl.querySelector('.hero-artist-track-play-icon');
        const pauseIcon = artistTrackEl.querySelector('.hero-artist-track-pause-icon');
        if (playIcon && pauseIcon) {
            if (isThisTrack && isPlaying) {
                playIcon.style.display  = 'none';
                pauseIcon.style.display = 'block';
            } else {
                playIcon.style.display  = 'block';
                pauseIcon.style.display = 'none';
            }
        }
    }
}

// ---------- Карусель (легаси, карусели больше нет в DOM) ----------
function goToSlide(index) {
    const allSlides = Array.from(document.querySelectorAll('.carousel-slide'));
    const visibleSlides = allSlides.filter(s => s.style.display !== 'none');
    if (!carouselTrack || visibleSlides.length === 0) return;

    if (carouselTrack.offsetWidth === 0) {
        currentSlide = index;
        return;
    }

    currentSlide = index;

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
    if (!carouselTrack) return; // карусели нет — не запускаем интервал
    clearInterval(carouselTimer);
    carouselTimer = setInterval(() => { goToSlide(currentSlide + 1); }, 25000);
}

function stopCarouselAuto() {
    if (typeof carouselTimer !== 'undefined' && carouselTimer) {
        clearInterval(carouselTimer);
        carouselTimer = null;
    }
}

// ---------- Обработчики ----------
function setupRecentEvents() {
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
        carouselTrack.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        }, { passive: true });
        carouselTrack.addEventListener('touchend', (e) => {
            const diff = touchStartX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) {
                if (diff > 0) goToSlide(currentSlide + 1);
                else goToSlide(currentSlide - 1);
                startCarouselAuto();
            }
        });
    }
}