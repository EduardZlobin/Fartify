// ============================================================
// js/utils.js — чистые функции: форматирование, экранирование, slug
// ============================================================

// ---------- SVG-иконки ----------
function getPlaySvg(size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 21,12 5,21"/></svg>`;
}

function getPauseSvg(size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="3" width="6" height="18" rx="0.5"/><rect x="14" y="3" width="6" height="18" rx="0.5"/></svg>`;
}

// ---------- Экранирование ----------
function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

// ---------- Время и длительность ----------
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

// ---------- Тип релиза ----------
function getAlbumType(count) {
    if (count === 1) return 'Сингл';
    if (count >= 2 && count <= 3) return 'Макси-сингл';
    if (count >= 4 && count <= 8) return 'EP';
    return 'Альбом';
}

// ---------- Свежий релиз ----------
function isFreshRelease(dateStr) {
    if (!dateStr) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr);
    if (isNaN(d)) return false;
    d.setHours(0, 0, 0, 0);
    const diffDays = (today - d) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays < 10;
}

function formatReleaseDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
}

// ---------- URL / роутинг ----------
function safeDecode(s) {
    if (typeof s !== 'string') return '';
    try { return decodeURIComponent(s); }
    catch { return s; }
}

function getRelativePath() {
    let p = window.location.pathname || '/';
    if (BASE_PATH !== '/' && p.startsWith(BASE_PATH)) {
        p = '/' + p.slice(BASE_PATH.length);
    }
    p = p.replace(/\/+$/, '') || '/';
    return p;
}

// ---------- Slug для треков ----------
function normalizeTrackSlug(str) {
    return String(str || '')
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[_\u2010-\u2015\-]+/g, ' ')
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function slugifyTrackTitle(title) {
    const cleaned = String(title || '')
        .normalize('NFKC')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .trim()
        .replace(/\s+/g, '_');
    return cleaned || 'track';
}

// ---------- Обрезка строк для имени файла ----------
function safeFileName(str, fallback = 'file') {
    const cleaned = String(str || '')
        .replace(/[\\/:*?"<>|]/g, '_')
        .slice(0, 60)
        .trim();
    return cleaned || fallback;
}