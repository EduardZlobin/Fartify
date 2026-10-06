// ============================================================
// js/lyrics.js — текст, караоке, панель «Сейчас играет», «О релизе»
// ============================================================

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
        lyricsNowArtist.innerHTML = formatTrackArtistsHtml(
            track.file,
            track.artist || currentAlbum?.artist || 'Неизвестный исполнитель'
        );
        lyricsNowArtist.title = 'Открыть профиль';
    }

    // Синхронизация сердечка в сайдбаре с избранным
    const lyricsFavBtn = document.getElementById('lyrics-fav-btn');
    if (lyricsFavBtn && track.file) {
        const isFav = isFavorite({
            file: track.file,
            title: track.title,
            artist: track.artist
        });
        lyricsFavBtn.classList.toggle('active', isFav);
        const path = lyricsFavBtn.querySelector('path');
        if (path) path.setAttribute('fill', isFav ? 'currentColor' : 'none');
    }
}

// ────────────────────────────────────────────────────────────
// Проверка: строка — «музыкальная» (только ноты и пробелы)
// ────────────────────────────────────────────────────────────
function isMusicalLine(text) {
    if (!text) return false;
    const cleaned = String(text).replace(/[\s\u00A0]/g, '');
    if (!cleaned) return false;
    return /^[♪♫♬♩♭♯🎵🎶]+$/u.test(cleaned);
}

// ────────────────────────────────────────────────────────────
// Извлечение двух доминирующих цветов из обложки
// ────────────────────────────────────────────────────────────
function extractCoverColors(coverFile) {
    return new Promise((resolve) => {
        if (!coverFile) return resolve(null);

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const S = 40;
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
                    if (brightness < 30 || brightness > 235) continue;
                    const max = Math.max(r, g, b), min = Math.min(r, g, b);
                    const sat = (max - min) / (max || 1);
                    if (sat < 0.12) continue;
                    const qr = Math.round(r / 32) * 32;
                    const qg = Math.round(g / 32) * 32;
                    const qb = Math.round(b / 32) * 32;
                    const key = qr + ',' + qg + ',' + qb;
                    buckets[key] = (buckets[key] || 0) + 1;
                }

                const sorted = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
                if (!sorted.length) return resolve(null);

                const top = sorted[0][0].split(',').map(Number);
                const second = sorted[1] ? sorted[1][0].split(',').map(Number) : top;
                resolve([top, second]);
            } catch (e) {
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
        img.src = `photo/${coverFile}`;
    });
}

function applyCoverColorsToTextBlock(colors) {
    // ★ Пишем переменные на всю панель — тогда их подхватывают
    // очередь, текст, о релизе, контекст, полноэкранный оверлей, караоке
    const panel = document.getElementById('lyrics-panel');
    if (!panel) return;

    if (!colors) {
        panel.style.removeProperty('--lyrics-c1');
        panel.style.removeProperty('--lyrics-c2');
        return;
    }

    const [c1, c2] = colors;
    panel.style.setProperty('--lyrics-c1', `${c1[0]}, ${c1[1]}, ${c1[2]}`);
    panel.style.setProperty('--lyrics-c2', `${c2[0]}, ${c2[1]}, ${c2[2]}`);
}

// ────────────────────────────────────────────────────────────
// ★ Клик по строке караоке — переход к её таймингу
// ────────────────────────────────────────────────────────────
function seekToLyricLine(lineEl) {
    if (!lineEl) return;

    const t = parseFloat(lineEl.dataset.time);
    if (isNaN(t) || t < 0) return;
    if (!audio || !audio.src) return;

    try {
        const dur = audio.duration;
        const safe = (Number.isFinite(dur) && dur > 0)
            ? Math.min(t, Math.max(0, dur - 0.05))
            : t;

        audio.currentTime = safe;

        // Прогресс-бар и время
        if (Number.isFinite(dur) && dur > 0) {
            const percent = (safe / dur) * 100;
            progressBar.value = percent;
            progressFill.style.width = percent + '%';
        }
        if (typeof currentTimeEl !== 'undefined' && currentTimeEl) {
            currentTimeEl.textContent = formatTime(safe);
        }

        // Пересчитываем активную строку мгновенно, без ожидания timeupdate
        activeLyricIndex = -1;
        updateKaraokeLines();

        // Сохраняем новую позицию
        savePlayerState();

        // ★ Мягкая вспышка, чтобы было видно, куда перескочили
        lineEl.classList.add('just-seeked');
        setTimeout(() => lineEl.classList.remove('just-seeked'), 400);
    } catch (e) {
        console.warn('[lyrics] seek failed:', e);
    }
}

