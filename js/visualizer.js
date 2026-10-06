// ============================================================
// js/visualizer.js
// Fartify — Fullscreen Audio Visualizer
// ============================================================

let visualizer = null;

function initVisualizer() {

    const root = document.getElementById('audio-visualizer');
    const canvas = document.getElementById('visualizer-canvas');

    if (!root || !canvas || !audio) {
        console.warn('[Visualizer] DOM not found');
        return;
    }

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) {
        console.warn('[Visualizer] Canvas unavailable');
        return;
    }

    const cover = document.getElementById('visualizer-cover');
    const title = document.getElementById('visualizer-title');
    const artist = document.getElementById('visualizer-artist');
    const album = document.getElementById('visualizer-album');

    const playBtn = document.getElementById('visualizer-play');
    const playIcon = document.getElementById('visualizer-play-icon');
    const pauseIcon = document.getElementById('visualizer-pause-icon');

    const prevBtn = document.getElementById('visualizer-prev');
    const nextBtn = document.getElementById('visualizer-next');

    const closeBtn = document.getElementById('visualizer-close');
    const fullscreenBtn = document.getElementById('visualizer-fullscreen');
    const openBtn = document.getElementById('visualizer-open-btn');

    const progressBar = document.getElementById('visualizer-progress-bar');
    const progressFill = document.getElementById('visualizer-progress-fill');
    const progressThumb = document.getElementById('visualizer-progress-thumb');

    const currentTime = document.getElementById('visualizer-current-time');
    const duration = document.getElementById('visualizer-duration');

    // Лирика
    const vizLyrics = document.getElementById('viz-lyrics');
    const vizLyricPrev = document.getElementById('viz-lyric-prev');
    const vizLyricCurrent = document.getElementById('viz-lyric-current');
    const vizLyricNext = document.getElementById('viz-lyric-next');
    let lastVizLyricIndex = -1;

    let width = 0;
    let height = 0;
    let dpr = 1;

    let analyser = null;
    let frequencyData = null;
    let waveformData = null;

    let animationFrame = 0;
    let particles = [];
    let hue = 265;
    let targetHue = 265;

    let coverColor = { r: 139, g: 92, b: 246 };

    let isOpen = false;

    // ────────────────────────────────────────────────────────
    // AUDIO GRAPH — используем существующий EQ-граф
    // ────────────────────────────────────────────────────────
    async function getAnalyser() {
        const EQ = window.__fartifyEq;
        if (EQ && EQ.analyser) {
            analyser = EQ.analyser;
        } else if (typeof getEqAnalyser === 'function') {
            try {
                analyser = await getEqAnalyser();
            } catch (e) {
                console.warn('[Visualizer] getEqAnalyser error:', e);
            }
        }

        if (!analyser) return false;

        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.82;

        frequencyData = new Uint8Array(analyser.frequencyBinCount);
        waveformData = new Uint8Array(analyser.fftSize);
        return true;
    }

    // ────────────────────────────────────────────────────────
    // RESIZE
    // ────────────────────────────────────────────────────────
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;

        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        createParticles();
    }

    // ────────────────────────────────────────────────────────
    // PARTICLES
    // ────────────────────────────────────────────────────────
    function createParticles() {
        const amount = Math.min(130, Math.max(45, Math.floor((width * height) / 18000)));
        particles = [];
        for (let i = 0; i < amount; i++) {
            particles.push({
                angle: Math.random() * Math.PI * 2,
                radius: Math.min(width, height) * (0.19 + Math.random() * 0.46),
                speed: (0.00008 + Math.random() * 0.00022) * (Math.random() > 0.5 ? 1 : -1),
                size: 0.5 + Math.random() * 2.1,
                alpha: 0.08 + Math.random() * 0.38,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    // ────────────────────────────────────────────────────────
    // Извлечение ДОМИНАНТНЫХ цветов обложки (не среднее!)
    // ────────────────────────────────────────────────────────
    function extractCoverColors(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                try {
                    const S = 48;
                    const temp = document.createElement('canvas');
                    temp.width = S;
                    temp.height = S;
                    const tctx = temp.getContext('2d');
                    tctx.drawImage(img, 0, 0, S, S);

                    const data = tctx.getImageData(0, 0, S, S).data;
                    const buckets = {};

                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
                        if (a < 128) continue;

                        const brightness = (r + g + b) / 3;
                        // Отсекаем почти-чёрное и почти-белое — они не дают hue
                        if (brightness < 40 || brightness > 220) continue;

                        const max = Math.max(r, g, b), min = Math.min(r, g, b);
                        const sat = (max - min) / (max || 1);
                        // Отсекаем серые пиксели
                        if (sat < 0.18) continue;

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
            img.src = src;
        });
    }

    // Фирменные цвета Fartify — на случай монохромной обложки
    const DEFAULT_C1 = [139, 92, 246];
    const DEFAULT_C2 = [236, 72, 153];

    function rgbToHue(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        if (max === min) return 265;
        const d = max - min;
        let h;
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60;
        if (h < 0) h += 360;
        return h;
    }

    async function setAccentFromCover(src) {
        const colors = await extractCoverColors(src);

        let c1, c2;

        if (colors && colors.length >= 2) {
            c1 = colors[0];
            c2 = colors[1];
        } else {
            // Монохромная обложка — используем фирменные цвета
            c1 = DEFAULT_C1;
            c2 = DEFAULT_C2;
        }

        coverColor = { r: c1[0], g: c1[1], b: c1[2] };
        targetHue = rgbToHue(c1[0], c1[1], c1[2]);

        const rootEl = document.documentElement;
        rootEl.style.setProperty('--viz-c1', `${c1[0]}, ${c1[1]}, ${c1[2]}`);
        rootEl.style.setProperty('--viz-c2', `${c2[0]}, ${c2[1]}, ${c2[2]}`);
    }

    // ────────────────────────────────────────────────────────
    // DRAW
    // ────────────────────────────────────────────────────────
    function draw() {
        animationFrame = requestAnimationFrame(draw);
        if (!isOpen) return;

        if (analyser && frequencyData && waveformData) {
            analyser.getByteFrequencyData(frequencyData);
            analyser.getByteTimeDomainData(waveformData);
        }

        ctx.clearRect(0, 0, width, height);

        hue += (targetHue - hue) * 0.015;

        const cx = width / 2;
        const cy = height * 0.32;

        let bass = 0, mids = 0, highs = 0;
        if (frequencyData) {
            const bassEnd = Math.floor(frequencyData.length * 0.08);
            const midStart = bassEnd;
            const midEnd = Math.floor(frequencyData.length * 0.38);
            const highStart = Math.floor(frequencyData.length * 0.65);

            for (let i = 0; i < bassEnd; i++) bass += frequencyData[i];
            for (let i = midStart; i < midEnd; i++) mids += frequencyData[i];
            for (let i = highStart; i < frequencyData.length; i++) highs += frequencyData[i];

            bass /= Math.max(bassEnd, 1);
            mids /= Math.max(midEnd - midStart, 1);
            highs /= Math.max(frequencyData.length - highStart, 1);
        }

        const energy = bass * 0.58 + mids * 0.30 + highs * 0.12;

        drawParticles(cx, cy, energy);
        drawRadialSpectrum(cx, cy, energy);
        drawWave(cx, cy, energy);
        drawCenterGlow(cx, cy, bass);

        updateVizLyrics();
    }

    function drawCenterGlow(cx, cy, bass) {
        const radius = Math.min(width, height) * (0.20 + bass / 255 * 0.045);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        g.addColorStop(0, `rgba(${coverColor.r}, ${coverColor.g}, ${coverColor.b}, .12)`);
        g.addColorStop(0.42, `rgba(${coverColor.r}, ${coverColor.g}, ${coverColor.b}, .035)`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawRadialSpectrum(cx, cy, energy) {
        if (!frequencyData) return;
        const count = 150;
        const innerRadius = Math.min(width, height) * 0.205;
        const maxLength = Math.min(width, height) * 0.105;

        ctx.save();
        ctx.lineCap = 'round';

        for (let i = 0; i < count; i++) {
            const index = Math.floor(i / count * frequencyData.length * 0.78);
            const value = frequencyData[index] / 255;
            const angle = i / count * Math.PI * 2 - Math.PI / 2;
            const dynamic = Math.pow(value, 1.45);
            const length = 3 + dynamic * maxLength;

            const x1 = cx + Math.cos(angle) * innerRadius;
            const y1 = cy + Math.sin(angle) * innerRadius;
            const x2 = cx + Math.cos(angle) * (innerRadius + length);
            const y2 = cy + Math.sin(angle) * (innerRadius + length);

            const alpha = 0.10 + dynamic * 0.76;
            const hueShift = (i / count) * 80;

            ctx.strokeStyle = `hsla(${hue + hueShift}, 88%, ${66 + dynamic * 20}%, ${alpha})`;
            ctx.lineWidth = value > 0.65 ? 2.4 : 1.25;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawWave(cx, cy, energy) {
        if (!waveformData) return;
        const radius = Math.min(width, height) * 0.29;

        ctx.save();
        ctx.beginPath();

        const samples = 180;
        for (let i = 0; i <= samples; i++) {
            const t = i / samples;
            const index = Math.floor(t * waveformData.length);
            const value = (waveformData[index] - 128) / 128;
            const angle = t * Math.PI * 2 - Math.PI / 2;
            const distortion = value * 15 * (0.5 + energy / 255);
            const r = radius + distortion;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();

        ctx.strokeStyle = `rgba(${coverColor.r}, ${coverColor.g}, ${coverColor.b}, .26)`;
        ctx.lineWidth = 1.1;
        ctx.shadowBlur = 15;
        ctx.shadowColor = `rgba(${coverColor.r}, ${coverColor.g}, ${coverColor.b}, .38)`;
        ctx.stroke();
        ctx.restore();
    }

    function drawParticles(cx, cy, energy) {
        const t = performance.now();
        ctx.save();
        for (const p of particles) {
            p.angle += p.speed;
            const pulse = Math.sin(t * 0.001 + p.phase) * 0.5 + 0.5;
            const audioBoost = energy / 255;
            const radius = p.radius + pulse * 9 * audioBoost;
            const x = cx + Math.cos(p.angle) * radius;
            const y = cy + Math.sin(p.angle) * radius;
            const alpha = p.alpha * (0.65 + audioBoost * 0.8);

            ctx.fillStyle = `hsla(${hue + p.phase * 20}, 82%, 72%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, p.size * (0.7 + audioBoost), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // ────────────────────────────────────────────────────────
    // LYRICS
    // ────────────────────────────────────────────────────────
    function extractLineText(lineEl) {
        if (!lineEl) return '';
        if (lineEl.classList.contains('is-musical')) {
            return '♪ ♫ ♪ ♬ ♫';
        }
        const spans = lineEl.querySelectorAll('span');
        for (const s of spans) {
            if (s.classList.contains('music-note')) continue;
            const t = (s.textContent || '').trim();
            if (t) return t;
        }
        return (lineEl.textContent || '').trim();
    }

    function updateVizLyrics() {
        if (!vizLyrics || !vizLyricCurrent) return;

        const hasLyrics = (typeof currentLyricLines !== 'undefined')
            && Array.isArray(currentLyricLines)
            && currentLyricLines.length > 0;

        if (!hasLyrics) {
            vizLyrics.classList.add('hidden');
            lastVizLyricIndex = -1;
            return;
        }

        vizLyrics.classList.remove('hidden');

        const idx = (typeof activeLyricIndex !== 'undefined') ? activeLyricIndex : -1;
        const safeIdx = idx >= 0 ? idx : 0;

        if (safeIdx === lastVizLyricIndex) return;
        lastVizLyricIndex = safeIdx;

        const curLine = currentLyricLines[safeIdx];
        const prevLine = currentLyricLines[safeIdx - 1];
        const nextLine = currentLyricLines[safeIdx + 1];

        const curText = extractLineText(curLine);
        const prevText = extractLineText(prevLine);
        const nextText = extractLineText(nextLine);

        if (vizLyricPrev) {
            vizLyricPrev.classList.remove('is-entering');
            void vizLyricPrev.offsetWidth;
            vizLyricPrev.textContent = prevText;
            if (prevText) vizLyricPrev.classList.add('is-entering');
        }
        if (vizLyricNext) {
            vizLyricNext.classList.remove('is-entering');
            void vizLyricNext.offsetWidth;
            vizLyricNext.textContent = nextText;
            if (nextText) vizLyricNext.classList.add('is-entering');
        }
        if (vizLyricCurrent) {
            vizLyricCurrent.classList.remove('is-entering', 'is-playing');
            vizLyricCurrent.classList.toggle('is-musical',
                curLine && curLine.classList.contains('is-musical'));
            void vizLyricCurrent.offsetWidth;
            vizLyricCurrent.textContent = curText;

            // ★ Длительность перелива = время до следующей строки
            let dur = 4;
            if (curLine && curLine.dataset && curLine.dataset.time) {
                const t1 = parseFloat(curLine.dataset.time);
                if (nextLine && nextLine.dataset && nextLine.dataset.time) {
                    const t2 = parseFloat(nextLine.dataset.time);
                    if (!isNaN(t1) && !isNaN(t2) && t2 > t1) dur = t2 - t1;
                }
            }
            dur = Math.max(1.5, Math.min(dur, 12)); // разумные границы
            vizLyricCurrent.style.setProperty('--karaoke-dur', dur.toFixed(2) + 's');

            vizLyricCurrent.classList.add('is-entering');
            vizLyricCurrent.classList.add('is-playing'); // ★ запускает перелив
        }
    }

    function resetVizLyrics() {
        lastVizLyricIndex = -1;
        if (vizLyricPrev) vizLyricPrev.textContent = '';
        if (vizLyricCurrent) vizLyricCurrent.textContent = '';
        if (vizLyricNext) vizLyricNext.textContent = '';
        if (vizLyrics) vizLyrics.classList.add('hidden');
    }

    // ────────────────────────────────────────────────────────
    // UI
    // ────────────────────────────────────────────────────────
    async function updateTrackUI() {
        if (!currentTrackMeta) return;

        title.textContent = currentTrackMeta.title || 'Без названия';

        const artistName = currentTrackMeta.artist || currentAlbum?.artist || 'Неизвестный исполнитель';
        if (typeof formatTrackArtistsHtml === 'function') {
            artist.innerHTML = formatTrackArtistsHtml(currentTrackMeta.file, artistName);
        } else {
            artist.textContent = artistName;
        }

        album.textContent = currentTrackMeta.albumTitle || currentAlbum?.title || '';

        const coverFile = (typeof resolveTrackCover === 'function')
            ? resolveTrackCover(currentTrackMeta, currentAlbum)
            : (currentTrackMeta.cover || 'placeholder.jpg');

        const coverSrc = `photo/${coverFile}`;
        cover.src = coverSrc;
        cover.onerror = () => { cover.src = 'photo/placeholder.jpg'; };

        await setAccentFromCover(coverSrc);
        updateTimeUI();
    }

    function updateTimeUI() {
        if (!audio) return;
        const current = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
        const total = Number.isFinite(audio.duration) ? audio.duration : 0;

        currentTime.textContent = formatTime(current);
        duration.textContent = formatTime(total);

        const percent = total > 0
            ? Math.max(0, Math.min(100, current / total * 100))
            : 0;

        progressFill.style.width = percent + '%';
        progressThumb.style.left = percent + '%';
    }

    function updatePlayUI() {
        const playing = audio && !audio.paused;
        root.classList.toggle('is-paused', !playing);
        playIcon.style.display = playing ? 'none' : 'block';
        pauseIcon.style.display = playing ? 'block' : 'none';
    }

    // ────────────────────────────────────────────────────────
    // OPEN / CLOSE
    // ────────────────────────────────────────────────────────
    async function open() {
        if (!audio.src) return;

        await getAnalyser();

        await updateTrackUI();
        updatePlayUI();
        resetVizLyrics();

        root.classList.add('is-open');
        root.setAttribute('aria-hidden', 'false');
        isOpen = true;
        document.body.classList.add('visualizer-open');

        resize();

        if (!animationFrame) {
            draw();
        }
    }

    function close() {
        root.classList.remove('is-open');
        root.setAttribute('aria-hidden', 'true');
        isOpen = false;
        document.body.classList.remove('visualizer-open');

        resetVizLyrics();

        if (document.fullscreenElement === root) {
            document.exitFullscreen?.().catch(() => {});
        }
    }

    // ────────────────────────────────────────────────────────
    // EVENTS
    // ────────────────────────────────────────────────────────
    if (openBtn) openBtn.addEventListener('click', open);
    closeBtn.addEventListener('click', close);

    playBtn.addEventListener('click', () => {
        if (typeof togglePlay === 'function') togglePlay();
    });
    prevBtn.addEventListener('click', () => {
        if (typeof prevTrack === 'function') prevTrack();
    });
    nextBtn.addEventListener('click', () => {
        if (typeof nextTrack === 'function') nextTrack();
    });

    fullscreenBtn.addEventListener('click', async () => {
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else {
                await root.requestFullscreen();
            }
        } catch (e) {
            console.warn('[Visualizer] Fullscreen failed:', e);
        }
    });

    progressBar.addEventListener('click', (e) => {
        if (!audio.duration) return;
        const rect = progressBar.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        audio.currentTime = ratio * audio.duration;
        updateTimeUI();
    });

    artist.addEventListener('click', (e) => {
        if (e.target.closest('.artist-inline-link')) return;

        const name = currentTrackMeta?.artist || currentAlbum?.artist;
        if (!name) return;

        close();
        if (typeof stopGlobalShuffle === 'function') stopGlobalShuffle();
        if (typeof showArtistPage === 'function') showArtistPage(name);
    });

    audio.addEventListener('timeupdate', updateTimeUI);
    audio.addEventListener('loadedmetadata', () => {
        updateTimeUI();
        if (isOpen) updateTrackUI();
    });
    audio.addEventListener('play', updatePlayUI);
    audio.addEventListener('pause', updatePlayUI);

    window.addEventListener('resize', resize);

    document.addEventListener('keydown', (e) => {
        if (!isOpen) return;

        if (e.key === 'Escape') {
            if (document.fullscreenElement) {
                document.exitFullscreen?.();
            } else {
                close();
            }
            return;
        }

        if (e.code === 'Space'
            && e.target.tagName !== 'INPUT'
            && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            if (typeof togglePlay === 'function') togglePlay();
        }

        if (e.code === 'ArrowRight') {
            if (typeof nextTrack === 'function') nextTrack();
        }
        if (e.code === 'ArrowLeft') {
            if (typeof prevTrack === 'function') prevTrack();
        }
    });

    // ────────────────────────────────────────────────────────
    // PUBLIC API
    // ────────────────────────────────────────────────────────
    visualizer = { open, close, updateTrackUI, updatePlayUI, resize };
    window.fartifyVisualizer = visualizer;

    resize();
}