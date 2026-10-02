// ============================================================
// js/share.js — генерация карточек, шаринг, R2, публичный API
// ============================================================

// ────────────────────────────────────────────────────────────
// Загрузка PNG-карточки в R2 через /upload (используется в шаринге)
// ────────────────────────────────────────────────────────────
async function uploadCardToR2(dataUrl) {
    try {
        const blob = await (await fetch(dataUrl)).blob();
        const fd = new FormData();
        fd.append('file', blob, 'card.png');

        const base = BASE_PATH === '/' ? '' : BASE_PATH.replace(/\/$/, '');
        const res = await fetch(`${window.location.origin}${base}/upload`, {
            method: 'POST',
            body: fd
        });
        if (!res.ok) throw new Error('upload failed: ' + res.status);

        const data = await res.json();
        return data.url || null;
    } catch (e) {
        console.warn('[R2] upload error:', e);
        return null;
    }
}

function initShareFeature() {

    // ────────────────────────────────────────────────────────
    // Хелперы для canvas
    // ────────────────────────────────────────────────────────
    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    function roundRect(ctx, x, y, w, h, r) {
        const radius = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + w, y, x + w, y + h, radius);
        ctx.arcTo(x + w, y + h, x, y + h, radius);
        ctx.arcTo(x, y + h, x, y, radius);
        ctx.arcTo(x, y, x + w, y, radius);
        ctx.closePath();
    }

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

    function wrapText(ctx, text, maxWidth, maxLines) {
        const words = String(text).split(' ');
        const lines = [];
        let current = '';
        let i = 0;
        while (i < words.length) {
            const word = words[i];
            const test = current ? current + ' ' + word : word;
            if (ctx.measureText(test).width <= maxWidth) {
                current = test;
                i++;
            } else {
                if (current) {
                    lines.push(current);
                    current = '';
                    if (lines.length >= maxLines) break;
                } else {
                    lines.push(word);
                    i++;
                    if (lines.length >= maxLines) break;
                }
            }
        }
        if (current && lines.length < maxLines) lines.push(current);
        if (i < words.length && lines.length) {
            let last = lines[lines.length - 1];
            while (last.length > 0 && ctx.measureText(last + '…').width > maxWidth) {
                last = last.slice(0, -1);
            }
            lines[lines.length - 1] = last + '…';
        }
        return lines;
    }

    function extractColors(img) {
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
                if (brightness < 34 || brightness > 232) continue;
                const max = Math.max(r, g, b), min = Math.min(r, g, b);
                const sat = (max - min) / (max || 1);
                if (sat < 0.14) continue;
                const qr = Math.round(r / 32) * 32;
                const qg = Math.round(g / 32) * 32;
                const qb = Math.round(b / 32) * 32;
                const key = qr + ',' + qg + ',' + qb;
                buckets[key] = (buckets[key] || 0) + 1;
            }
            const sorted = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
            if (!sorted.length) return null;
            const top = sorted[0][0].split(',').map(Number);
            const second = sorted[1] ? sorted[1][0].split(',').map(Number) : top;
            return [top, second];
        } catch (e) {
            return null;
        }
    }

    function getBestTrackCover(file) {
        if (!file) return 'placeholder.jpg';
        if (trackCovers[file]) return trackCovers[file];

        const releases = [];
        allAlbums.forEach(album => {
            if (album.tracks.some(t => t.file === file)) releases.push(album);
        });
        if (releases.length === 0) return 'placeholder.jpg';

        releases.sort((a, b) => {
            const aLen = a.tracks.length;
            const bLen = b.tracks.length;
            if (aLen !== bLen) return aLen - bLen;
            const aDate = a.date || '';
            const bDate = b.date || '';
            return bDate.localeCompare(aDate);
        });
        return releases[0].cover || 'placeholder.jpg';
    }

    function applyShareViewTheme(colors) {
        if (!colors) return;
        const a = colors[0], b = colors[1];
        const root = document.documentElement;
        root.style.setProperty('--share-c1-rgb', `${a[0]}, ${a[1]}, ${a[2]}`);
        root.style.setProperty('--share-c2-rgb', `${b[0]}, ${b[1]}, ${b[2]}`);
    }

    function resetShareViewTheme() {
        const root = document.documentElement;
        root.style.removeProperty('--share-c1-rgb');
        root.style.removeProperty('--share-c2-rgb');
    }

    // ────────────────────────────────────────────────────────
    // Генерация карточки на canvas
    // ────────────────────────────────────────────────────────
    async function generateShareCard(config) {
        const W = 1080, H = 1350;
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');

        let coverImg = null;
        if (config.cover) {
            try { coverImg = await loadImage(`photo/${config.cover}`); } catch (e) {}
        }

        let colorA = [139, 92, 246];
        let colorB = [236, 72, 153];
        if (coverImg) {
            const colors = extractColors(coverImg);
            if (colors) { colorA = colors[0]; colorB = colors[1]; }
        }

        ctx.fillStyle = '#06060a';
        ctx.fillRect(0, 0, W, H);

        if (coverImg) {
            ctx.save();
            ctx.globalAlpha = 0.22;
            ctx.filter = 'blur(80px)';
            drawCoverFill(ctx, coverImg, -100, -100, W + 200, H + 200);
            ctx.restore();
            ctx.filter = 'none';
        }

        const glow1 = ctx.createRadialGradient(W * 0.15, H * 0.15, 0, W * 0.15, H * 0.15, W * 0.9);
        glow1.addColorStop(0, `rgba(${colorA[0]},${colorA[1]},${colorA[2]},0.45)`);
        glow1.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow1;
        ctx.fillRect(0, 0, W, H);

        const glow2 = ctx.createRadialGradient(W * 0.9, H * 0.9, 0, W * 0.9, H * 0.9, W * 0.8);
        glow2.addColorStop(0, `rgba(${colorB[0]},${colorB[1]},${colorB[2]},0.38)`);
        glow2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow2;
        ctx.fillRect(0, 0, W, H);

        const vign = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.9);
        vign.addColorStop(0, 'rgba(0,0,0,0)');
        vign.addColorStop(1, 'rgba(0,0,0,0.55)');
        ctx.fillStyle = vign;
        ctx.fillRect(0, 0, W, H);

        ctx.textAlign = 'left';
        ctx.font = '800 42px Inter, -apple-system, system-ui, sans-serif';
        const brandGrad = ctx.createLinearGradient(80, 80, 420, 80);
        brandGrad.addColorStop(0, '#ffffff');
        brandGrad.addColorStop(1, `rgba(${colorB[0]},${colorB[1]},${colorB[2]},1)`);
        ctx.fillStyle = brandGrad;
        ctx.fillText('FARTIFY', 80, 122);

        ctx.textAlign = 'right';
        ctx.font = '600 22px Inter, -apple-system, system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.45)';

        let labelText = 'NOW PLAYING';
        if (config.type === 'playlist') {
            labelText = 'PLAYLIST';
        } else if (config.type === 'release') {
            const rt = String(config.releaseType || 'Альбом').toLowerCase();
            if (rt === 'сингл') labelText = 'SINGLE';
            else if (rt === 'макси-сингл') labelText = 'MAXI-SINGLE';
            else if (rt === 'ep') labelText = 'EP';
            else labelText = 'ALBUM';
        }
        ctx.fillText(labelText, W - 80, 120);

        const coverSize = 680;
        const coverX = (W - coverSize) / 2;
        const coverY = 180;

        const coverGlow = ctx.createRadialGradient(
            W / 2, coverY + coverSize / 2, 0,
            W / 2, coverY + coverSize / 2, coverSize * 0.85
        );
        coverGlow.addColorStop(0, `rgba(${colorA[0]},${colorA[1]},${colorA[2]},0.38)`);
        coverGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = coverGlow;
        ctx.fillRect(coverX - 120, coverY - 120, coverSize + 240, coverSize + 240);

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.65)';
        ctx.shadowBlur = 60;
        ctx.shadowOffsetY = 24;
        ctx.fillStyle = '#000';
        roundRect(ctx, coverX, coverY, coverSize, coverSize, 44);
        ctx.fill();
        ctx.restore();

        if (coverImg) {
            ctx.save();
            roundRect(ctx, coverX, coverY, coverSize, coverSize, 44);
            ctx.clip();
            ctx.drawImage(coverImg, coverX, coverY, coverSize, coverSize);
            ctx.restore();
        } else {
            ctx.save();
            roundRect(ctx, coverX, coverY, coverSize, coverSize, 44);
            ctx.clip();
            const fb = ctx.createLinearGradient(coverX, coverY, coverX + coverSize, coverY + coverSize);
            fb.addColorStop(0, `rgb(${colorA[0]},${colorA[1]},${colorA[2]})`);
            fb.addColorStop(1, `rgb(${colorB[0]},${colorB[1]},${colorB[2]})`);
            ctx.fillStyle = fb;
            ctx.fillRect(coverX, coverY, coverSize, coverSize);
            ctx.restore();
        }

        ctx.save();
        roundRect(ctx, coverX, coverY, coverSize, coverSize, 44);
        const borderGrad = ctx.createLinearGradient(coverX, coverY, coverX + coverSize, coverY + coverSize);
        borderGrad.addColorStop(0, `rgba(${colorA[0]},${colorA[1]},${colorA[2]},1)`);
        borderGrad.addColorStop(1, `rgba(${colorB[0]},${colorB[1]},${colorB[2]},1)`);
        ctx.strokeStyle = borderGrad;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();

        ctx.textAlign = 'left';
        ctx.font = '800 64px Inter, -apple-system, system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        const titleMax = W - 160;
        const titleLines = wrapText(ctx, config.title || 'Без названия', titleMax, 2);
        const titleStartY = 960;
        titleLines.forEach((line, i) => {
            ctx.fillText(line, 80, titleStartY + i * 76);
        });

        const artistY = titleStartY + titleLines.length * 76 + 26;
        ctx.font = '500 36px Inter, -apple-system, system-ui, sans-serif';
        ctx.fillStyle = `rgba(${colorA[0]},${colorA[1]},${colorA[2]},1)`;
        ctx.fillText(config.artist || '', 80, artistY);

        const metaY = H - 130;
        const metaParts = [];
        if (config.metaPlays) metaParts.push(config.metaPlays);
        if (config.metaDuration) metaParts.push(config.metaDuration);
        if (config.metaDate) metaParts.push(config.metaDate);
        if (config.metaTracks) metaParts.push(config.metaTracks);
        if (config.metaLabel) metaParts.push(config.metaLabel);
        if (metaParts.length) {
            ctx.font = '500 24px Inter, -apple-system, system-ui, sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.55)';
            ctx.textAlign = 'left';
            ctx.fillText(metaParts.join('   •   '), 80, metaY);
        }

        const chipText = '▶  Слушать на Fartify';
        ctx.font = '700 26px Inter, -apple-system, system-ui, sans-serif';
        const chipTextWidth = ctx.measureText(chipText).width;
        const chipW = chipTextWidth + 60;
        const chipH = 62;
        const chipX = W - 80 - chipW;
        const chipY = H - 260;

        const chipGrad = ctx.createLinearGradient(chipX, chipY, chipX + chipW, chipY + chipH);
        chipGrad.addColorStop(0, `rgb(${colorA[0]},${colorA[1]},${colorA[2]})`);
        chipGrad.addColorStop(1, `rgb(${colorB[0]},${colorB[1]},${colorB[2]})`);
        ctx.fillStyle = chipGrad;
        roundRect(ctx, chipX, chipY, chipW, chipH, 31);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(chipText, chipX + chipW / 2, chipY + chipH / 2 + 2);
        ctx.textBaseline = 'alphabetic';

        return {
            dataUrl: canvas.toDataURL('image/png'),
            colors: [colorA, colorB]
        };
    }

    // ────────────────────────────────────────────────────────
    // Формирование share-ссылок
    // ────────────────────────────────────────────────────────
    function buildShareUrl(type, data) {
        const origin = window.location.origin;
        const base = BASE_PATH === '/' ? '' : BASE_PATH.replace(/\/$/, '');
        const rootUrl = `${origin}${base}/`;

        if (type === 'track') {
            if (data && data.title) {
                const slug = slugifyTrackTitle(data.title);
                return `${rootUrl}?share=track&title=${encodeURIComponent(slug)}`;
            }
            if (data && data.file) {
                return `${rootUrl}?share=track&file=${encodeURIComponent(data.file)}`;
            }
            return `${rootUrl}?share=track`;
        }

        const url = new URL(rootUrl);
        url.searchParams.set('share', type);
        if (type === 'playlist') {
            url.searchParams.set('title', data.title);
            if (data.cover) url.searchParams.set('cover', data.cover);
        } else if (type === 'release') {
            url.searchParams.set('title', data.title);
        }
        return url.toString();
    }

    // ────────────────────────────────────────────────────────
    // Мелкие утилиты
    // ────────────────────────────────────────────────────────
    function dataURLtoBlob(dataurl) {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8 = new Uint8Array(n);
        while (n--) u8[n] = bstr.charCodeAt(n);
        return new Blob([u8], { type: mime });
    }

    async function copyToClipboard(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (e) {}
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            return true;
        } catch (e) { return false; }
    }

    function toast(msg) {
        let el = document.getElementById('share-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'share-toast';
            el.style.cssText = `
                position: fixed; left: 50%; bottom: 130px; transform: translateX(-50%) translateY(20px);
                padding: 11px 20px; border-radius: 12px; z-index: 3000;
                background: rgba(20,18,28,0.96); border: 1px solid rgba(255,255,255,0.10);
                box-shadow: 0 16px 40px rgba(0,0,0,0.55);
                color: #fff; font: 700 13px Inter, sans-serif;
                letter-spacing: 0.2px; opacity: 0; transition: opacity .25s ease, transform .25s ease;
                pointer-events: none; backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
            `;
            document.body.appendChild(el);
        }
        el.textContent = msg;
        requestAnimationFrame(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateX(-50%) translateY(0)';
        });
        clearTimeout(el.__t);
        el.__t = setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateX(-50%) translateY(20px)';
        }, 1900);
    }

    // ────────────────────────────────────────────────────────
    // DOM-элементы share-модалки и share-view
    // ────────────────────────────────────────────────────────
    const shareModal = document.getElementById('share-modal');
    const sharePreviewImg = document.getElementById('share-preview-img');
    const sharePreviewLoader = document.getElementById('share-preview-loader');
    const shareLinkInput = document.getElementById('share-link-input');
    const shareModalTitle = document.getElementById('share-modal-title');
    const shareModalSubtitle = document.getElementById('share-modal-subtitle');
    const shareDownloadBtn = document.getElementById('share-download-btn');
    const shareNativeBtn = document.getElementById('share-native-btn');
    const shareCopyBtn = document.getElementById('share-copy-btn');
    const shareModalClose = document.getElementById('share-modal-close');

    const shareView = document.getElementById('share-view');
    const shareViewCard = document.getElementById('share-view-card');
    const shareViewListen = document.getElementById('share-view-listen');
    const shareViewDownload = document.getElementById('share-view-download');

    let currentShareState = null;
    let shareViewDataUrl = null;
    let shareViewFileName = '';

    function openShareModal() {
        if (!shareModal) return;
        shareModal.classList.remove('hidden');
    }
    function closeShareModal() {
        if (!shareModal) return;
        shareModal.classList.add('hidden');
    }

    if (shareModalClose) shareModalClose.addEventListener('click', closeShareModal);
    if (shareModal) shareModal.addEventListener('click', (e) => {
        if (e.target === shareModal) closeShareModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Escape' && shareModal && !shareModal.classList.contains('hidden')) closeShareModal();
    });

    if (shareDownloadBtn) shareDownloadBtn.addEventListener('click', () => {
        if (!currentShareState) return;
        const a = document.createElement('a');
        a.href = currentShareState.dataUrl;
        a.download = currentShareState.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast('Карточка скачана');
    });

    if (shareCopyBtn) shareCopyBtn.addEventListener('click', async () => {
        if (!currentShareState) return;
        const ok = await copyToClipboard(currentShareState.shareUrl);
        toast(ok ? 'Ссылка скопирована' : 'Не удалось скопировать');
    });

    if (shareNativeBtn) shareNativeBtn.addEventListener('click', async () => {
        if (!currentShareState) return;
        const { dataUrl, shareUrl, fileName } = currentShareState;
        try {
            const blob = dataURLtoBlob(dataUrl);
            const file = new File([blob], fileName, { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: shareModalTitle ? shareModalTitle.textContent : 'Fartify',
                    text: 'Слушай на Fartify',
                    url: shareUrl
                });
            } else if (navigator.share) {
                await navigator.share({
                    title: shareModalTitle ? shareModalTitle.textContent : 'Fartify',
                    text: 'Слушай на Fartify',
                    url: shareUrl
                });
            } else {
                const ok = await copyToClipboard(shareUrl);
                toast(ok ? 'Ссылка скопирована' : 'Share не поддерживается');
            }
        } catch (e) {
            if (e && e.name === 'AbortError') return;
            toast('Не удалось поделиться');
        }
    });

    // ────────────────────────────────────────────────────────
    // Открытие модалки «Поделиться» для разных типов
    // ────────────────────────────────────────────────────────
    function openShareForTrack(track, album) {
        if (!track || !track.file) return;

        const finalAlbum = album || currentAlbum || null;
        const coverFile = getBestTrackCover(track.file);
        const artistName = track.artist || (finalAlbum && finalAlbum.artist) || '';

        if (shareModalTitle) shareModalTitle.textContent = 'Поделиться треком';
        if (shareModalSubtitle) shareModalSubtitle.textContent = track.title || '';

        const shareUrl = buildShareUrl('track', {
            file: track.file,
            title: track.title
        });
        if (shareLinkInput) shareLinkInput.value = shareUrl;

        if (sharePreviewImg) {
            sharePreviewImg.classList.add('hidden');
            sharePreviewImg.removeAttribute('src');
        }
        if (sharePreviewLoader) sharePreviewLoader.classList.remove('hidden');

        currentShareState = null;
        openShareModal();

        generateShareCard({
            type: 'track',
            title: track.title || 'Без названия',
            artist: artistName,
            cover: coverFile,
            metaPlays: track.plays || '',
            metaDuration: track.duration || '',
            metaDate: finalAlbum ? (finalAlbum.date || '') : ''
        }).then(async result => {
            const dataUrl = result.dataUrl;
            const safeName = safeFileName(track.title || 'track', 'track');
            const fileName = `fartify-${safeName}.png`;

            // Загружаем карточку в R2, чтобы при шаринге в Telegram
            // показывалась именно она, а не просто обложка
            let finalShareUrl = shareUrl;
            const imageUrl = await uploadCardToR2(dataUrl);
            if (imageUrl) {
                const u = new URL(shareUrl);
                u.searchParams.set('image', imageUrl);
                finalShareUrl = u.toString();
            }

            if (sharePreviewLoader) sharePreviewLoader.classList.add('hidden');
            if (sharePreviewImg) {
                sharePreviewImg.src = dataUrl;
                sharePreviewImg.classList.remove('hidden');
            }
            if (shareLinkInput) shareLinkInput.value = finalShareUrl;

            currentShareState = { dataUrl, shareUrl: finalShareUrl, fileName };
        }).catch(err => {
            console.error('[Share] Ошибка генерации карточки:', err);
            if (sharePreviewLoader) sharePreviewLoader.innerHTML = '<span style="color:#f87171">Не удалось создать карточку</span>';
        });
    }

    function openShareForPlaylist(config) {
        if (!config || !config.title) return;

        if (shareModalTitle) shareModalTitle.textContent = 'Поделиться плейлистом';
        if (shareModalSubtitle) shareModalSubtitle.textContent = config.title;

        const shareUrl = buildShareUrl('playlist', {
            title: config.title,
            cover: config.cover || ''
        });
        if (shareLinkInput) shareLinkInput.value = shareUrl;

        if (sharePreviewImg) {
            sharePreviewImg.classList.add('hidden');
            sharePreviewImg.removeAttribute('src');
        }
        if (sharePreviewLoader) sharePreviewLoader.classList.remove('hidden');

        currentShareState = null;
        openShareModal();

        generateShareCard({
            type: 'playlist',
            title: config.title,
            artist: config.artist || 'Fartify',
            cover: config.cover || 'placeholder.jpg',
            metaTracks: config.tracksCount ? `${config.tracksCount} треков` : '',
            metaPlays: config.plays || ''
        }).then(async result => {
            const dataUrl = result.dataUrl;
            const safeName = safeFileName(config.title, 'playlist');
            const fileName = `fartify-${safeName}.png`;

            let finalShareUrl = shareUrl;
            const imageUrl = await uploadCardToR2(dataUrl);
            if (imageUrl) {
                const u = new URL(shareUrl);
                u.searchParams.set('image', imageUrl);
                finalShareUrl = u.toString();
            }

            if (sharePreviewLoader) sharePreviewLoader.classList.add('hidden');
            if (sharePreviewImg) {
                sharePreviewImg.src = dataUrl;
                sharePreviewImg.classList.remove('hidden');
            }
            if (shareLinkInput) shareLinkInput.value = finalShareUrl;

            currentShareState = { dataUrl, shareUrl: finalShareUrl, fileName };
        }).catch(err => {
            console.error('[Share] Ошибка генерации карточки плейлиста:', err);
            if (sharePreviewLoader) sharePreviewLoader.innerHTML = '<span style="color:#f87171">Не удалось создать карточку</span>';
        });
    }

    function openShareForRelease(album, releaseType) {
        if (!album || !album.title) return;
        const type = releaseType || getAlbumType(album.tracks.length);

        if (shareModalTitle) shareModalTitle.textContent = 'Поделиться релизом';
        if (shareModalSubtitle) shareModalSubtitle.textContent = `${album.title} — ${album.artist}`;

        const shareUrl = buildShareUrl('release', { title: album.title });
        if (shareLinkInput) shareLinkInput.value = shareUrl;

        if (sharePreviewImg) {
            sharePreviewImg.classList.add('hidden');
            sharePreviewImg.removeAttribute('src');
        }
        if (sharePreviewLoader) sharePreviewLoader.classList.remove('hidden');

        currentShareState = null;
        openShareModal();

        generateShareCard({
            type: 'release',
            releaseType: type,
            title: album.title,
            artist: album.artist,
            cover: album.cover || 'placeholder.jpg',
            metaTracks: `${album.tracks.length} трек${album.tracks.length !== 1 ? 'а' : ''}`,
            metaDuration: getTotalDuration(album.tracks),
            metaDate: album.date || '',
            metaLabel: album.label || ''
        }).then(async result => {
            const dataUrl = result.dataUrl;
            const safeName = safeFileName(album.title, 'release');
            const fileName = `fartify-${safeName}.png`;

            let finalShareUrl = shareUrl;
            const imageUrl = await uploadCardToR2(dataUrl);
            if (imageUrl) {
                const u = new URL(shareUrl);
                u.searchParams.set('image', imageUrl);
                finalShareUrl = u.toString();
            }

            if (sharePreviewLoader) sharePreviewLoader.classList.add('hidden');
            if (sharePreviewImg) {
                sharePreviewImg.src = dataUrl;
                sharePreviewImg.classList.remove('hidden');
            }
            if (shareLinkInput) shareLinkInput.value = finalShareUrl;

            currentShareState = { dataUrl, shareUrl: finalShareUrl, fileName };
        }).catch(err => {
            console.error('[Share] Ошибка генерации карточки релиза:', err);
            if (sharePreviewLoader) sharePreviewLoader.innerHTML = '<span style="color:#f87171">Не удалось создать карточку</span>';
        });
    }

    // ────────────────────────────────────────────────────────
    // Share-view (страница с большой карточкой)
    // ────────────────────────────────────────────────────────
    async function showShareViewForTrack(track, album) {
        if (!track || !track.file) return;

        const coverFile = getBestTrackCover(track.file);
        const artistName = track.artist || album.artist;

        if (typeof stopCarouselAuto === 'function') stopCarouselAuto();
        mainContent.classList.add('hidden');
        artistPage.classList.add('hidden');
        modal.classList.add('hidden');
        playlistModal.classList.add('hidden');
        shareView.classList.remove('hidden');
        document.body.classList.add('share-view-open');
        document.body.style.paddingBottom = '0';

        shareViewCard.setAttribute('data-loading', '1');
        shareViewCard.removeAttribute('src');

        try {
            const result = await generateShareCard({
                type: 'track',
                title: track.title || 'Без названия',
                artist: artistName,
                cover: coverFile,
                metaPlays: track.plays || '',
                metaDuration: track.duration || '',
                metaDate: album.date || ''
            });
            applyShareViewTheme(result.colors);
            shareViewCard.removeAttribute('data-loading');
            shareViewCard.src = result.dataUrl;
            shareViewDataUrl = result.dataUrl;
            shareViewFileName = `fartify-${safeFileName(track.title, 'track')}.png`;
        } catch (e) {
            console.error('[ShareView] Ошибка:', e);
            shareViewCard.removeAttribute('data-loading');
        }

        if (shareViewListen) {
            shareViewListen.onclick = () => {
                resetShareViewTheme();
                document.body.classList.remove('share-view-open');
                document.body.style.paddingBottom = '';
                shareView.classList.add('hidden');
                safeReplaceState(BASE_PATH);
                mainContent.classList.remove('hidden');
                clearManualContext();
                stopGlobalShuffle();
                currentAlbum = album;
                const idx = album.tracks.findIndex(t => t.file === track.file);
                if (idx !== -1) playTrackByIndex(idx);
                updatePlaybackUI();
                callFitAfterRender();
            };
        }

        if (shareViewDownload) {
            shareViewDownload.onclick = () => {
                if (!shareViewDataUrl) return;
                const a = document.createElement('a');
                a.href = shareViewDataUrl;
                a.download = shareViewFileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            };
        }
    }

    async function showShareViewFromParams() {
        const params = new URLSearchParams(window.location.search);
        const shareType = params.get('share');
        if (!shareType) return false;

        if (!allAlbums || allAlbums.length === 0) return false;

        // ?share=track&title=<slug> — тот же формат, что у /track/<slug>
        if (shareType === 'track') {
            const titleParam = params.get('title');
            const fileParam = params.get('file');

            let found = null;
            if (titleParam) {
                found = findTrackBySlug(titleParam);
            } else if (fileParam) {
                found = findTrackAndAlbum(fileParam);
            }

            if (!found) {
                showShareViewLoading('Трек не найден');
                return true;
            }
            const { track, album } = found;
            await showShareViewForTrack(track, album);
            return true;
        }

        if (shareType === 'release') {
            const title = params.get('title');
            if (!title) return false;

            const album = allAlbums.find(a => a.title === title);
            if (!album) {
                showShareViewLoading('Релиз не найден');
                return true;
            }

            mainContent.classList.add('hidden');
            artistPage.classList.add('hidden');
            modal.classList.add('hidden');
            playlistModal.classList.add('hidden');
            shareView.classList.remove('hidden');
            document.body.classList.add('share-view-open');
            document.body.style.paddingBottom = '0';

            shareViewCard.setAttribute('data-loading', '1');
            shareViewCard.removeAttribute('src');

            const releaseType = getAlbumType(album.tracks.length);

            try {
                const result = await generateShareCard({
                    type: 'release',
                    releaseType,
                    title: album.title,
                    artist: album.artist,
                    cover: album.cover || 'placeholder.jpg',
                    metaTracks: `${album.tracks.length} трек${album.tracks.length !== 1 ? 'а' : ''}`,
                    metaDuration: getTotalDuration(album.tracks),
                    metaDate: album.date || '',
                    metaLabel: album.label || ''
                });
                applyShareViewTheme(result.colors);
                shareViewCard.removeAttribute('data-loading');
                shareViewCard.src = result.dataUrl;
                shareViewDataUrl = result.dataUrl;
                shareViewFileName = `fartify-${safeFileName(album.title, 'release')}.png`;
            } catch (e) {
                console.error('[ShareView] Ошибка генерации release-карточки:', e);
                shareViewCard.removeAttribute('data-loading');
            }

            if (shareViewListen) {
                shareViewListen.onclick = () => {
                    resetShareViewTheme();
                    document.body.classList.remove('share-view-open');
                    document.body.style.paddingBottom = '';
                    shareView.classList.add('hidden');
                    const releasePath = BASE_PATH + 'release/' + encodeURIComponent(album.title);
                    safeReplaceState(releasePath);
                    mainContent.classList.remove('hidden');
                    openModal(album, releaseType);
                    callFitAfterRender();
                };
            }

            if (shareViewDownload) {
                shareViewDownload.onclick = () => {
                    if (!shareViewDataUrl) return;
                    const a = document.createElement('a');
                    a.href = shareViewDataUrl;
                    a.download = shareViewFileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                };
            }

            return true;
        }

        if (shareType === 'playlist') {
            const title = params.get('title');
            const cover = params.get('cover') || 'placeholder.jpg';
            if (!title) return false;

            let playlist = null;
            if (title === 'Избранное') {
                playlist = {
                    title: 'Избранное',
                    cover: 'photo/favorites.png',
                    tracks: favorites.map(f => ({
                        file: f.file, title: f.title, artist: f.artist, cover: f.cover,
                        albumTitle: f.albumTitle, duration: f.duration
                    }))
                };
            } else if (title === 'Fartify топ-50') {
                const chart = autoPlaylists.find(p => p.id === 'chart');
                if (chart) playlist = chart;
            } else {
                playlist = autoPlaylists.find(p => p.title === title) || null;
            }

            mainContent.classList.add('hidden');
            artistPage.classList.add('hidden');
            modal.classList.add('hidden');
            playlistModal.classList.add('hidden');
            shareView.classList.remove('hidden');
            document.body.classList.add('share-view-open');
            document.body.style.paddingBottom = '0';

            shareViewCard.setAttribute('data-loading', '1');
            shareViewCard.removeAttribute('src');

            try {
                const result = await generateShareCard({
                    type: 'playlist',
                    title,
                    artist: 'Fartify',
                    cover,
                    metaTracks: playlist ? `${playlist.tracks.length} треков` : ''
                });
                applyShareViewTheme(result.colors);
                shareViewCard.removeAttribute('data-loading');
                shareViewCard.src = result.dataUrl;
                shareViewDataUrl = result.dataUrl;
                shareViewFileName = `fartify-${safeFileName(title, 'playlist')}.png`;
            } catch (e) {
                console.error('[ShareView] Ошибка:', e);
                shareViewCard.removeAttribute('data-loading');
            }

            if (shareViewListen) {
                shareViewListen.onclick = () => {
                    resetShareViewTheme();
                    document.body.classList.remove('share-view-open');
                    document.body.style.paddingBottom = '';
                    shareView.classList.add('hidden');
                    safeReplaceState(BASE_PATH);
                    mainContent.classList.remove('hidden');
                    if (playlist && playlist.tracks && playlist.tracks.length) {
                        handlePlaylistPlayClick(playlist.title, playlist.tracks);
                    } else {
                        callFitAfterRender();
                    }
                };
            }

            if (shareViewDownload) {
                shareViewDownload.onclick = () => {
                    if (!shareViewDataUrl) return;
                    const a = document.createElement('a');
                    a.href = shareViewDataUrl;
                    a.download = shareViewFileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                };
            }

            return true;
        }

        return false;
    }

    function showShareViewLoading(msg) {
        mainContent.classList.add('hidden');
        shareView.classList.remove('hidden');
        document.body.classList.add('share-view-open');
        document.body.style.paddingBottom = '0';
        if (shareViewCard) {
            shareViewCard.removeAttribute('src');
            shareViewCard.alt = msg;
        }
        if (shareViewListen) shareViewListen.onclick = () => {
            safeReplaceState(BASE_PATH);
            location.reload();
        };
    }

    // ────────────────────────────────────────────────────────
    // Публичный API
    // ────────────────────────────────────────────────────────
    window.fartifyShare = {
        track: (track, album) => openShareForTrack(track, album),
        playlist: (config) => openShareForPlaylist(config),
        release: (album, type) => openShareForRelease(album, type),
        showTrack: (track, album) => showShareViewForTrack(track, album),
        current: () => {
            if (currentTrackMeta) {
                openShareForTrack(currentTrackMeta, currentAlbum);
            }
        },

        // ★ Публичный генератор карточки трека.
        // Возвращает { dataUrl, colors } — используется на странице артиста.
        generateTrackCard: async (track, album) => {
            if (!track || !track.file) {
                throw new Error('generateTrackCard: no track');
            }
            const finalAlbum = album || currentAlbum || null;
            const coverFile = getBestTrackCover(track.file);
            const artistName = track.artist || (finalAlbum && finalAlbum.artist) || '';

            return generateShareCard({
                type: 'track',
                title: track.title || 'Без названия',
                artist: artistName,
                cover: coverFile,
                metaPlays: track.plays || '',
                metaDuration: track.duration || '',
                metaDate: finalAlbum ? (finalAlbum.date || '') : ''
            });
        }
    };

    // Кнопка Share в плеере
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            if (!currentTrackMeta) {
                toast('Сейчас ничего не играет');
                return;
            }
            openShareForTrack(currentTrackMeta, currentAlbum);
        });
    }

    // Пункт «Поделиться» в контекстном меню
    const contextMenuEl = document.getElementById('context-menu');
    if (contextMenuEl) {
        contextMenuEl.addEventListener('click', (e) => {
            const btn = e.target.closest('.context-menu-item');
            if (!btn || btn.dataset.action !== 'share') return;
            const target = window.__ctxTarget;
            if (!target) return;
            const file = target.dataset.file;
            if (!file) return;
            for (const album of allAlbums) {
                const t = album.tracks.find(x => x.file === file);
                if (t) {
                    e.stopImmediatePropagation();
                    hideContextMenu();
                    openShareForTrack(t, album);
                    return;
                }
            }
        }, true);
    }

    // ────────────────────────────────────────────────────────
    // Обработка ?share=... при загрузке страницы
    // ────────────────────────────────────────────────────────
    window.__fartifyTryHandleShareParams = function tryHandleShareParams() {
        const params = new URLSearchParams(window.location.search);
        const shareType = params.get('share');
        if (!shareType) return;

        if (!allAlbums || allAlbums.length === 0) {
            setTimeout(tryHandleShareParams, 100);
            return;
        }

        // Старый «карточный» режим ?share=card
        if (shareType === 'card') {
            let title = params.get('release') || params.get('title');
            if (!title) {
                const rel = getRelativePath();
                const seg = rel.replace(/^\//, '').split('/');
                if (seg[0] === 'release' && seg[1]) title = decodeURIComponent(seg[1]);
            }
            if (!title) return;

            const album = allAlbums.find(a => a.title === title);
            if (!album) return;

            const type = getAlbumType(album.tracks.length);
            const expectedPath = BASE_PATH + 'release/' + encodeURIComponent(album.title);
            if (window.location.pathname !== expectedPath) {
                stopGlobalShuffle();
                openModal(album, type);
            }
            setTimeout(() => openShareForRelease(album, type), 300);
            return;
        }

        showShareViewFromParams();
    };
}

function tryHandleShareParams() {
    if (typeof window.__fartifyTryHandleShareParams === 'function') {
        window.__fartifyTryHandleShareParams();
    } else {
        setTimeout(tryHandleShareParams, 100);
    }
}