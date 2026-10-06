// ============================================================
// js/equalizer.js — 8-полосный эквалайзер на Web Audio API
// ============================================================

const EQ_BANDS = [
    { freq: 60,    label: '60',  type: 'lowshelf'  },
    { freq: 170,   label: '170', type: 'peaking'   },
    { freq: 310,   label: '310', type: 'peaking'   },
    { freq: 600,   label: '600', type: 'peaking'   },
    { freq: 1000,  label: '1K',  type: 'peaking'   },
    { freq: 3000,  label: '3K',  type: 'peaking'   },
    { freq: 6000,  label: '6K',  type: 'peaking'   },
    { freq: 12000, label: '12K', type: 'highshelf' },
];

const EQ_MAX_DB = 40;

const EQ_PRESETS = {
    flat:       { label: 'Flat',        gains: [0, 0, 0, 0, 0, 0, 0, 0] },
    bass:       { label: 'Bass Boost',  gains: [22, 18, 12, 5, 0, -2, -4, -4] },
    bassMax:    { label: 'Bass Max',    gains: [30, 28, 22, 12, 2, -3, -6, -6] },
    treble:     { label: 'Treble',      gains: [-6, -4, -2, 0, 4, 8, 14, 18] },
    loudness:   { label: 'Loudness',    gains: [20, 16, 8, 0, -4, -2, 8, 16] },
    rock:       { label: 'Rock',        gains: [14, 10, 6, 0, -2, 3, 10, 14] },
    pop:        { label: 'Pop',         gains: [-4, 0, 4, 8, 8, 5, 0, -4] },
    jazz:       { label: 'Jazz',        gains: [8, 5, 2, 3, 5, 8, 6, 4] },
    vocal:      { label: 'Vocal',       gains: [-6, -4, 0, 6, 10, 8, 5, 2] },
    electronic: { label: 'Electronic',  gains: [18, 14, 8, 0, -4, 5, 10, 14] },
};

// ---------- Глобальное состояние EQ ----------
if (!window.__fartifyEq) {
    window.__fartifyEq = {
        ctx: null, source: null, filters: [],
        enabled: false,
        gains: new Array(EQ_BANDS.length).fill(0),
        preset: 'flat',
        initAttempted: false,
        healthy: false,
    };
}
const EQ = window.__fartifyEq;

let _eqSliders = [];
let _eqBandFills = [];
let _eqBandLabels = [];

let eqBtn, eqPanel, eqCloseBtn, eqPowerBtn, eqBandsEl, eqPresetsEl, eqResetBtn, eqGainInfoEl;

// ---------- Состояние EQ ----------
function loadEqState() {
    try {
        const raw = localStorage.getItem('fartify_eq_state');
        if (!raw) return;
        const data = JSON.parse(raw);
        if (Array.isArray(data.gains) && data.gains.length === EQ_BANDS.length) {
            EQ.gains = data.gains.map(g => {
                const n = Number(g);
                return isNaN(n) ? 0 : Math.max(-EQ_MAX_DB, Math.min(EQ_MAX_DB, n));
            });
        }
        EQ.enabled = !!data.enabled;
        EQ.preset  = typeof data.preset === 'string' ? data.preset : 'flat';
    } catch (e) {}
}

function saveEqState() {
    try {
        localStorage.setItem('fartify_eq_state', JSON.stringify({
            enabled: EQ.enabled, gains: EQ.gains, preset: EQ.preset
        }));
    } catch (e) {}
}

// ---------- Создание аудио-графа ----------
async function initEqAudioGraph() {
    if (EQ.initAttempted) return EQ.healthy;
    EQ.initAttempted = true;

    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
        console.warn('[EQ] Web Audio не поддерживается');
        EQ.healthy = false;
        return false;
    }

    if (window.__fartifyAudioGraphCreated) {
        console.warn('[EQ] Граф уже создан другим кодом — EQ отключён, звук не тронут.');
        EQ.healthy = false;
        return false;
    }

    const wasPlaying = !audio.paused;
    const savedTime  = audio.currentTime;
    let ctx = null;

    try {
        audio.pause();

        ctx = new Ctx({ latencyHint: 'interactive' });

        const source = ctx.createMediaElementSource(audio);

        try {
            source.channelCount = 2;
            source.channelCountMode = 'explicit';
            source.channelInterpretation = 'speakers';
        } catch (_) {}

        const filters = EQ_BANDS.map((band, i) => {
            const f = ctx.createBiquadFilter();
            f.type = band.type;
            f.frequency.value = band.freq;
            if (band.type === 'peaking') f.Q.value = 0.7;
            f.gain.value = EQ.enabled ? EQ.gains[i] : 0;
            return f;
        });

        source.connect(filters[0]);
        for (let i = 0; i < filters.length - 1; i++) filters[i].connect(filters[i + 1]);

        // ★ Analyser для визуализатора — встраиваем прозрачно в конец цепочки.
        //   Он ничего не выводит, только «слушает» сигнал.
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.82;
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;

        filters[filters.length - 1].connect(analyser);
        analyser.connect(ctx.destination);

        EQ.analyser = analyser;

        if (ctx.state === 'suspended') {
            await ctx.resume();
        }

        audio.currentTime = savedTime;
        if (wasPlaying) {
            await audio.play().catch(() => {});
        }

        EQ.ctx = ctx;
        EQ.source = source;
        EQ.filters = filters;
        EQ.analyser = analyser;
        EQ.healthy = true;
        window.__fartifyAudioGraphCreated = true;

        console.info('[EQ] Граф собран. sampleRate:', ctx.sampleRate, '| state:', ctx.state);
        return true;

    } catch (e) {
        console.error('[EQ] Ошибка создания графа. Полный откат:', e);
        try { if (ctx) await ctx.close(); } catch (_) {}
        EQ.ctx = null;
        EQ.source = null;
        EQ.filters = [];
        EQ.healthy = false;
        try {
            audio.currentTime = savedTime;
            if (wasPlaying) audio.play().catch(() => {});
        } catch (_) {}
        return false;
    }
}

