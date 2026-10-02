// ============================================================
// js/albums.js — карточки релизов и модалка альбома
// ============================================================

// ---------- Критики ----------
function getCriticsRating(albumTitle) {
    if (!criticsData.length) return null;
    const ratings = [];
    criticsData.forEach(critic => {
        if (critic.albums) {
            critic.albums.forEach(entry => {
                if (entry.album === albumTitle && typeof entry.rating === 'number') {
                    ratings.push({ critic: critic.critic, rating: entry.rating, review: entry.review || '' });
                }
            });
        }
    });
    if (ratings.length === 0) return null;
    const avg = ratings.reduce((s, r) => s + r.rating, 0) / ratings.length;
    return { average: Math.round(avg * 10) / 10, reviews: ratings };
}

function showCriticsForAlbum(albumTitle) {
    const info = getCriticsRating(albumTitle);
    if (info) {
        modalRating.textContent = info.average.toFixed(1) + '/10';
        modalRating.style.cursor = 'pointer';
        modalRating.onclick = () => {
            modalCritics.classList.toggle('hidden');
            if (!modalCritics.classList.contains('hidden')) {
                modalCriticsList.innerHTML = '';
                info.reviews.forEach(r => {
                    const li = document.createElement('li');
                    li.innerHTML = `<div class="critic-name">${r.critic} <span class="critic-rating">${r.rating}/10</span></div>
                                     <div class="critic-review">${r.review}</div>`;
                    modalCriticsList.appendChild(li);
                });
            }
        };
    } else {
        modalRating.textContent = '';
        modalRating.onclick = null;
        modalCritics.classList.add('hidden');
    }
}

// ---------- Play-кнопка карточки ----------
function handleCardPlayClick(album) {
    const isThisAlbum = currentAlbum
        && !currentAlbum.isPlaylist
        && currentAlbum.title === album.title
        && currentAlbum.artist === album.artist
        && !isGlobalShuffle;
    if (isThisAlbum) {
        if (audio.paused) audio.play();
        else audio.pause();
    } else {
        playAlbumFromModal(album, shuffle ? Math.floor(Math.random() * album.tracks.length) : 0);
    }
}

// ---------- Отрисовка карточек ----------
function renderAlbums(albums) {
    albumsGrid.innerHTML = '';
    albums.forEach(album => {
        const type = getAlbumType(album.tracks.length);
        const isNew = isFreshRelease(album.date);
        const card = document.createElement('a');
        card.className = 'album-card';
        card.href = BASE_PATH + 'release/' + encodeURIComponent(album.title);
        card.dataset.albumTitle = album.title;
        card.dataset.albumArtist = album.artist;
        card.innerHTML = `
            <span class="release-type-badge ${isNew ? 'is-new' : ''}">
                <span class="badge-new">Новое</span>
                <span class="badge-type">${type}</span>
            </span>
            <img src="photo/${album.cover}" alt="${album.title}" onerror="this.src='photo/placeholder.jpg'">
            <button class="album-play-btn" title="Играть">${getPlaySvg(20)}</button>
            <div class="title">${album.title}</div>
            <div class="artist">${album.artist}</div>
            <div class="date">${album.date || ''}</div>
        `;
        card.querySelector('.album-play-btn').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleCardPlayClick(album);
        });
        albumsGrid.appendChild(card);
    });
    callFitAfterRender();
    updatePlaybackUI();
}

