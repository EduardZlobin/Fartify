// ============================================================
// js/sponsors.js — бегущая строка спонсоров
// ============================================================

function loadSponsorsFromJson() {
    fetch('sponsors.json', { cache: 'no-cache' })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) renderSponsors(data); })
        .catch(() => { /* нет файла — просто скрываем секцию */ });
}

function renderSponsors(data) {
    const strip    = document.getElementById('sponsors-strip');
    const track    = document.getElementById('sponsors-marquee-track');
    const titleEl  = document.getElementById('sponsors-title');
    if (!strip || !track) return;

    const rawItems = Array.isArray(data) ? data
                   : (data && Array.isArray(data.items) ? data.items : []);

    const items = rawItems
        .map(it => typeof it === 'string' ? { name: it } : it)
        .filter(it => it && typeof it.name === 'string' && it.name.trim().length > 0);

    if (items.length === 0) {
        strip.style.display = 'none';
        return;
    }

    if (titleEl) {
        const t = (data && typeof data.title === 'string') ? data.title.trim() : '';
        titleEl.textContent = t;
        if (!t) titleEl.style.display = 'none';
    }

    const buildItem = (item) => {
        const el = document.createElement(item.url ? 'a' : 'span');
        el.className = 'sponsors-item';
        if (item.url) {
            el.href = item.url;
            el.target = '_blank';
            el.rel = 'noopener noreferrer';
            el.dataset.noRouter = '1';
        }
        const diamond = document.createElement('span');
        diamond.className = 'sponsors-diamond';
        diamond.setAttribute('aria-hidden', 'true');
        diamond.textContent = '◆';

        const name = document.createElement('span');
        name.className = 'sponsors-name';
        name.textContent = item.name;

        el.appendChild(diamond);
        el.appendChild(name);
        return el;
    };

    const setNodes = items.map(buildItem);

    track.innerHTML = '';
    setNodes.forEach(n => track.appendChild(n.cloneNode(true)));
    const oneSetWidth = Math.max(track.scrollWidth, 1);

    const containerW = track.parentElement?.clientWidth || window.innerWidth;
    const targetW    = containerW * 2;

    let repeats = Math.max(1, Math.ceil(targetW / oneSetWidth));
    if (repeats % 2 !== 0) repeats += 1;

    track.innerHTML = '';
    for (let i = 0; i < repeats; i++) {
        setNodes.forEach(n => track.appendChild(n.cloneNode(true)));
    }

    const totalW   = track.scrollWidth;
    const halfW    = totalW / 2;
    const speed    = 75;
    const duration = Math.max(24, halfW / speed);
    track.style.animationDuration = duration.toFixed(1) + 's';
}