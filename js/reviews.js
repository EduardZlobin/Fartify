// ============================================================
// js/reviews.js — страница рецензий с оценками
// ============================================================

// ────────────────────────────────────────────────────────────
// Хранилище оценок.
// Сейчас — localStorage. Потом легко заменить на API:
// достаточно переписать load() и save().
// ────────────────────────────────────────────────────────────
window.FartifyReviews = (function () {
    const STORAGE_KEY = 'fartify_reviews_v1';
    let cache = null;

    function load() {
        if (cache) return cache;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            cache = raw ? JSON.parse(raw) : {};
        } catch (e) {
            cache = {};
        }
        return cache;
    }

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cache || {}));
        } catch (e) {}
        // TODO: когда появится API —
        //   fetch('/api/reviews', { method: 'POST', body: JSON.stringify(cache) })
    }

    function get(key) {
        const data = load();
        return data[key] || null;
    }

    function set(key, rating) {
        const data = load();
        data[key] = {
            rating: Math.max(1, Math.min(10, Math.round(rating))),
            date: new Date().toISOString()
        };
        save();
        return data[key];
    }

    function remove(key) {
        const data = load();
        delete data[key];
        save();
    }

    function getAll() {
        return { ...load() };
    }

    function count() {
        return Object.keys(load()).length;
    }

    function countByPrefix(prefix) {
        const data = load();
        return Object.keys(data).filter(k => k.startsWith(prefix)).length;
    }

    // Ключи
    function albumKey(album) {
        return `album:${album.artist}||${album.title}`;
    }

    function trackKey(track, album) {
        return `track:${track.artist || album.artist}||${track.title}||${track.file}`;
    }

    return { get, set, remove, getAll, count, countByPrefix, albumKey, trackKey };
})();

// ────────────────────────────────────────────────────────────
// Состояние страницы
// ────────────────────────────────────────────────────────────
let __rvActiveTab = 'albums';        // 'albums' | 'tracks'
let __rvInitialized = false;

// ────────────────────────────────────────────────────────────
// Инициализация страницы
// ────────────────────────────────────────────────────────────
function initReviewsPage() {
    const page = document.getElementById('reviews-page');
    if (!page) return;

    const tabs = page.querySelectorAll('.reviews-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const next = tab.dataset.tab;
            if (!next || next === __rvActiveTab) return;
            __rvActiveTab = next;
            tabs.forEach(t => t.classList.toggle('is-active', t === tab));
            renderReviewsPage();
        });
    });

    __rvInitialized = true;
}

// ────────────────────────────────────────────────────────────
// Показ/скрытие страницы
// ────────────────────────────────────────────────────────────
function showReviewsPage() {
    if (!__rvInitialized) initReviewsPage();

    // Скрываем все возможные оверлеи и страницы
    modal.classList.add('hidden');
    openedModalAlbum = null;
    playlistModal.classList.add('hidden');
    openedPlaylistTitle = null;
    artistPage.classList.add('hidden');

    // ★ shareView — локальная переменная share.js, работаем через DOM
    const shareViewEl = document.getElementById('share-view');
    if (shareViewEl) shareViewEl.classList.add('hidden');
    document.body.classList.remove('share-view-open');
    document.body.style.paddingBottom = '';

    if (typeof stopCarouselAuto === 'function') stopCarouselAuto();
    mainContent.classList.add('hidden');

    const page = document.getElementById('reviews-page');
    if (page) page.classList.remove('hidden');

    renderReviewsPage();
    window.scrollTo(0, 0);
    updatePlaybackUI();
    updateSidebarActive();
}

function hideReviewsPage() {
    const page = document.getElementById('reviews-page');
    if (page) page.classList.add('hidden');
}

// ────────────────────────────────────────────────────────────
// Рендер
// ────────────────────────────────────────────────────────────
function renderReviewsPage() {
    const grid  = document.getElementById('reviews-grid');
    const empty = document.getElementById('reviews-empty');
    const stats = document.getElementById('reviews-stats');
    if (!grid) return;

    grid.innerHTML = '';

    if (__rvActiveTab === 'albums') {
        renderAlbumsReviews(grid);
    } else {
        renderTracksReviews(grid);
    }

    // Счётчик оценок
    if (stats) {
        const c = window.FartifyReviews.count();
        stats.innerHTML = c
            ? `Оценено: <b>${c}</b>`
            : 'Пока ничего не оценено';
    }

    if (!grid.children.length && empty) {
        empty.classList.remove('hidden');
    } else if (empty) {
        empty.classList.add('hidden');
    }
}

