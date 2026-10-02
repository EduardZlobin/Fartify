// ============================================================
// js/queue.js — ручная очередь и очередь следующих треков
// ============================================================

// ---------- Ручная очередь ----------
function addToManualQueue(track, album) {
    if (!track || !track.file) return;
    manualQueue.push({
        id: ++manualQueueIdCounter,
        track: {
            ...track,
            albumTitle: track.albumTitle || (album ? album.title : '') || ''
        },
        album: album || null
    });
    renderQueue();
}

function removeFromManualQueue(manualId) {
    const before = manualQueue.length;
    manualQueue = manualQueue.filter(it => it.id !== manualId);
    if (manualQueue.length !== before) renderQueue();
}

function findTrackAndAlbum(file) {
    for (const album of allAlbums) {
        const t = album.tracks.find(t => t.file === file);
        if (t) return { track: t, album };
    }
    return null;
}

function captureResumeState() {
    if (manualResumeState) return;
    manualResumeState = {
        album: currentAlbum,
        trackIndex: currentTrackIndex,
        isGlobalShuffle,
        globalPlaylist: [...globalPlaylist],
        globalCurrentIndex,
        shuffle,
        shuffleQueue: [...shuffleQueue],
        shuffleQueuePosition,
        history: [...history]
    };
}

function restoreManualResume() {
    if (!manualResumeState) return false;
    const s = manualResumeState;
    currentAlbum = s.album;
    currentTrackIndex = s.trackIndex;
    isGlobalShuffle = s.isGlobalShuffle;
    globalPlaylist = s.globalPlaylist;
    globalCurrentIndex = s.globalCurrentIndex;
    shuffle = s.shuffle;
    shuffleQueue = s.shuffleQueue;
    shuffleQueuePosition = s.shuffleQueuePosition;
    history = s.history;
    shuffleBtn.classList.toggle('active', shuffle);
    shuffleBtn.disabled = isGlobalShuffle;
    manualResumeState = null;
    return true;
}

function clearManualContext() {
    manualQueue = [];
    manualResumeState = null;
}

function playManualItem(item) {
    if (!item) return;
    const { track, album } = item;

    captureResumeState();

    let realAlbum = null;
    let realIndex = -1;
    if (album) {
        realAlbum = allAlbums.find(a =>
            a.title === album.title && a.artist === album.artist
        ) || album;
        realIndex = realAlbum.tracks.findIndex(t => t.file === track.file);
    }

    if (realAlbum && realIndex !== -1) {
        currentAlbum = realAlbum;
        currentTrackIndex = realIndex;
        loadAndPlay(realAlbum.tracks[realIndex]);
    } else {
        currentAlbum = {
            artist: track.artist || '',
            cover: track.cover || 'placeholder.jpg',
            title: track.albumTitle || '',
            tracks: [track]
        };
        currentTrackIndex = 0;
        loadAndPlay(track);
    }
}

function playManualQueueItem(manualId) {
    const idx = manualQueue.findIndex(it => it.id === manualId);
    if (idx === -1) return;
    const item = manualQueue[idx];
    manualQueue.splice(0, idx + 1);
    playManualItem(item);
}

// ---------- Shuffle queue ----------
function resetShuffleQueue(startIndex = currentTrackIndex) {
    if (!currentAlbum || !Array.isArray(currentAlbum.tracks) || currentAlbum.tracks.length === 0) {
        shuffleQueue = [];
        shuffleQueuePosition = -1;
        return;
    }
    const allowed = currentAlbum.tracks
        .map((t, i) => ({ t, i }))
        .filter(({ t }) => !isBlocked(t.file))
        .map(({ i }) => i);

    if (allowed.length === 0) {
        shuffleQueue = [];
        shuffleQueuePosition = -1;
        return;
    }
    const start = allowed.includes(startIndex) ? startIndex : allowed[0];
    const rest = allowed.filter(i => i !== start);
    rest.sort(() => Math.random() - 0.5);
    shuffleQueue = [start, ...rest];
    shuffleQueuePosition = 0;
}

function syncShuffleQueueToCurrent() {
    if (!shuffle) return;
    const pos = shuffleQueue.indexOf(currentTrackIndex);
    if (pos === -1) resetShuffleQueue(currentTrackIndex);
    else shuffleQueuePosition = pos;
}