// ────────────────────────────────────────────────────────────
// Основной рендер текста трека
// ────────────────────────────────────────────────────────────
function updateLyricsPanel(track) {
    const coverFile = resolveTrackCover(track, currentAlbum);
    lyricsCover.src = `photo/${coverFile}`;
    lyricsBackground.style.backgroundImage = `url(photo/${coverFile})`;

    // ★ Фон блока «Текст» — в цвет обложки
    extractCoverColors(coverFile).then(applyCoverColorsToTextBlock);

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

            // ★ Строка-нота → особая разметка
            if (isMusicalLine(line.text)) {
                div.classList.add('is-musical');
                div.innerHTML = `
                    <span class="music-note" style="--i:0">♪</span>
                    <span class="music-note" style="--i:1">♫</span>
                    <span class="music-note" style="--i:2">♪</span>
                    <span class="music-note" style="--i:3">♬</span>
                    <span class="music-note" style="--i:4">♫</span>
                `;
            } else {
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
            }

            // ★ Клик по строке — переход к её таймингу
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                seekToLyricLine(div);
            });

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

    updateReleaseInfoBlock(track);
}

// ★ Флаги управления автопрокруткой
let __lyricsAutoScrolling = false;       // идёт автопрокрутка — игнорируем события scroll
let __lyricsScrollPauseUntil = 0;        // до какого момента не автопрокручивать

// ────────────────────────────────────────────────────────────
// ★ Компенсация задержки Web Audio графа.
// audio.currentTime опережает то, что реально слышно из колонок
// на величину outputLatency. Караоке должно ориентироваться
// на звук, а не на позицию декодера.
// ────────────────────────────────────────────────────────────
function getKaraokeTime() {
    let lat = 0;

    const EQ = window.__fartifyEq;
    if (EQ && EQ.ctx && EQ.healthy) {
        const ctxLat = EQ.ctx.outputLatency;
        if (typeof ctxLat === 'number' && isFinite(ctxLat) && ctxLat > 0) {
            lat = ctxLat;
        }
    }

    // ★ Ручная поправка через консоль (если авто не справляется):
    //   localStorage.setItem('fartify_karaoke_offset', '1.7')
    //   localStorage.removeItem('fartify_karaoke_offset')
    // Знак: положительное → сдвинуть караоке позже (если оно убегает вперёд),
    //       отрицательное → сдвинуть раньше (если караоке отстаёт).
    const manual = parseFloat(localStorage.getItem('fartify_karaoke_offset') || '0');
    if (isFinite(manual)) lat += manual;

    return Math.max(0, audio.currentTime - lat);
}

function updateKaraokeLines() {
    if (!currentLyricLines.length) return;

    const t = getKaraokeTime();   // ← единственное изменение

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
        if (Date.now() < __lyricsScrollPauseUntil) return;

        const el = currentLyricLines[newActiveIndex];
        const container = el.closest('[data-lyrics-scroll]') || el.closest('.lyrics-content');
        if (!container) return;

        const targetTop = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;

        __lyricsAutoScrolling = true;
        container.scrollTo({ top: targetTop, behavior: 'smooth' });

        clearTimeout(window.__lyricsAutoScrollTimer);
        window.__lyricsAutoScrollTimer = setTimeout(() => {
            __lyricsAutoScrolling = false;
        }, 800);
    }
}

// ---------- Блок «О релизе» ----------
function updateReleaseInfoBlock(track) {
    const block = document.getElementById('release-info-block');
    if (!block) return;

    if (!track || !track.file || !releaseInfo[track.file]) {
        block.classList.add('hidden');
        return;
    }

    const info = releaseInfo[track.file] || {};

    // Поддерживаем оба варианта: text и description
    const rawText = info.text || info.description || '';
    const hasText  = !!(rawText && String(rawText).trim());
    const hasImage = !!(info.image && String(info.image).trim());

    if (!hasImage && !hasText) {
        block.classList.add('hidden');
        return;
    }

    const imgEl  = document.getElementById('release-info-image');
    const textEl = document.getElementById('release-info-text');

    if (imgEl) {
        if (hasImage) {
            imgEl.style.display = '';
            imgEl.onerror = () => {
                imgEl.style.display = 'none';
                // Если и текста нет — скрываем весь блок
                if (!hasText) block.classList.add('hidden');
            };
            imgEl.src = `photo/${info.image}`;
        } else {
            imgEl.style.display = 'none';
            imgEl.removeAttribute('src');
        }
    }

    if (textEl) {
        textEl.textContent = rawText || '';
    }

    block.classList.remove('hidden');
}