function renderAlbumsReviews(grid) {
    allAlbums.forEach(album => {
        const key = window.FartifyReviews.albumKey(album);
        const card = buildReviewCard({
            key,
            type: 'album',
            cover: album.cover,
            title: album.title,
            artist: album.artist,
            meta: getAlbumType(album.tracks.length) + (album.date ? ' • ' + album.date : ''),
            releaseType: getAlbumType(album.tracks.length)
        });
        grid.appendChild(card);
    });
}

function renderTracksReviews(grid) {
    // Все треки из всех альбомов, каждый — отдельная карточка
    const seen = new Set();
    allAlbums.forEach(album => {
        album.tracks.forEach(track => {
            // Ключ уникальности — file. Один трек в разных альбомах — одна карточка.
            if (seen.has(track.file)) return;
            seen.add(track.file);

            const key = window.FartifyReviews.trackKey(track, album);
            const cover = resolveTrackCover(track, album);
            const card = buildReviewCard({
                key,
                type: 'track',
                cover,
                title: track.title,
                artist: track.artist || album.artist,
                meta: album.title + (track.duration ? ' • ' + track.duration : ''),
                releaseType: 'TRACK'
            });
            grid.appendChild(card);
        });
    });
}

// ────────────────────────────────────────────────────────────
// Карточка
// ────────────────────────────────────────────────────────────
function buildReviewCard(config) {
    const { key, cover, title, artist, meta, releaseType } = config;
    const current = window.FartifyReviews.get(key);
    const currentRating = current ? current.rating : 0; // 1–10, 0 = нет оценки
    // Показываем 5 звёзд: каждая = 2 балла. 10 → 5 звёзд.
    const starsFilled = Math.round(currentRating / 2);

    const card = document.createElement('div');
    card.className = 'rv-card' + (currentRating > 0 ? ' is-rated' : '');
    card.dataset.key = key;

    card.innerHTML = `
        <div class="rv-cover-wrap">
            <img class="rv-cover" src="photo/${escapeHtml(cover || 'placeholder.jpg')}"
                 alt="" loading="lazy"
                 onerror="this.src='photo/placeholder.jpg'">
            <span class="rv-type-badge">${escapeHtml(releaseType || '')}</span>
        </div>
        <div class="rv-body">
            <div class="rv-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
            <div class="rv-artist" title="${escapeHtml(artist)}">${escapeHtml(artist)}</div>
            ${meta ? `<div class="rv-meta">${escapeHtml(meta)}</div>` : ''}
            <div class="rv-stars" role="radiogroup" aria-label="Оценка">
                ${[1,2,3,4,5].map(i => `
                    <button class="rv-star ${i <= starsFilled ? 'is-filled' : ''}"
                            data-star="${i}" type="button"
                            aria-label="${i * 2} из 10">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2.5 15 9l7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>
                        </svg>
                    </button>
                `).join('')}
                <span class="rv-score">${currentRating > 0 ? currentRating + '/10' : '—'}</span>
                <button class="rv-clear" type="button" title="Сбросить оценку" aria-label="Сбросить оценку">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        </div>
    `;

    const starsEls = card.querySelectorAll('.rv-star');
    const clearEl  = card.querySelector('.rv-clear');

    // Hover — предпросмотр
    starsEls.forEach((star, idx) => {
        star.addEventListener('mouseenter', () => {
            starsEls.forEach((s, i) => s.classList.toggle('is-hover', i <= idx));
        });
        star.addEventListener('mouseleave', () => {
            starsEls.forEach(s => s.classList.remove('is-hover'));
        });
        star.addEventListener('click', (e) => {
            e.stopPropagation();
            const starNum = parseInt(star.dataset.star, 10); // 1–5
            const score10 = starNum * 2;                     // → 2–10
            window.FartifyReviews.set(key, score10);
            applyCardRating(card, score10);
        });
    });

    if (clearEl) {
        clearEl.addEventListener('click', (e) => {
            e.stopPropagation();
            window.FartifyReviews.remove(key);
            applyCardRating(card, 0);
        });
    }

    return card;
}

function applyCardRating(card, score10) {
    const starsFilled = Math.round(score10 / 2);
    const starsEls = card.querySelectorAll('.rv-star');
    const scoreEl  = card.querySelector('.rv-score');

    starsEls.forEach((s, i) => {
        s.classList.toggle('is-filled', i < starsFilled);
        s.classList.remove('is-hover');
    });

    if (scoreEl) {
        scoreEl.textContent = score10 > 0 ? score10 + '/10' : '—';
    }
    card.classList.toggle('is-rated', score10 > 0);

    // Обновляем счётчик вверху
    const stats = document.getElementById('reviews-stats');
    if (stats) {
        const c = window.FartifyReviews.count();
        stats.innerHTML = c
            ? `Оценено: <b>${c}</b>`
            : 'Пока ничего не оценено';
    }
}