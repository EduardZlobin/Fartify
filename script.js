document.addEventListener('DOMContentLoaded', () => {
    // ---------- DOM-ЭЛЕМЕНТЫ ----------
    const mainContent = document.getElementById('main-content');
    const artistPage = document.getElementById('artist-page');
    const backBtn = document.getElementById('back-btn');
    const artistAvatar = document.getElementById('artist-avatar');
    const artistNameElem = document.getElementById('artist-name');
    const artistPlayBtn = document.getElementById('artist-play-btn');
    const popularTracksList = document.getElementById('popular-tracks-list');
    const artistAlbumsGrid = document.getElementById('artist-albums-grid');

    const artistsGrid = document.getElementById('artists-grid');
    const albumsGrid = document.getElementById('albums-grid');

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
    const closeBtn = document.querySelector('#album-modal .close');

    const player = document.getElementById('player');
    const audio = document.getElementById('audio');
    const playerCover = document.getElementById('player-cover');
    const playerTitle = document.getElementById('player-title');
    const playerArtist = document.getElementById('player-artist');
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

    const imageModal = document.getElementById('image-modal');
    const imageModalImg = document.getElementById('image-modal-img');
    const closeImageModal = imageModal ? imageModal.querySelector('.close') : null;

    // ---------- ГЛОБАЛЬНОЕ СОСТОЯНИЕ ----------
    let allAlbums = [];
    let artistsMap = {};
    let currentAlbum = null;
    let currentTrackIndex = 0;
    let shuffle = false;
    let repeat = 'none';
    let history = [];
    let lastVolume = 0.7;

    // Рекомендации (глобальный плейлист)
    let isGlobalShuffle = false;          // включены ли рекомендации
    let globalPlaylist = [];              // все треки (перемешанные)
    let globalCurrentIndex = -1;

    // ---------- ИНИЦИАЛИЗАЦИЯ ----------
    audio.volume = 0.7;
    updateVolumeUI();

    // ---------- ЗАГРУЗКА ДАННЫХ ----------
    Promise.all([
        fetch('data.json').then(r => r.json()),
        fetch('artists.json').then(r => r.json()).catch(() => [])
    ])
    .then(([albumsData, artistsData]) => {
        allAlbums = albumsData;
        artistsMap = {};
        artistsData.forEach(a => { artistsMap[a.name] = a; });

        const uniqueArtists = [];
        const seen = new Set();
        albumsData.forEach(album => {
            if (!seen.has(album.artist)) {
                seen.add(album.artist);
                const artistInfo = artistsMap[album.artist];
                uniqueArtists.push({
                    name: album.artist,
                    cover: artistInfo ? artistInfo.avatar : getLatestAlbumCover(album.artist)
                });
            }
        });

        const shuffled = [...albumsData].sort(() => Math.random() - 0.5);
        renderArtists(uniqueArtists);
        renderAlbums(shuffled);
    })
    .catch(err => console.error('Ошибка загрузки данных:', err));

    // ---------- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ----------
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

    // ---------- ОТРИСОВКА ----------
    function renderArtists(artists) {
        artistsGrid.innerHTML = '';
        artists.forEach(artist => {
            const card = document.createElement('div');
            card.className = 'artist-card';
            card.innerHTML = `
                <img src="photo/${artist.cover}" alt="${artist.name}" onerror="this.src='photo/placeholder.jpg'">
                <div class="artist-name">${artist.name}</div>
            `;
            card.addEventListener('click', () => {
                stopGlobalShuffle();
                showArtistPage(artist.name);
            });
            artistsGrid.appendChild(card);
        });
    }

    function renderAlbums(albums) {
        albumsGrid.innerHTML = '';
        albums.forEach(album => {
            const type = getAlbumType(album.tracks.length);
            const card = document.createElement('div');
            card.className = 'album-card';
            card.innerHTML = `
                <img src="photo/${album.cover}" alt="${album.title}" onerror="this.src='photo/placeholder.jpg'">
                <div class="title">${album.title}</div>
                <div class="artist">${album.artist}</div>
                <div class="type">${type}</div>
                <div class="date">${album.date || ''}</div>
            `;
            card.addEventListener('click', () => {
                stopGlobalShuffle();
                openModal(album, type);
            });
            albumsGrid.appendChild(card);
        });
    }

    // ---------- МОДАЛЬНОЕ ОКНО АЛЬБОМА ----------
    function openModal(album, type) {
        currentAlbum = album;

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

        modalPlayBtn.onclick = () => {
            stopGlobalShuffle();
            playTrackByIndex(0);
            modal.classList.add('hidden');
        };

        modalTracks.innerHTML = '';
        album.tracks.forEach((track, index) => {
            const row = document.createElement('li');
            row.className = 'track-row';
            row.innerHTML = `
                <span class="track-num">${index + 1}</span>
                <span class="track-title-col">${track.title}</span>
                <span class="track-plays">${track.plays || ''}</span>
                <span class="track-duration">${track.duration || ''}</span>
            `;
            row.addEventListener('click', (e) => {
                e.stopPropagation();
                stopGlobalShuffle();
                playTrackByIndex(index);
                modal.classList.add('hidden');
            });
            modalTracks.appendChild(row);
        });

        modalFooterDate.textContent = date ? date : '';
        modalFooterLabel.textContent = album.label || '';

        modal.classList.remove('hidden');
    }

    // ---------- ВОСПРОИЗВЕДЕНИЕ ТРЕКА ----------
    function playTrackByIndex(index) {
        if (!currentAlbum) return;
        currentTrackIndex = index;
        loadAndPlay(currentAlbum.tracks[currentTrackIndex]);
        player.classList.remove('hidden');
        if (!history.includes(currentTrackIndex)) history.push(currentTrackIndex);
    }

    function loadAndPlay(track) {
    audio.src = `music/${track.file}`;
    playerCover.src = `photo/${currentAlbum.cover}`;
    playerTitle.textContent = track.title;
    playerArtist.textContent = currentAlbum.artist;
    player.classList.remove('hidden');
    audio.play().catch(e => console.warn('Автовоспроизведение:', e));
    updatePlayPauseIcon(true);
}
    function updatePlayPauseIcon(playing) {
        if (playing) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        } else {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        }
    }

    // ---------- ГЛОБАЛЬНЫЙ ПЛЕЙЛИСТ (РЕКОМЕНДАЦИИ) ----------
    function buildGlobalPlaylist() {
        const allTracks = [];
        allAlbums.forEach(album => {
            album.tracks.forEach(track => {
                allTracks.push({
                    ...track,
                    artist: album.artist,
                    cover: album.cover,
                    albumTitle: album.title
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
    }

    function playGlobalTrack() {
        if (globalPlaylist.length === 0 || globalCurrentIndex < 0) return;
        const track = globalPlaylist[globalCurrentIndex];
        currentAlbum = {
            artist: track.artist,
            cover: track.cover,
            title: track.albumTitle,
            tracks: [track]
        };
        currentTrackIndex = 0;
        loadAndPlay(track);
    }

    function stopGlobalShuffle() {
        if (isGlobalShuffle) {
            isGlobalShuffle = false;
            globalPlaylist = [];
            globalCurrentIndex = -1;
            shuffleBtn.disabled = false;
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

    // ---------- УПРАВЛЕНИЕ ПЛЕЕРОМ ----------
    function togglePlay() {
        if (!audio.src) return;
        if (audio.paused) { audio.play(); updatePlayPauseIcon(true); }
        else { audio.pause(); updatePlayPauseIcon(false); }
    }

    function nextTrack() {
        if (isGlobalShuffle) {
            globalNext();
            return;
        }
        if (!currentAlbum || currentAlbum.tracks.length === 0) return;
        let nextIndex;
        if (shuffle) {
            nextIndex = Math.floor(Math.random() * currentAlbum.tracks.length);
        } else {
            nextIndex = currentTrackIndex + 1;
            if (nextIndex >= currentAlbum.tracks.length) {
                if (repeat === 'none') {
                    audio.pause();
                    updatePlayPauseIcon(false);
                    return;
                } else {
                    nextIndex = 0;
                }
            }
        }
        playTrackByIndex(nextIndex);
    }

    function prevTrack() {
        if (isGlobalShuffle) {
            globalPrev();
            return;
        }
        if (!currentAlbum || currentAlbum.tracks.length === 0) return;
        if (shuffle && history.length > 1) {
            history.pop();
            const prevIndex = history.pop();
            if (prevIndex !== undefined) playTrackByIndex(prevIndex);
            else playTrackByIndex(0);
        } else {
            let prevIndex = currentTrackIndex - 1;
            if (prevIndex < 0) prevIndex = currentAlbum.tracks.length - 1;
            playTrackByIndex(prevIndex);
        }
    }

    function toggleShuffle() {
        if (isGlobalShuffle) return;
        shuffle = !shuffle;
        if (shuffle) {
            shuffleBtn.classList.add('active');
            history = [currentTrackIndex];
        } else {
            shuffleBtn.classList.remove('active');
        }
    }

    function updateRepeatIcon() {
        if (repeat === 'one') {
            repeatAllIcon.style.display = 'none';
            repeatOneIcon.style.display = 'block';
            repeatBtn.classList.add('active');
        } else if (repeat === 'all') {
            repeatAllIcon.style.display = 'block';
            repeatOneIcon.style.display = 'none';
            repeatBtn.classList.add('active');
        } else {
            repeatAllIcon.style.display = 'block';
            repeatOneIcon.style.display = 'none';
            repeatBtn.classList.remove('active');
        }
    }

    function toggleRepeat() {
        if (repeat === 'none') { repeat = 'all'; }
        else if (repeat === 'all') { repeat = 'one'; }
        else { repeat = 'none'; }
        updateRepeatIcon();
    }

    playPauseBtn.addEventListener('click', togglePlay);
    nextBtn.addEventListener('click', nextTrack);
    prevBtn.addEventListener('click', prevTrack);
    shuffleBtn.addEventListener('click', toggleShuffle);
    repeatBtn.addEventListener('click', toggleRepeat);
    updateRepeatIcon();

    // ---------- ПРОГРЕСС И ВРЕМЯ ----------
    audio.addEventListener('timeupdate', () => {
        if (!audio.duration) return;
        const percent = (audio.currentTime / audio.duration) * 100;
        progressBar.value = percent;
        progressFill.style.width = percent + '%';
        currentTimeEl.textContent = formatTime(audio.currentTime);
    });

    audio.addEventListener('loadedmetadata', () => {
        durationEl.textContent = formatTime(audio.duration);
        progressBar.max = 100;
        progressBar.value = 0;
        progressFill.style.width = '0%';
    });

    progressBar.addEventListener('input', () => {
        const seekTime = (progressBar.value / 100) * audio.duration;
        audio.currentTime = seekTime;
        progressFill.style.width = progressBar.value + '%';
    });

    audio.addEventListener('ended', () => {
        if (repeat === 'one') {
            audio.currentTime = 0;
            audio.play();
        } else {
            nextTrack();
        }
    });

    audio.addEventListener('play', () => updatePlayPauseIcon(true));
    audio.addEventListener('pause', () => updatePlayPauseIcon(false));

    // ---------- ГРОМКОСТЬ ----------
    function updateVolumeUI() {
        const vol = audio.volume;
        volumeBar.value = vol * 100;
        volumeFill.style.width = (vol * 100) + '%';
        if (vol === 0) {
            volumeOnIcon.style.display = 'none';
            volumeOffIcon.style.display = 'block';
        } else {
            volumeOnIcon.style.display = 'block';
            volumeOffIcon.style.display = 'none';
        }
    }

    volumeBar.addEventListener('input', () => {
        const vol = volumeBar.value / 100;
        audio.volume = vol;
        volumeFill.style.width = volumeBar.value + '%';
        updateVolumeUI();
    });

    volumeBtn.addEventListener('click', () => {
        if (audio.volume > 0) {
            lastVolume = audio.volume;
            audio.volume = 0;
        } else {
            audio.volume = lastVolume || 0.7;
        }
        updateVolumeUI();
    });

    // ---------- ЗАКРЫТИЕ МОДАЛОК ----------
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
        if (e.target === imageModal) imageModal.classList.add('hidden');
    });

    if (closeImageModal) {
        closeImageModal.addEventListener('click', () => imageModal.classList.add('hidden'));
    }

    // ========== СТРАНИЦА АРТИСТА ==========
    function showArtistPage(artistName) {
        const artistAlbums = allAlbums.filter(album => album.artist === artistName);
        if (artistAlbums.length === 0) return;

        const artistEntry = artistsMap[artistName];
        const avatarFile = artistEntry ? artistEntry.avatar : getLatestAlbumCover(artistName);
        artistAvatar.src = `photo/${avatarFile}`;
        artistAvatar.onerror = () => { artistAvatar.src = 'photo/placeholder.jpg'; };
        artistNameElem.textContent = artistName;

        const allTracks = [];
        artistAlbums.forEach(album => {
            album.tracks.forEach(track => {
                allTracks.push({
                    ...track,
                    artist: album.artist,
                    cover: album.cover,
                    albumTitle: album.title
                });
            });
        });

        const parsePlays = (str) => parseInt(str.replace(/\s/g, ''), 10) || 0;
        const topTracks = allTracks
            .sort((a, b) => parsePlays(b.plays) - parsePlays(a.plays))
            .slice(0, 5);

        popularTracksList.innerHTML = '';
        topTracks.forEach((track, idx) => {
            const row = document.createElement('li');
            row.className = 'track-row';
            row.innerHTML = `
                <img class="track-cover" src="photo/${track.cover}" alt="" onerror="this.style.display='none'">
                <span class="track-num">${idx + 1}</span>
                <span class="track-title-col">${track.title}</span>
                <span class="track-plays">${track.plays || ''}</span>
                <span class="track-duration">${track.duration || ''}</span>
            `;
            row.addEventListener('click', () => {
                stopGlobalShuffle();
                const albumOfTrack = artistAlbums.find(alb =>
                    alb.tracks.some(t => t.file === track.file)
                );
                if (albumOfTrack) {
                    currentAlbum = albumOfTrack;
                    const trackIndex = albumOfTrack.tracks.findIndex(t => t.file === track.file);
                    playTrackByIndex(trackIndex);
                }
            });
            popularTracksList.appendChild(row);
        });

        artistPlayBtn.onclick = () => {
            stopGlobalShuffle();
            if (topTracks.length > 0) {
                const firstTrack = topTracks[0];
                const albumOfTrack = artistAlbums.find(alb =>
                    alb.tracks.some(t => t.file === firstTrack.file)
                );
                if (albumOfTrack) {
                    currentAlbum = albumOfTrack;
                    const idx = albumOfTrack.tracks.findIndex(t => t.file === firstTrack.file);
                    playTrackByIndex(idx);
                }
            }
        };

        artistAlbumsGrid.innerHTML = '';
        artistAlbums.forEach(album => {
            const type = getAlbumType(album.tracks.length);
            const card = document.createElement('div');
            card.className = 'album-card';
            card.innerHTML = `
                <img src="photo/${album.cover}" alt="${album.title}" onerror="this.src='photo/placeholder.jpg'">
                <div class="title">${album.title}</div>
                <div class="artist">${album.artist}</div>
                <div class="type">${type}</div>
                <div class="date">${album.date || ''}</div>
            `;
            card.addEventListener('click', () => {
                stopGlobalShuffle();
                openModal(album, type);
            });
            artistAlbumsGrid.appendChild(card);
        });

        mainContent.classList.add('hidden');
        artistPage.classList.remove('hidden');
        window.scrollTo(0, 0);
    }

    // ---------- БАННЕР РЕКОМЕНДАЦИЙ ----------
    recommendBanner.addEventListener('click', (e) => {
        if (e.target !== recommendPlayBtn && !recommendPlayBtn.contains(e.target)) {
            startGlobalShuffle();
        }
    });

    recommendPlayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        startGlobalShuffle();
    });

    // ---------- ОБРАБОТЧИКИ ПЛЕЕРА ----------
    playerArtist.addEventListener('click', () => {
        if (!currentAlbum) return;
        stopGlobalShuffle();
        showArtistPage(currentAlbum.artist);
    });

    playerCover.addEventListener('click', () => {
        if (!currentAlbum) return;
        imageModalImg.src = `photo/${currentAlbum.cover}`;
        imageModal.classList.remove('hidden');
    });

    backBtn.addEventListener('click', () => {
        artistPage.classList.add('hidden');
        mainContent.classList.remove('hidden');
    });

    // Экспорт для совместимости (если нужно)
    window.playTrack = (track, album) => {
        stopGlobalShuffle();
        currentAlbum = album;
        const index = album.tracks.findIndex(t => t.file === track.file);
        if (index !== -1) playTrackByIndex(index);
    };
});
