// ============================================================
// js/search.js — поиск с fuzzy-совпадениями и транслитерацией
// ============================================================

const CYR_TO_LAT = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z',
    'и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
    'с':'s','т':'t','у':'u','ф':'f','х':'x','ц':'ts','ч':'ch','ш':'sh','щ':'shch',
    'ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
    'і':'i','ї':'yi','є':'ye','ґ':'g'
};
const LAT_TO_CYR = {
    'a':'а','b':'б','c':'ц','d':'д','e':'е','f':'ф','g':'г','h':'х','i':'и',
    'j':'й','k':'к','l':'л','m':'м','n':'н','o':'о','p':'п','q':'к','r':'р',
    's':'с','t':'т','u':'у','v':'в','w':'в','x':'х','y':'и','z':'з'
};

function normalizeStr(s) {
    return String(s)
        .toLowerCase()
        .replace(/[&,.!?;:()\[\]{}\-_/\\'"`«»""''…]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function cyrToLat(str) {
    let out = '';
    for (const ch of str) out += (CYR_TO_LAT[ch] !== undefined ? CYR_TO_LAT[ch] : ch);
    return out;
}

function latToCyr(str) {
    let out = '';
    for (const ch of str) out += (LAT_TO_CYR[ch] !== undefined ? LAT_TO_CYR[ch] : ch);
    return out;
}

function generateVariants(str) {
    const set = new Set();
    const add = (v) => { if (v && v.length) set.add(v); };
    const norm = str.toLowerCase();

    add(norm);
    add(norm.replace(/\s+/g, ''));

    if (/[а-яёіїєґ]/.test(norm)) {
        const lat = cyrToLat(norm);
        add(lat);
        add(lat.replace(/\s+/g, ''));
    }
    if (/[a-z]/.test(norm)) {
        const cyr = latToCyr(norm);
        add(cyr);
        add(cyr.replace(/\s+/g, ''));
    }

    return Array.from(set);
}

function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const m = a.length, n = b.length;
    const prev = new Array(n + 1);
    const curr = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
        curr[0] = i;
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
        }
        for (let j = 0; j <= n; j++) prev[j] = curr[j];
    }
    return prev[n];
}

function fuzzyScore(query, target) {
    const q = normalizeStr(query);
    const t = normalizeStr(target);
    if (!q || !t) return 0;

    if (t.includes(q)) {
        return 0.95 + Math.min(0.05, q.length / Math.max(t.length, 1) * 0.1);
    }
    if (q.includes(t)) return 0.9;

    const qVariants = generateVariants(q);
    const tVariants = generateVariants(t);

    let best = 0;

    for (const qv of qVariants) {
        for (const tv of tVariants) {
            const lenDiff = Math.abs(qv.length - tv.length);
            const maxLen = Math.max(qv.length, tv.length);
            if (maxLen === 0) continue;
            if (lenDiff / maxLen > 0.7) continue;

            if (tv.includes(qv) || qv.includes(tv)) {
                const ratio = Math.min(qv.length, tv.length) / maxLen;
                best = Math.max(best, 0.8 + ratio * 0.15);
                continue;
            }

            const qWords = qv.split(' ').filter(w => w.length >= 2);
            const tWords = tv.split(' ').filter(w => w.length >= 2);
            if (qWords.length > 1 && tWords.length > 0) {
                let matched = 0;
                for (const qw of qWords) {
                    const hit = tWords.some(tw => {
                        if (tw.includes(qw) || qw.includes(tw)) return true;
                        const ml = Math.max(qw.length, tw.length);
                        if (ml < 3) return false;
                        return levenshtein(qw, tw) / ml < 0.35;
                    });
                    if (hit) matched++;
                }
                const wordRatio = matched / qWords.length;
                if (wordRatio > 0) best = Math.max(best, wordRatio * 0.85);
            }

            const dist = levenshtein(qv, tv);
            const sim = 1 - dist / maxLen;
            if (sim > 0.45) best = Math.max(best, sim * 0.75);

            const qc = qv.replace(/\s+/g, '');
            const tc = tv.replace(/\s+/g, '');
            const mc = Math.max(qc.length, tc.length);
            if (mc > 0) {
                const distC = levenshtein(qc, tc);
                const simC = 1 - distC / mc;
                if (simC > 0.45) best = Math.max(best, simC * 0.8);
            }
        }
    }

    return best;
}

const SEARCH_MIN_SCORE = 0.32;

