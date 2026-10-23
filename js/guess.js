// js/guess.js

let guessGame = {
    round: 1,
    totalRounds: 10,
    score: 0,
    currentTrack: null,
    snippetLevel: 0, // 0: 1s, 1: 3s, 2: 5s, 3: 8s, 4: 13s
    snippets: [1, 3, 5, 8, 13],
    isPlaying: false,
    playedFiles: new Set(),
    audioObj: new Audio(),
    bestScoreKey: 'fartify_guess_best_score',
    history: [] // Для записи результатов
};

function startGuessPage() {
    document.getElementById('guess-page').classList.remove('hidden');
    document.getElementById('main-content').classList.add('hidden');
    document.getElementById('artist-page').classList.add('hidden');
    document.getElementById('reviews-page').classList.add('hidden');
    document.getElementById('player').classList.remove('hidden');
    
    // Блокируем глобальный поиск и плеер
    document.body.classList.add('guessing-mode');

    // Пауза основного плеера
    if (typeof audio !== 'undefined') audio.pause();
    
    updateSidebarActive();
    initGuessGame();
}

function initGuessGame() {
    guessGame.round = 1;
    guessGame.score = 0;
    guessGame.playedFiles.clear();
    guessGame.history = [];
    
    document.getElementById('guess-end-screen').classList.add('hidden');
    document.getElementById('guess-input').value = '';
    document.getElementById('guess-input').disabled = false;
    document.getElementById('guess-input').style.display = 'block';
    document.querySelector('.guess-skip-row').style.display = 'flex';
    
    nextGuessRound();
}

function nextGuessRound() {
    if (guessGame.round > guessGame.totalRounds) {
        endGuessGame();
        return;
    }

    document.getElementById('guess-round').textContent = `Раунд ${guessGame.round} / ${guessGame.totalRounds}`;
    document.getElementById('guess-score').textContent = guessGame.score;
    document.getElementById('guess-result-msg').classList.add('hidden');
    document.getElementById('guess-text-info').classList.remove('show');
    document.getElementById('guess-cover').classList.remove('show');
    document.getElementById('guess-input').value = '';
    document.getElementById('guess-input').disabled = false;
    document.getElementById('guess-autocomplete').classList.add('hidden');
    
    // Сброс прогресса
    guessGame.snippetLevel = 0;
    updateSnippetUI();

    // Выбираем случайный трек
    const allTracks = [];
    allAlbums.forEach(album => {
        album.tracks.forEach(t => {
            if (t.file && !guessGame.playedFiles.has(t.file)) {
                allTracks.push({ ...t, artist: album.artist, albumTitle: album.title });
            }
        });
    });

    if (allTracks.length === 0) {
        guessGame.playedFiles.clear();
        return nextGuessRound();
    }

    const randomTrack = allTracks[Math.floor(Math.random() * allTracks.length)];
    guessGame.currentTrack = randomTrack;
    guessGame.playedFiles.add(randomTrack.file);

    // Настраиваем аудио
    guessGame.audioObj.src = randomTrack.file.startsWith('http') ? randomTrack.file : `music/${randomTrack.file}`;
    guessGame.audioObj.volume = 0.8;
    
    document.getElementById('guess-play-btn').disabled = false;
    document.getElementById('guess-current-time').textContent = '0:00';
    document.getElementById('guess-progress-fill').style.width = '0%';
    document.getElementById('guess-progress-fill').style.transition = 'none';
}

function updateSnippetUI() {
    const time = guessGame.snippets[guessGame.snippetLevel];
    document.getElementById('guess-total-time').textContent = `0:${time.toString().padStart(2, '0')}`;
    
    // Закрашиваем сегменты
    const segments = document.querySelectorAll('.guess-segment');
    segments.forEach((seg, index) => {
        if (index <= guessGame.snippetLevel) {
            seg.style.background = 'rgba(var(--accent-c1), 0.3)';
            seg.style.color = '#fff';
        } else {
            seg.style.background = 'transparent';
            seg.style.color = 'rgba(255,255,255,0.2)';
        }
    });
}