// ---------- Полноэкранный текст ----------
function openLyricsFullscreen() {
    if (!lyricsFullOverlay || !lyricsFullContent || !lyricsText) return;
    if (!lyricsPreviewParent) lyricsPreviewParent = lyricsText.parentElement;
    if (!lyricsFullContent.contains(lyricsText)) lyricsFullContent.appendChild(lyricsText);
    lyricsFullOverlay.classList.remove('hidden');
    lyricsPanel.classList.add('lyrics-fullscreen-open');
    isLyricsFullscreen = true;
    if (lyricsExpandBtn) lyricsExpandBtn.textContent = 'Свернуть';

    // Обновим цвета на лету
    if (currentTrackMeta) {
        const coverFile = resolveTrackCover(currentTrackMeta, currentAlbum);
        extractCoverColors(coverFile).then(applyCoverColorsToTextBlock);
    }

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

// ---------- Resize сайдбара ----------
function setupLyricsResize() {
    const resizer = document.getElementById('lyrics-resizer');
    if (!resizer) return;

    const BASE_WIDTH = 350;
    const MIN_WIDTH = Math.round(BASE_WIDTH * 0.8);
    const MAX_WIDTH = Math.round(BASE_WIDTH * 1.5);
    const LS_KEY = 'fartify_lyrics_width';

    let saved = parseInt(localStorage.getItem(LS_KEY), 10);
    if (isNaN(saved)) saved = BASE_WIDTH;
    saved = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, saved));

    function applyWidth(w) {
        document.documentElement.style.setProperty('--lyrics-width', w + 'px');
    }
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
}

// ---------- Обработчики ----------
function setupLyricsEvents() {
    lyricsBtn.addEventListener('click', () => {
        const willOpen = !lyricsPanel.classList.contains('open');
        lyricsPanel.classList.toggle('open', willOpen);
        document.body.classList.toggle('lyrics-open', willOpen);

        if (willOpen) {
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
        lyricsNowArtist.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // 1. Клик по конкретному имени в панели
            const link = e.target.closest('.artist-inline-link');
            if (link) {
                const name = link.dataset.artist;
                if (!name) return;

                if (isLyricsFullscreen) closeLyricsFullscreen();

                // Закрываем панель, чтобы не мешала профилю
                lyricsPanel.classList.remove('open');
                document.body.classList.remove('lyrics-open');

                stopGlobalShuffle();
                showArtistPage(name);
                return;
            }

            // 2. Клик по пустому месту — открываем основного артиста
            const artist = (currentTrackMeta && currentTrackMeta.artist)
                || (currentAlbum && currentAlbum.artist);
            if (!artist) return;

            if (isLyricsFullscreen) closeLyricsFullscreen();
            lyricsPanel.classList.remove('open');
            document.body.classList.remove('lyrics-open');

            stopGlobalShuffle();
            showArtistPage(artist);
        });
    }

    lyricsCover.addEventListener('click', () => {
        if (!lyricsCover.src) return;
        imageModalImg.src = lyricsCover.src;
        imageModal.classList.remove('hidden');
    });

    const releaseInfoImage = document.getElementById('release-info-image');
    if (releaseInfoImage) {
        releaseInfoImage.addEventListener('click', () => {
            if (!releaseInfoImage.src) return;
            if (releaseInfoImage.style.display === 'none') return;
            imageModalImg.src = releaseInfoImage.src;
            imageModal.classList.remove('hidden');
        });
    }

    // Кнопка «В избранное» в сайдбаре
    const lyricsFavBtn = document.getElementById('lyrics-fav-btn');
    if (lyricsFavBtn) {
        lyricsFavBtn.addEventListener('click', () => {
            if (!currentTrackMeta) return;
            const trackWithMeta = {
                file: currentTrackMeta.file,
                title: currentTrackMeta.title,
                artist: currentTrackMeta.artist,
                cover: resolveTrackCover(currentTrackMeta, currentAlbum),
                albumTitle: currentTrackMeta.albumTitle,
                duration: currentTrackMeta.duration,
                plays: currentTrackMeta.plays
            };
            toggleFavorite(trackWithMeta);
        });
    }

    // Кнопка «Поделиться» в сайдбаре
    const lyricsShareBtn = document.getElementById('lyrics-share-btn');
    if (lyricsShareBtn) {
        lyricsShareBtn.addEventListener('click', () => {
            if (!currentTrackMeta) return;
            if (window.fartifyShare && typeof window.fartifyShare.track === 'function') {
                window.fartifyShare.track(currentTrackMeta, currentAlbum);
            }
        });
    }

        // ★ Пауза автопрокрутки при ручном скролле превью
    const previewEl = document.getElementById('lyrics-text-preview');
    if (previewEl) {
        previewEl.addEventListener('scroll', () => {
            // Игнорируем события, если это наша же автопрокрутка
            if (__lyricsAutoScrolling) return;
            // 8 секунд тишины — пользователь читает
            __lyricsScrollPauseUntil = Date.now() + 8000;
        }, { passive: true });
    }

    // То же для полноэкранного режима
    if (lyricsFullContent) {
        lyricsFullContent.addEventListener('scroll', () => {
            if (__lyricsAutoScrolling) return;
            __lyricsScrollPauseUntil = Date.now() + 8000;
        }, { passive: true });
    }
}