// ★ Публичный доступ к analyser для визуализатора.
// Если граф ещё не создан — создаём (прозрачно, звук не меняется).
async function getEqAnalyser() {
    if (EQ.analyser) return EQ.analyser;
    await initEqAudioGraph();
    return EQ.analyser || null;
}

// ---------- Применение gain ----------
function applyEqFilterGain(index, animate = true) {
    if (!EQ.healthy || !EQ.filters[index] || !EQ.ctx) return;
    const gainDb = EQ.enabled ? EQ.gains[index] : 0;
    const now = EQ.ctx.currentTime;
    const param = EQ.filters[index].gain;
    param.cancelScheduledValues(now);
    if (animate) {
        param.setValueAtTime(param.value, now);
        param.linearRampToValueAtTime(gainDb, now + 0.02);
    } else {
        param.value = gainDb;
    }
}

function applyAllEqGains(animate = true) {
    for (let i = 0; i < EQ_BANDS.length; i++) applyEqFilterGain(i, animate);
}

// ---------- Построение UI ----------
function buildEqUI() {
    eqPresetsEl.innerHTML = '';
    Object.keys(EQ_PRESETS).forEach(key => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'eq-preset';
        btn.dataset.preset = key;
        btn.textContent = EQ_PRESETS[key].label;
        btn.addEventListener('click', () => selectEqPreset(key));
        eqPresetsEl.appendChild(btn);
    });

    eqBandsEl.innerHTML = '';
    _eqSliders = [];
    _eqBandFills = [];
    _eqBandLabels = [];

    EQ_BANDS.forEach((band, i) => {
        const col = document.createElement('div');
        col.className = 'eq-band';

        const gainLabel = document.createElement('span');
        gainLabel.className = 'eq-band-gain';
        gainLabel.textContent = '0';

        const wrap = document.createElement('div');
        wrap.className = 'eq-slider-wrap';

        const track = document.createElement('div');
        track.className = 'eq-slider-track';

        const fill = document.createElement('div');
        fill.className = 'eq-slider-fill';
        track.appendChild(fill);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'eq-slider';
        slider.min  = String(-EQ_MAX_DB);
        slider.max  = String(EQ_MAX_DB);
        slider.step = '0.5';
        slider.value = String(EQ.gains[i]);
        slider.setAttribute('aria-label', `Полоса ${band.label} Гц`);

        slider.addEventListener('input', () => {
            const v = parseFloat(slider.value) || 0;
            EQ.gains[i] = v;
            EQ.preset = 'custom';
            updateEqBandUI(i);
            updateEqPresetUI();
            updateEqMasterUI();
            applyEqFilterGain(i);
            saveEqState();
        });

        wrap.appendChild(track);
        wrap.appendChild(slider);

        const freqLabel = document.createElement('span');
        freqLabel.className = 'eq-band-freq';
        freqLabel.textContent = band.label;

        col.appendChild(gainLabel);
        col.appendChild(wrap);
        col.appendChild(freqLabel);
        eqBandsEl.appendChild(col);

        _eqSliders.push(slider);
        _eqBandFills.push(fill);
        _eqBandLabels.push(gainLabel);
    });

    eqResetBtn.addEventListener('click', () => selectEqPreset('flat'));

    eqPowerBtn.addEventListener('click', async () => {
        if (!EQ.enabled) {
            const ok = await initEqAudioGraph();
            if (!ok) {
                updateEqMasterUI();
                return;
            }
            EQ.enabled = true;
            if (EQ.ctx.state === 'suspended') EQ.ctx.resume().catch(() => {});
            applyAllEqGains(false);
        } else {
            EQ.enabled = false;
            applyAllEqGains(true);
        }
        updateEqMasterUI();
        saveEqState();
    });

    eqCloseBtn.addEventListener('click', closeEqPanel);
}