// ---------- Модалка альбома ----------
function openModal(album, type) {
    const releasePath = BASE_PATH + 'release/' + encodeURIComponent(album.title);
    safePushState(releasePath);
    openedModalAlbum = album;

    modalCover.src = `photo/${album.cover}`;
    modalCover.onerror = () => { modalCover.src = 'photo/placeholder.jpg'; };
    modalTitle.textContent = album.title;
    modalTypeLabel.textContent = type;

    const trackCount = album.tracks.length;
    const totalDuration = getTotalDuration(album.tracks);
    const date = album.date || '';
    const artist = album.artist;

        modalMeta.innerHTML = `
            <span class="modal-artist-link" data-artist="${escapeHtml(artist)}">${escapeHtml(artist)}</span>
            <span class="separator">•</span>
            <span>${date}</span>
            <span class="separator">•</span>
            <span>${trackCount} трек${trackCount !== 1 ? 'а' : ''}</span>
            <span class="separator">•</span>
            <span>${totalDuration}</span>
        `;

        // ★ Клик по имени исполнителя → открыть карточку артиста
        const artistLink = modalMeta.querySelector('.modal-artist-link');
        if (artistLink) {
            artistLink.addEventListener('click', (e) => {
                e.stopPropagation();
                const name = artistLink.dataset.artist;
                if (!name) return;
                modal.classList.add('hidden');
                openedModalAlbum = null;
                stopGlobalShuffle();
                showArtistPage(name);
            });
        }

    showCriticsForAlbum(album.title);

    modalPlayBtn.onclick = () => {
        const isThisAlbum = currentAlbum
            && !currentAlbum.isPlaylist
            && currentAlbum.title === openedModalAlbum.title
            && currentAlbum.artist === openedModalAlbum.artist
            && !isGlobalShuffle;
        if (isThisAlbum) {
            if (audio.paused) audio.play();
            else audio.pause();
        } else {
            playAlbumFromModal(album, 0);
        }
    };

    const modalShareBtn = document.getElementById('modal-share-btn');
    if (modalShareBtn) {
        modalShareBtn.onclick = () => {
            if (window.fartifyShare && typeof window.fartifyShare.release === 'function') {
                window.fartifyShare.release(album, type);
            }
        };
    }

    modalTracks.innerHTML = '';
    album.tracks.forEach((track, index) => {
        const row = document.createElement('li');
        row.className = 'track-row';
        row.dataset.file = track.file;
        row.dataset.artist = album.artist;
        if (isBlocked(track.file)) row.classList.add('is-blocked');
        const isFav = isFavorite({
            file: track.file, title: track.title, artist: album.artist,
            cover: album.cover, albumTitle: album.title,
            duration: track.duration, plays: track.plays
        });
            row.innerHTML = `
                <span class="track-num">${index + 1}</span>
                <div class="track-title-col">
                    <span class="track-title-main">${escapeHtml(track.title)}</span>
                    <span class="track-artist-sub">${escapeHtml(formatTrackArtists(track.file, album.artist))}</span>
                </div>
                <span class="track-plays">${track.plays || ''}</span>
            <span class="track-duration">${track.duration || ''}</span>
            <button class="favorite-btn ${isFav ? 'active' : ''}" data-file="${track.file}" data-artist="${album.artist}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
            </button>
        `;
        const favBtn = row.querySelector('.favorite-btn');
        favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite({
                file: track.file, title: track.title, artist: album.artist,
                cover: album.cover, albumTitle: album.title,
                duration: track.duration, plays: track.plays
            });
        });
        row.addEventListener('click', (e) => {
            e.stopPropagation();
            const isSame = currentAlbum
                && !currentAlbum.isPlaylist
                && currentAlbum.title === album.title
                && currentAlbum.artist === album.artist
                && currentTrackIndex === index
                && !isGlobalShuffle;
            if (isSame) {
                if (audio.paused) audio.play();
                else audio.pause();
            } else {
                playAlbumFromModal(album, index);
            }
        });
        modalTracks.appendChild(row);
    });

    modalFooterDate.textContent = date ? date : '';
    modalFooterLabel.textContent = album.label || '';
    modalCritics.classList.add('hidden');
    modal.classList.remove('hidden');
    updatePlaybackUI();
}

function playAlbumFromModal(album, index = 0) {
    clearManualContext();
    stopGlobalShuffle();
    currentAlbum = album;
    playTrackByIndex(index);
    addToRecent(album);
}

function closeAlbumAndRestoreUrl() {
    modal.classList.add('hidden');
    openedModalAlbum = null;
    restorePreviousUrl();
    updatePlaybackUI();
}

// ---------- URL для возврата после закрытия модалки ----------
function restorePreviousUrl() {
    if (previousPath && window.location.pathname + window.location.search !== previousPath) {
        safePushState(previousPath);
    }
}

// ---------- Обработчики ----------
function setupAlbumsEvents() {
    closeBtn.addEventListener('click', closeAlbumAndRestoreUrl);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeAlbumAndRestoreUrl();
    });
}