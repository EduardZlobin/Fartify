document.addEventListener('DOMContentLoaded', () => {
    // ---------- ОСНОВНЫЕ DOM-ЭЛЕМЕНТЫ ----------
    const mainContent = document.getElementById('main-content');
    const artistPage = document.getElementById('artist-page');
    const backBtn = document.getElementById('back-btn');
    const artistAvatar = document.getElementById('artist-avatar');
    const artistNameElem = document.getElementById('artist-name');
    const artistPlayBtn = document.getElementById('artist-play-btn');
    const popularTracksList = document.getElementById('popular-tracks-list');
    const artistAlbumsGrid = document.getElementById('artist-albums-grid');

    const grid = document.getElementById('albums-grid');
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

    // Модальное окно для большой обложки
    const imageModal = document.getElementById('image-modal');
    const imageModalImg = document.getElementById('image-modal-img');
    const closeImageModal = imageModal ? imageModal.querySelector('.close') : null;

    // ---------- ГЛОБАЛЬНОЕ СОСТОЯНИЕ ----------
    let currentAlbum = null;
    let currentTrackIndex = 0;
    let shuffle = false;
    let repeat = 'none';
    let history = [];
    let lastVolume = 0.7;
    let allAlbums = [];

    // ---------- ИНИЦИАЛИЗАЦИЯ ----------
    audio.volume = 0.7;
    updateVolumeUI();

    fetch('data.json')
    .then(res => res.json())
    .then(data => {
        allAlbums = data;

        // Уникальные исполнители (по имени)
        const uniqueArtists = [];
        const seen = new Set();
        data.forEach(album => {
            if (!seen.has(album.artist)) {
                seen.add(album.artist);
                // Для аватарки берём обложку последнего альбома этого артиста (можно искать по всему массиву)
                const artistAlbums = data.filter(a => a.artist === album.artist);
                const lastAlbum = artistAlbums[artistAlbums.length - 1];
                uniqueArtists.push({
                    name: album.artist,
                    cover: lastAlbum.cover
                });
            }
        });

        // Перемешиваем альбомы для "Для вас"
        const shuffled = [...data].sort(() => Math.random() - 0.5);

        renderArtists(uniqueArtists);
        renderAlbums(shuffled); // уже есть функция renderAlbums, она заполнит #albums-grid
    })
    .catch(err => console.error('Ошибка загрузки data.json:', err));

    // ---------- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ----------
    function renderArtists(artists) {
    const artistsGrid = document.getElementById('artists-grid');
    artistsGrid.innerHTML = '';
    artists.forEach(artist => {
        const card = document.createElement('div');
        card.className = 'artist-card';
        card.innerHTML = `
            <img src="photo/${artist.cover}" alt="${artist.name}" onerror="this.src='photo/placeholder.jpg'">
            <div class="artist-name">${artist.name}</div>
        `;
        card.addEventListener('click', () => {
            showArtistPage(artist.name);
        });
        artistsGrid.appendChild(card);
    });
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

    // ---------- ОТРИСОВКА СЕТКИ АЛЬБОМОВ ----------
    function renderAlbums(albums) {
        grid.innerHTML = '';
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
            card.addEventListener('click', () => openModal(album, type));
            grid.appendChild(card);
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
                playTrackByIndex(index);
                modal.classList.add('hidden');
            });
            modalTracks.appendChild(row);
        });

        modalFooterDate.textContent = date ? date : '';
        modalFooterLabel.textContent = album.label || '';

        modal.classList.remove('hidden');
    }

    // ---------- ПРОИГРЫВАНИЕ ----------
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

    // ---------- УПРАВЛЕНИЕ ПЛЕЕРОМ ----------
    function togglePlay() {
        if (!audio.src) return;
        if (audio.paused) { audio.play(); updatePlayPauseIcon(true); }
        else { audio.pause(); updatePlayPauseIcon(false); }
    }

    function nextTrack() {
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

    // ---------- ЗАКРЫТИЕ МОДАЛКИ АЛЬБОМА ----------
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });

    // ========== СТРАНИЦА АРТИСТА ==========
    function showArtistPage(artistName) {
        const artistAlbums = allAlbums.filter(album => album.artist === artistName);
        if (artistAlbums.length === 0) return;

        const lastAlbum = artistAlbums[artistAlbums.length - 1];
        artistAvatar.src = `photo/${lastAlbum.cover}`;
        artistAvatar.onerror = () => { artistAvatar.src = 'photo/placeholder.jpg'; };
        artistNameElem.textContent = artistName;

        // Собираем все треки артиста
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

        // Сортировка по прослушиваниям (числовое значение)
        const parsePlays = (str) => parseInt(str.replace(/\s/g, ''), 10) || 0;
        const topTracks = allTracks
            .sort((a, b) => parsePlays(b.plays) - parsePlays(a.plays))
            .slice(0, 5);

        // Популярные треки
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
                const albumOfTrack = artistAlbums.find(alb =>
                    alb.tracks.some(t => t.file === track.file)
                );
                if (albumOfTrack) {
                    currentAlbum = albumOfTrack;
                    const trackIndex = albumOfTrack.tracks.findIndex(t => t.file === track.file);
                    playTrackByIndex(trackIndex);
                    // НЕ закрываем страницу артиста
                }
            });
            popularTracksList.appendChild(row);
        });

        // Кнопка Play: запускает первый трек из топа
        artistPlayBtn.onclick = () => {
            if (topTracks.length > 0) {
                const firstTrack = topTracks[0];
                const albumOfTrack = artistAlbums.find(alb =>
                    alb.tracks.some(t => t.file === firstTrack.file)
                );
                if (albumOfTrack) {
                    currentAlbum = albumOfTrack;
                    const idx = albumOfTrack.tracks.findIndex(t => t.file === firstTrack.file);
                    playTrackByIndex(idx);
                    // Страница не закрывается
                }
            }
        };

        // Альбомы артиста
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
            card.addEventListener('click', () => openModal(album, type));
            artistAlbumsGrid.appendChild(card);
        });

        // Переключаемся на страницу артиста
        mainContent.classList.add('hidden');
        artistPage.classList.remove('hidden');
        window.scrollTo(0, 0);
    }

    // Обработчик клика по имени артиста в плеере
    playerArtist.addEventListener('click', () => {
        if (!currentAlbum) return;
        showArtistPage(currentAlbum.artist);
    });

    // Обработчик клика по обложке в плеере (увеличение)
    playerCover.addEventListener('click', () => {
        if (!currentAlbum) return;
        imageModalImg.src = `photo/${currentAlbum.cover}`;
        imageModal.classList.remove('hidden');
    });

    // Закрытие модалки с картинкой
    if (closeImageModal) {
        closeImageModal.addEventListener('click', () => {
            imageModal.classList.add('hidden');
        });
    }
    window.addEventListener('click', (e) => {
        if (e.target === imageModal) imageModal.classList.add('hidden');
    });

    // Кнопка «На главную»
    backBtn.addEventListener('click', () => {
        artistPage.classList.add('hidden');
        mainContent.classList.remove('hidden');
    });

    // Экспорт для совместимости
    window.playTrack = (track, album) => {
        currentAlbum = album;
        const index = album.tracks.findIndex(t => t.file === track.file);
        if (index !== -1) playTrackByIndex(index);
    };
});