function playGuessSnippet() {
    if (!guessGame.currentTrack || guessGame.isPlaying) return;
    
    guessGame.isPlaying = true;
    document.getElementById('guess-play-btn').disabled = true;
    guessGame.audioObj.currentTime = 0;
    
    // Возобновляем AudioContext если нужно
    guessGame.audioObj.play().catch(e => console.warn(e));

    const maxTime = guessGame.snippets[guessGame.snippetLevel];
    const startTime = performance.now();
    const fillEl = document.getElementById('guess-progress-fill');
    
    // Сбрасываем и запускаем анимацию заполнения
    fillEl.style.transition = 'none';
    fillEl.style.width = '0%';
    
    requestAnimationFrame(() => {
        fillEl.style.transition = `width ${maxTime}s linear`;
        fillEl.style.width = '100%';
    });

    function updateTimeDisplay() {
        const elapsed = (performance.now() - startTime) / 1000;
        const current = Math.min(elapsed, maxTime);
        document.getElementById('guess-current-time').textContent = `0:0${Math.floor(current)}`;

        if (elapsed < maxTime) {
            requestAnimationFrame(updateTimeDisplay);
        } else {
            guessGame.audioObj.pause();
            guessGame.isPlaying = false;
            document.getElementById('guess-play-btn').disabled = false;
        }
    }
    
    requestAnimationFrame(updateTimeDisplay);
}

function handleGuessFail() {
    // Если это был не последний уровень отрывка
    if (guessGame.snippetLevel < guessGame.snippets.length - 1) {
        guessGame.snippetLevel++;
        updateSnippetUI();
        document.getElementById('guess-result-msg').textContent = `Неверно! Теперь слушаем ${guessGame.snippets[guessGame.snippetLevel]} секунд.`;
        document.getElementById('guess-result-msg').className = 'guess-result-msg error';
        document.getElementById('guess-result-msg').classList.remove('hidden');
        document.getElementById('guess-input').value = '';
        
        // Автоматически проигрываем новый отрывок
        setTimeout(() => playGuessSnippet(), 500);
    } else {
        // Если это была последняя попытка (13 секунд)
        guessGame.history.push({
            title: guessGame.currentTrack.title,
            score: 0,
            time: guessGame.snippets[guessGame.snippetLevel]
        });
        showGuessResult(`Пропущено! Это был трек: ${guessGame.currentTrack.title}`, 'error');
        revealGuessTrack();
    }
}

function skipGuess() {
    if (!guessGame.currentTrack) return;
    handleGuessFail();
}

// ★ УМНЫЙ ПОИСК (Автодополнение)
document.getElementById('guess-input')?.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    const acEl = document.getElementById('guess-autocomplete');
    
    if (query.length < 2) {
        acEl.classList.add('hidden');
        return;
    }

    // Используем глобальную функцию поиска
    const results = performSearch(query);
    
    // Нам нужны только треки
    const tracks = results.tracks;
    
    if (tracks.length === 0) {
        acEl.innerHTML = '<div class="guess-ac-item" style="color:var(--text-muted)">Ничего не найдено</div>';
        acEl.classList.remove('hidden');
        return;
    }

    acEl.innerHTML = '';
    tracks.forEach(track => {
        const div = document.createElement('div');
        div.className = 'guess-ac-item';
        
        const coverFile = resolveTrackCover(track, null);
        const coverUrl = coverFile.startsWith('http') ? coverFile : `photo/${coverFile}`;

        div.innerHTML = `
            <img class="guess-ac-cover" src="${coverUrl}" alt="">
            <div class="guess-ac-info">
                <div class="guess-ac-title">${escapeHtml(track.title)}</div>
                <div class="guess-ac-artist">${escapeHtml(track.artist)}</div>
            </div>
        `;
        
        div.addEventListener('click', () => {
            document.getElementById('guess-input').value = track.title;
            acEl.classList.add('hidden');
            submitGuess(track);
        });
        
        acEl.appendChild(div);
    });
    
    acEl.classList.remove('hidden');
});