// ---------- Очередь следующего ----------
function getBaseQueueTracks(limit = 15, state = null) {
    const S = state || {
        album: currentAlbum,
        trackIndex: currentTrackIndex,
        isGlobalShuffle,
        globalPlaylist,
        globalCurrentIndex,
        shuffle,
        shuffleQueue,
        shuffleQueuePosition
    };

    if (!S.album || !Array.isArray(S.album.tracks) || S.album.tracks.length === 0) return [];

    if (S.isGlobalShuffle && S.globalPlaylist.length > 0) {
        const result = [];
        const total = S.globalPlaylist.length;
        const max = repeat === 'none' ? Math.min(limit, Math.max(0, total - 1)) : limit;
        for (let step = 1; step <= max; step++) {
            const idx = (S.globalCurrentIndex + step) % total;
            result.push({
                track: S.globalPlaylist[idx],
                globalIndex: idx,
                index: -1,
                position: step
            });
        }
        return result;
    }

    const tracks = S.album.tracks;
    const result = [];

    if (repeat === 'one') {
        const current = tracks[S.trackIndex];
        for (let i = 0; i < limit; i++) {
            if (current) result.push({ track: current, index: S.trackIndex, position: i + 1, repeatOne: true });
        }
        return result;
    }

    if (S.shuffle) {
        if (!S.shuffleQueue.length) return result;

        const remaining = S.shuffleQueue.length - S.shuffleQueuePosition - 1;
        const max = repeat === 'none' ? Math.min(limit, Math.max(0, remaining)) : limit;
        for (let step = 1; step <= max; step++) {
            let pos = S.shuffleQueuePosition + step;
            let cycleOffset = 0;
            if (pos >= S.shuffleQueue.length) {
                if (repeat === 'none') break;
                cycleOffset = Math.floor(pos / S.shuffleQueue.length);
                pos %= S.shuffleQueue.length;
            }
            const index = S.shuffleQueue[pos];
            const track = tracks[index];
            if (track) {
                result.push({ track, index, position: step, cycleOffset });
            }
        }
        return result;
    }

    for (let step = 1; step <= limit; step++) {
        let index = S.trackIndex + step;
        if (index >= tracks.length) {
            if (repeat === 'none') break;
            index %= tracks.length;
        }
        const track = tracks[index];
        if (track) result.push({ track, index, position: step });
    }

    return result;
}

function getQueueTracks(limit = 15) {
    const result = [];

    manualQueue.forEach((item, i) => {
        if (i >= limit) return;
        result.push({
            track: item.track,
            index: -1,
            position: i,
            isManual: true,
            manualId: item.id
        });
    });

    const remaining = limit - result.length;
    if (remaining > 0) {
        const queueState = manualResumeState ? {
            album: manualResumeState.album,
            trackIndex: manualResumeState.trackIndex,
            isGlobalShuffle: manualResumeState.isGlobalShuffle,
            globalPlaylist: manualResumeState.globalPlaylist,
            globalCurrentIndex: manualResumeState.globalCurrentIndex,
            shuffle: manualResumeState.shuffle,
            shuffleQueue: manualResumeState.shuffleQueue,
            shuffleQueuePosition: manualResumeState.shuffleQueuePosition
        } : null;

        const base = getBaseQueueTracks(remaining + 6, queueState)
            .filter(item => !isBlocked(item.track.file))
            .slice(0, remaining);
        base.forEach(item => {
            item.position = result.length;
            result.push(item);
        });
    }

    return result;
}

function createQueueItem(item, position) {
    const track = item.track;
    const row = document.createElement('div');
    row.className = 'queue-item';
    if (track.file) row.dataset.file = track.file;
    if (item.isManual && item.manualId) row.dataset.manualId = String(item.manualId);
    row.dataset.queueIndex = String(position);
    if (item.globalIndex >= 0) row.dataset.globalIndex = String(item.globalIndex);
    if (item.index >= 0) row.dataset.trackIndex = String(item.index);
    row.title = `Включить: ${track.title || 'Без названия'}`;

    const cover = track.cover || currentAlbum?.cover || 'placeholder.jpg';
    const artistHtml = formatTrackArtistsHtml(
        track.file,
        track.artist || currentAlbum?.artist || ''
    );
    const albumTitle = track.albumTitle || (currentAlbum && !currentAlbum.isPlaylist ? currentAlbum.title : '');

    row.innerHTML = `
        <span class="queue-position">${position + 1}</span>
        <img class="queue-cover" src="photo/${escapeHtml(cover)}" alt="" onerror="this.src='photo/placeholder.jpg'">
        <div class="queue-info">
            <div class="queue-title">${escapeHtml(track.title || 'Без названия')}</div>
            <div class="queue-meta">${artistHtml}${albumTitle ? ` <span>•</span> ${escapeHtml(albumTitle)}` : ''}</div>
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

    const manualId = parseInt(row.dataset.manualId, 10);
    if (Number.isInteger(manualId) && manualId > 0) {
        playManualQueueItem(manualId);
        return;
    }

    const globalIndex = parseInt(row.dataset.globalIndex, 10);
    if (isGlobalShuffle && Number.isInteger(globalIndex)) {
        if (manualResumeState) restoreManualResume();
        globalCurrentIndex = globalIndex;
        playGlobalTrack();
        return;
    }

    const index = parseInt(row.dataset.trackIndex, 10);
    if (!Number.isInteger(index) || !currentAlbum?.tracks?.[index]) return;
    if (manualResumeState) restoreManualResume();
    playTrackByIndex(index, { fromShuffle: shuffle });
}

// ---------- Обработчики очереди ----------
function setupQueueEvents() {
    if (queueNext) queueNext.addEventListener('click', (e) => {
        if (e.target.closest('.artist-inline-link')) return;
        const row = e.target.closest('.queue-item');
        if (!row) return;
        playQueuedItem(row);
    });
    if (queueFull) queueFull.addEventListener('click', (e) => {
        if (e.target.closest('.artist-inline-link')) return;
        const row = e.target.closest('.queue-item');
        if (!row) return;
        playQueuedItem(row);
    });
    if (queueToggle) queueToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        queueExpanded = !queueExpanded;

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
}