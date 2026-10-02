// ============================================================
// js/player.js — плеер, прогресс, громкость, сохранение состояния
// ============================================================

// ---------- Сохранение/загрузка состояния ----------
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
                    cover: resolveTrackCover(t, currentAlbum),
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
        const trackWithMeta = {
            file: track.file,
            title: track.title,
            artist: track.artist || currentAlbum.artist,
            cover: track.cover || currentAlbum.cover,
            albumTitle: track.albumTitle || currentAlbum.title,
            duration: track.duration,
            plays: track.plays
        };

        currentTrackMeta = trackWithMeta;

        audio.src = `music/${track.file}`;
        playerCover.src = `photo/${resolveTrackCover(track, currentAlbum)}`;
        playerTitle.textContent = track.title || '';
        playerArtist.textContent = track.artist || currentAlbum.artist;

        const isFav = isFavorite(trackWithMeta);
        playerFavBtn.classList.toggle('active', isFav);
        updatePlayerHeartFill(isFav);
        playerFavBtn.onclick = () => toggleFavorite(trackWithMeta);

        // Восстанавливаем позицию с откатом на 3 секунды
        const targetTime = Math.max(0, (state.currentTime || 0) - 3);

        const applyRestoredTime = () => {
            if (targetTime <= 0) return;
            try {
                const dur = audio.duration;
                const safe = Number.isFinite(dur) && dur > 0
                    ? Math.min(targetTime, Math.max(0, dur - 0.5))
                    : targetTime;
                if (safe > 0) {
                    audio.currentTime = safe;
                    if (Number.isFinite(dur) && dur > 0) {
                        const percent = (safe / dur) * 100;
                        progressBar.value = percent;
                        progressFill.style.width = percent + '%';
                    }
                    currentTimeEl.textContent = formatTime(safe);
                }
            } catch (e) {
                console.warn('[restore] set currentTime failed:', e);
            }
        };

        if (audio.readyState >= 1) {
            applyRestoredTime();
        } else {
            audio.addEventListener('loadedmetadata', function onLoaded() {
                audio.removeEventListener('loadedmetadata', onLoaded);
                applyRestoredTime();
            });
        }

        audio.volume = state.volume || 0.7;
        updateVolumeUI();
        updatePlayPauseIcon(false);

        updateLyricsPanel(track);
        updateLyricsNowPlaying(trackWithMeta);
    }

    if (shuffle) {
        shuffleBtn.classList.add('active');
        resetShuffleQueue(currentTrackIndex);
    } else {
        shuffleBtn.classList.remove('active');
    }
    updateRepeatIcon();
    shuffleBtn.disabled = isGlobalShuffle;
    updatePlaybackUI();
}

// ---------- Воспроизведение ----------
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
    const trackCoverFile = resolveTrackCover(track, currentAlbum);
    playerCover.src = `photo/${trackCoverFile}`;
    playerTitle.textContent = track.title || '';
        playerArtist.innerHTML = formatTrackArtistsHtml(
            track.file,
            track.artist || (currentAlbum ? currentAlbum.artist : '')
        );
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
        artist: formatTrackArtists(track.file, track.artist || 'Неизвестный исполнитель'),
        album: track.albumTitle || '',
        artwork: [{ src: `photo/${resolveTrackCover(track, currentAlbum)}`, sizes: '512x512', type: 'image/jpeg' }]
    });
}

// ---------- Обновление UI плеера ----------
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
    
        // ★ Обновляем иконку и состояние у кнопки топ-трека на странице артиста
    const topTrackBtn = document.getElementById('top-track-play-btn');
    if (topTrackBtn) {
        const topFile = topTrackBtn.dataset.file;
        if (topFile) {
            const isThisTrack = currentAlbum
                && currentAlbum.tracks
                && currentAlbum.tracks[currentTrackIndex]
                && currentAlbum.tracks[currentTrackIndex].file === topFile
                && !isGlobalShuffle;

            if (isThisTrack && isPlaying) {
                topTrackBtn.classList.add('is-playing');
                topTrackBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="3" width="6" height="18" rx="0.5"/><rect x="14" y="3" width="6" height="18" rx="0.5"/></svg>`;
                topTrackBtn.title = 'Пауза';
            } else {
                topTrackBtn.classList.remove('is-playing');
                topTrackBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 21,12 5,21"/></svg>`;
                topTrackBtn.title = 'Слушать';
            }
        }
    }
}

function updatePlayPauseIcon(playing) {
    if (playing) { playIcon.style.display = 'none'; pauseIcon.style.display = 'block'; }
    else { playIcon.style.display = 'block'; pauseIcon.style.display = 'none'; }
}

function updateVolumeUI() {
    const vol = audio.volume;
    volumeBar.value = vol * 100;
    volumeFill.style.width = (vol * 100) + '%';
    if (vol === 0) { volumeOnIcon.style.display = 'none'; volumeOffIcon.style.display = 'block'; }
    else { volumeOnIcon.style.display = 'block'; volumeOffIcon.style.display = 'none'; }
}

// ---------- Рекомендации (глобальный shuffle) ----------
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
    return allTracks
        .filter(t => !isBlocked(t.file))
        .sort(() => Math.random() - 0.5);
}

function startGlobalShuffle() {
    clearManualContext();
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

// ---------- Управление ----------
function togglePlay() {
    if (!audio.src) return;
    if (audio.paused) { audio.play(); updatePlayPauseIcon(true); }
    else { audio.pause(); updatePlayPauseIcon(false); }
    savePlayerState();
}

function nextTrack() {
    if (manualQueue.length > 0) {
        const item = manualQueue.shift();
        playManualItem(item);
        return;
    }

    if (manualResumeState) {
        restoreManualResume();
    }

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
    if (manualResumeState) {
        restoreManualResume();
        if (currentAlbum && currentAlbum.tracks && currentAlbum.tracks[currentTrackIndex]) {
            loadAndPlay(currentAlbum.tracks[currentTrackIndex]);
        }
        return;
    }

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

// ---------- Обработчики плеера ----------
function setupPlayerEvents() {
    playPauseBtn.addEventListener('click', togglePlay);
    nextBtn.addEventListener('click', nextTrack);

    // ★ Обработчик клика по имени артиста в плеере
    if (playerArtist) {
        playerArtist.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const link = e.target.closest('.artist-inline-link');
            if (link) {
                const name = link.dataset.artist;
                if (!name) return;
                stopGlobalShuffle();
                showArtistPage(name);
                return;
            }

            // Клик по пустому месту — основной артист
            const artist = (currentTrackMeta && currentTrackMeta.artist)
                || (currentAlbum && currentAlbum.artist);
            if (!artist) return;
            stopGlobalShuffle();
            showArtistPage(artist);
        });
    }

    prevBtn.addEventListener('click', prevTrack);
    shuffleBtn.addEventListener('click', toggleShuffle);
    repeatBtn.addEventListener('click', toggleRepeat);
    updateRepeatIcon();

    // Прогресс
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
        const EQ = window.__fartifyEq;
        if (EQ && EQ.ctx && EQ.ctx.state === 'suspended') EQ.ctx.resume().catch(() => {});
    });

    audio.addEventListener('pause', () => {
        updatePlayPauseIcon(false);
        updatePlaybackUI();
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
        savePlayerState();
    });

    // Громкость
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

    // Media keys
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

    // Сохраняем состояние при уходе со страницы
    window.addEventListener('beforeunload', savePlayerState);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') savePlayerState();
    });
}