// Скрываем автодополнение при клике вне
document.addEventListener('click', (e) => {
    if (!e.target.closest('.guess-input-container')) {
        document.getElementById('guess-autocomplete')?.classList.add('hidden');
    }
});

function submitGuess(track) {
    if (!guessGame.currentTrack) return;
    
    // Проверяем, совпадает ли выбранный трек с загаданным
    if (track.file === guessGame.currentTrack.file) {
        // Угадал
        const points = [5, 4, 3, 2, 1][guessGame.snippetLevel] || 1;
        guessGame.score += points;
        guessGame.history.push({
            title: guessGame.currentTrack.title,
            score: points,
            time: guessGame.snippets[guessGame.snippetLevel]
        });
        showGuessResult(`Верно! +${points} очков`, 'success');
        revealGuessTrack();
    } else {
        // Ошибся (выбрал не тот трек)
        handleGuessFail();
    }
}

function revealGuessTrack() {
    document.getElementById('guess-play-btn').disabled = true;
    document.getElementById('guess-input').disabled = true;
    document.querySelector('.guess-skip-row').style.display = 'none';
    
    // Показываем обложку и название
    const coverFile = resolveTrackCover(guessGame.currentTrack, null);
    const coverUrl = coverFile.startsWith('http') ? coverFile : `photo/${coverFile}`;
    
    const coverEl = document.getElementById('guess-cover');
    coverEl.style.backgroundImage = `url('${coverUrl}')`;
    coverEl.classList.add('show');
    
    document.getElementById('guess-track-title').textContent = guessGame.currentTrack.title;
    document.getElementById('guess-track-artist').textContent = guessGame.currentTrack.artist;
    document.getElementById('guess-text-info').classList.add('show');

    // Переход к следующему раунду
    setTimeout(() => {
        guessGame.round++;
        nextGuessRound();
    }, 3000);
}

function showGuessResult(text, type) {
    const msg = document.getElementById('guess-result-msg');
    msg.textContent = text;
    msg.className = `guess-result-msg ${type}`;
    msg.classList.remove('hidden');
}

function endGuessGame() {
    document.body.classList.remove('guessing-mode');
    document.getElementById('guess-autocomplete').classList.add('hidden');
    document.getElementById('guess-text-info').classList.remove('show');
    document.getElementById('guess-cover').classList.remove('show');
    
    const endScreen = document.getElementById('guess-end-screen');
    endScreen.classList.remove('hidden');
    
    document.getElementById('guess-final-score').textContent = guessGame.score;
    
    // Сохраняем рекорд
    const best = parseInt(localStorage.getItem(guessGame.bestScoreKey) || '0', 10);
    if (guessGame.score > best) {
        localStorage.setItem(guessGame.bestScoreKey, guessGame.score);
        document.getElementById('guess-best-score').textContent = guessGame.score;
    } else {
        document.getElementById('guess-best-score').textContent = best;
    }

    // Рендерим список результатов
    const list = document.getElementById('guess-results-list');
    list.innerHTML = '';
    guessGame.history.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="res-title">${index + 1}. ${escapeHtml(item.title)}</span>
            <span class="res-score">${item.score > 0 ? `+${item.score} (${item.time}с)` : 'Пропущен'}</span>
        `;
        list.appendChild(li);
    });
}

// Обработчики
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('guess-play-btn')?.addEventListener('click', playGuessSnippet);
    document.getElementById('guess-skip-btn')?.addEventListener('click', skipGuess);
    document.getElementById('guess-restart-btn')?.addEventListener('click', initGuessGame);
});

// ★ Функция для выхода из игры и разблокировки сайта
function stopGuessGame() {
    document.body.classList.remove('guessing-mode');
    
    if (guessGame && guessGame.audioObj) {
        guessGame.audioObj.pause();
        guessGame.isPlaying = false;
    }
}