// ---------- Обновление UI отдельных частей ----------
function updateEqBandUI(i) {
    const v = EQ.gains[i];
    const slider = _eqSliders[i];
    const fill = _eqBandFills[i];
    const label = _eqBandLabels[i];
    if (!slider || !fill || !label) return;

    if (slider.value !== String(v)) slider.value = String(v);

    const rounded = Math.round(v * 10) / 10;
    label.textContent = (rounded > 0 ? '+' : '') + rounded;
    label.classList.toggle('is-positive', v > 0);
    label.classList.toggle('is-negative', v < 0);

    const pct = (v / EQ_MAX_DB) * 50;
    if (v >= 0) {
        fill.style.top = `${50 - pct}%`;
        fill.style.bottom = '50%';
        fill.classList.remove('is-negative');
    } else {
        fill.style.top = '50%';
        fill.style.bottom = `${50 + pct}%`;
        fill.classList.add('is-negative');
    }
    fill.style.opacity = Math.abs(v) < 0.05 ? '0' : '1';
}

function updateAllEqBandUI() {
    EQ_BANDS.forEach((_, i) => updateEqBandUI(i));
}

function updateEqPresetUI() {
    eqPresetsEl.querySelectorAll('.eq-preset').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === EQ.preset);
    });
}

function updateEqMasterUI() {
    if (eqPowerBtn) {
        eqPowerBtn.classList.toggle('active', EQ.enabled);
        eqPowerBtn.setAttribute('aria-pressed', EQ.enabled ? 'true' : 'false');
    }
    const anyNonZero = EQ.gains.some(g => Math.abs(g) > 0.05);
    if (eqBtn) eqBtn.classList.toggle('active', EQ.enabled && anyNonZero);
    if (eqGainInfoEl) {
        if (!EQ.enabled) eqGainInfoEl.textContent = 'Выкл';
        else if (!EQ.healthy) eqGainInfoEl.textContent = 'Н/Д';
        else if (!anyNonZero) eqGainInfoEl.textContent = 'Flat';
        else {
            const mx = Math.max(...EQ.gains);
            const mn = Math.min(...EQ.gains);
            const fmt = v => (v > 0 ? '+' : '') + v.toFixed(0);
            eqGainInfoEl.textContent = `${fmt(mn)}…${fmt(mx)} dB`;
        }
    }
}

// ---------- Выбор пресета ----------
async function selectEqPreset(key) {
    const preset = EQ_PRESETS[key];
    if (!preset) return;
    EQ.gains = [...preset.gains];
    EQ.preset = key;

    if (!EQ.enabled) {
        const ok = await initEqAudioGraph();
        if (!ok) { updateEqMasterUI(); return; }
        EQ.enabled = true;
    }

    if (EQ.healthy) {
        if (EQ.ctx.state === 'suspended') EQ.ctx.resume().catch(() => {});
        applyAllEqGains();
    }

    updateAllEqBandUI();
    updateEqPresetUI();
    updateEqMasterUI();
    saveEqState();
}

// ---------- Открытие/закрытие панели ----------
function openEqPanel() {
    if (!eqPanel) return;
    eqPanel.classList.remove('hidden');
    eqPanel.setAttribute('aria-hidden', 'false');
    if (eqBtn) eqBtn.setAttribute('aria-expanded', 'true');
}

function closeEqPanel() {
    if (!eqPanel) return;
    eqPanel.classList.add('hidden');
    eqPanel.setAttribute('aria-hidden', 'true');
    if (eqBtn) eqBtn.setAttribute('aria-expanded', 'false');
}

function toggleEqPanel() {
    if (!eqPanel) return;
    if (eqPanel.classList.contains('hidden')) openEqPanel();
    else closeEqPanel();
}

// ---------- Инициализация ----------
function initEqualizer() {
    eqBtn        = document.getElementById('eq-btn');
    eqPanel      = document.getElementById('equalizer-panel');
    eqCloseBtn   = document.getElementById('eq-close');
    eqPowerBtn   = document.getElementById('eq-power');
    eqBandsEl    = document.getElementById('eq-bands');
    eqPresetsEl  = document.getElementById('eq-presets');
    eqResetBtn   = document.getElementById('eq-reset');
    eqGainInfoEl = document.getElementById('eq-gain-info');

    loadEqState();
    buildEqUI();
    updateAllEqBandUI();
    updateEqPresetUI();
    updateEqMasterUI();

    if (EQ.enabled && !EQ.healthy) {
        EQ.enabled = false;
        saveEqState();
    }

    if (eqBtn) eqBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleEqPanel(); });

    document.addEventListener('click', (e) => {
        if (!eqPanel || eqPanel.classList.contains('hidden')) return;
        if (e.target.closest('#equalizer-panel') || e.target.closest('#eq-btn')) return;
        closeEqPanel();
    });

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Escape' && eqPanel && !eqPanel.classList.contains('hidden')) closeEqPanel();
    });
}