function performSearch(query) {
    const raw = query.trim();
    if (!raw) return { tracks: [], albums: [], artists: [] };

    const tracks = [];
    const albums = [];
    const artists = [];

    const seenFiles = new Set();
    const trackScores = [];
    allAlbums.forEach(album => {
        album.tracks.forEach(track => {
            if (seenFiles.has(track.file)) return;
            const sTitle = fuzzyScore(raw, track.title);
            const sArtist = fuzzyScore(raw, album.artist);
            const score = Math.max(sTitle, sArtist * 0.82);
            if (score >= SEARCH_MIN_SCORE) {
                seenFiles.add(track.file);
                trackScores.push({
                    score,
                        data: {
                            file: track.file,
                            title: track.title,
                            artist: album.artist,
                            cover: resolveTrackCover(track, album)
                        }
                });
            }
        });
    });
    trackScores.sort((a, b) => b.score - a.score);
    trackScores.slice(0, 5).forEach(x => tracks.push(x.data));

    const albumScores = [];
    allAlbums.forEach(album => {
        const sTitle = fuzzyScore(raw, album.title);
        const sArtist = fuzzyScore(raw, album.artist);
        const score = Math.max(sTitle, sArtist * 0.82);
        if (score >= SEARCH_MIN_SCORE) {
            albumScores.push({ score, data: album });
        }
    });
    albumScores.sort((a, b) => b.score - a.score);
    albumScores.slice(0, 5).forEach(x => albums.push(x.data));

    const seenArtists = new Set();
    const artistScores = [];
    allAlbums.forEach(album => {
        if (seenArtists.has(album.artist)) return;
        const score = fuzzyScore(raw, album.artist);
        if (score >= SEARCH_MIN_SCORE) {
            seenArtists.add(album.artist);
            const artistInfo = artistsMap[album.artist];
            artistScores.push({
                score,
                data: {
                    name: album.artist,
                    avatar: artistInfo ? artistInfo.avatar : getLatestAlbumCover(album.artist)
                }
            });
        }
    });
    artistScores.sort((a, b) => b.score - a.score);
    artistScores.slice(0, 5).forEach(x => artists.push(x.data));

    return { tracks, albums, artists };
}

function renderSearchResults(query) {
    const results = performSearch(query);
    const total = results.tracks.length + results.albums.length + results.artists.length;

    if (total === 0) {
        searchResults.innerHTML = `<div class="search-result-empty">Ничего не найдено по запросу «${escapeHtml(query)}»</div>`;
        searchResults.classList.remove('hidden');
        return;
    }

    let html = '';

    if (results.artists.length > 0) {
        html += `<div class="search-section-title">Исполнители</div>`;
        results.artists.forEach(artist => {
            html += `
                <div class="search-result-item" data-type="artist" data-name="${escapeHtml(artist.name)}">
                    <img class="search-result-avatar" src="photo/${artist.avatar}" onerror="this.src='photo/placeholder.jpg'" alt="">
                    <div class="search-result-info">
                        <div class="search-result-title">${escapeHtml(artist.name)}</div>
                        <div class="search-result-meta">
                            <span class="search-result-type">Исполнитель</span>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    if (results.albums.length > 0) {
        html += `<div class="search-section-title">Релизы</div>`;
        results.albums.forEach(album => {
            const type = getAlbumType(album.tracks.length);
            html += `
                <div class="search-result-item" data-type="album" data-title="${escapeHtml(album.title)}">
                    <img class="search-result-cover" src="photo/${album.cover}" onerror="this.src='photo/placeholder.jpg'" alt="">
                    <div class="search-result-info">
                        <div class="search-result-title">${escapeHtml(album.title)}</div>
                        <div class="search-result-meta">
                            <span class="search-result-type">${type}</span>
                            <span class="search-result-dot">•</span>
                            <span class="search-result-artist">${escapeHtml(album.artist)}</span>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    if (results.tracks.length > 0) {
        html += `<div class="search-section-title">Треки</div>`;
        results.tracks.forEach(track => {
            html += `
                <div class="search-result-item" data-type="track" data-file="${escapeHtml(track.file)}">
                    <img class="search-result-cover" src="photo/${track.cover}" onerror="this.src='photo/placeholder.jpg'" alt="">
                    <div class="search-result-info">
                        <div class="search-result-title">${escapeHtml(track.title)}</div>
                        <div class="search-result-meta">
                            <span class="search-result-type">Трек</span>
                            <span class="search-result-dot">•</span>
                            <span class="search-result-artist">${formatTrackArtistsHtml(track.file, track.artist)}</span>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    searchResults.innerHTML = html;
    searchResults.classList.remove('hidden');
}

function setupSearchEvents() {
    if (!searchInput || !searchResults) return;

    searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim();
        if (q.length === 0) {
            searchResults.classList.add('hidden');
            searchClear.classList.add('hidden');
            return;
        }
        searchClear.classList.remove('hidden');
        renderSearchResults(q);
    });

    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchResults.classList.add('hidden');
        searchClear.classList.add('hidden');
        searchInput.focus();
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.code === 'Escape') {
            searchResults.classList.add('hidden');
            searchInput.blur();
        }
    });

        searchResults.addEventListener('click', (e) => {
            if (e.target.closest('.artist-inline-link')) return;
            const item = e.target.closest('.search-result-item');
            if (!item) return;
            
        const type = item.dataset.type;

        const closeSearch = () => {
            searchResults.classList.add('hidden');
            searchInput.value = '';
            searchClear.classList.add('hidden');
        };

        if (type === 'artist') {
            const name = item.dataset.name;
            closeSearch();
            stopGlobalShuffle();
            showArtistPage(name);
        } else if (type === 'album') {
            const title = item.dataset.title;
            const album = allAlbums.find(a => a.title === title);
            if (album) {
                closeSearch();
                stopGlobalShuffle();
                openModal(album, getAlbumType(album.tracks.length));
            }
        } else if (type === 'track') {
            const file = item.dataset.file;
            for (const album of allAlbums) {
                const idx = album.tracks.findIndex(t => t.file === file);
                if (idx !== -1) {
                    closeSearch();
                    clearManualContext();
                    stopGlobalShuffle();
                    currentAlbum = album;
                    playTrackByIndex(idx);
                    break;
                }
            }
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-wrapper')) {
            searchResults.classList.add('hidden');
        }
    });
}