// js/dashboard.js

function openDashboard() {
    document.getElementById('dashboard-modal').classList.remove('hidden');
    // Если треков нет, добавляем один пустой
    if (document.getElementById('tracks-container').children.length === 0) {
        addTrackField();
    }
}

function addTrackField() {
    const container = document.getElementById('tracks-container');
    const div = document.createElement('div');
    div.className = 'track-upload-row';
    div.innerHTML = `
        <input type="text" class="dash-input track-title" placeholder="Название трека" required>
        <input type="file" class="dash-file track-audio" accept="audio/*" required>
    `;
    container.appendChild(div);
}

document.getElementById('add-track-btn')?.addEventListener('click', addTrackField);

document.getElementById('upload-release-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Загрузка...';
    submitBtn.disabled = true;

    try {
        const title = document.getElementById('rel-title').value;
        const artist = document.getElementById('rel-artist').value;
        const date = document.getElementById('rel-date').value;
        const label = document.getElementById('rel-label').value;
        const coverFile = document.getElementById('rel-cover').files[0];

        // 1. Загружаем обложку
        const coverExt = coverFile.name.split('.').pop();
        const coverName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${coverExt}`;
        const { data: coverData, error: coverErr } = await window.supabaseClient.storage
            .from('covers')
            .upload(coverName, coverFile);
        
        if (coverErr) throw coverErr;

        const coverUrl = window.supabaseClient.storage.from('covers').getPublicUrl(coverName).data.publicUrl;

        // 2. Создаем релиз в БД
        const { data: release, error: relErr } = await window.supabaseClient
            .from('releases')
            .insert({
                user_id: currentUser.id,
                title: title,
                artist: artist,
                cover_url: coverUrl,
                release_date: date,
                label: label
            })
            .select()
            .single();

        if (relErr) throw relErr;

        // 3. Загружаем треки
        const trackRows = document.querySelectorAll('.track-upload-row');
        let trackIndex = 1;

        for (const row of trackRows) {
            const trackTitle = row.querySelector('.track-title').value;
            const trackFile = row.querySelector('.track-audio').files[0];
            if (!trackFile) continue;

            const trackExt = trackFile.name.split('.').pop();
            const trackName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${trackExt}`;
            
            // Загружаем аудио
            const { error: audioErr } = await window.supabaseClient.storage
                .from('music')
                .upload(trackName, trackFile);
            
            if (audioErr) throw audioErr;

            const audioUrl = window.supabaseClient.storage.from('music').getPublicUrl(trackName).data.publicUrl;

            // Получаем длительность аудио
            const duration = await getAudioDuration(trackFile);

            // Сохраняем в БД
            await window.supabaseClient.from('tracks').insert({
                release_id: release.id,
                title: trackTitle,
                file_url: audioUrl,
                duration: duration,
                track_number: trackIndex
            });
            
            trackIndex++;
        }

        alert('Релиз успешно опубликован!');
        document.getElementById('dashboard-modal').classList.add('hidden');
        e.target.reset();
        document.getElementById('tracks-container').innerHTML = '';
        
        // Перезагружаем страницу, чтобы увидеть новый релиз (в будущем сделаем без перезагрузки)
        window.location.reload();

    } catch (err) {
        console.error(err);
        alert('Ошибка при загрузке: ' + err.message);
    } finally {
        submitBtn.textContent = 'Опубликовать релиз';
        submitBtn.disabled = false;
    }
});

// Вспомогательная функция для получения длительности
function getAudioDuration(file) {
    return new Promise((resolve) => {
        const audio = new Audio();
        audio.src = URL.createObjectURL(file);
        audio.onloadedmetadata = () => {
            const mins = Math.floor(audio.duration / 60);
            const secs = Math.floor(audio.duration % 60);
            resolve(`${mins}:${secs.toString().padStart(2, '0')}`);
        };
        audio.onerror = () => resolve('0:00');
    });
}