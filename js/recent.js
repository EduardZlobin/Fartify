// ============================================================
// js/recent.js — недавно прослушано, новинки, исполнитель года, карусель
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

// ---------- Новинки ----------
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
            e.preventDefault();
            e.stopPropagation();
            handleCardPlayClick(album);
        });
        newReleasesBlock.appendChild(card);
    });

    callFitAfterRender();
    updatePlaybackUI();
}

// ---------- Исполнитель года ----------
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
                title: 'Исполнитель года',
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

// ---------- Карусель ----------
function goToSlide(index) {
    const allSlides = Array.from(document.querySelectorAll('.carousel-slide'));
    const visibleSlides = allSlides.filter(s => s.style.display !== 'none');
    if (!carouselTrack || visibleSlides.length === 0) return;

    // ★ Если mainContent скрыт (страница артиста, share-view и т.д.) —
    //   запоминаем индекс, но НЕ трогаем transform. Вернёмся при показе.
    if (carouselTrack.offsetWidth === 0) {
        currentSlide = index;
        return;
    }

    // ★ Добавим и сохранение индекса — пригодится для showMainContent()
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