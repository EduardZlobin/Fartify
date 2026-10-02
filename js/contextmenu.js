// ============================================================
// js/contextmenu.js — контекстное меню по правому клику
// ============================================================

function showContextMenu(x, y, target, options) {
    const menu = document.getElementById('context-menu');
    if (!menu) return;

    menu.querySelectorAll('.context-menu-item').forEach(btn => {
        const a = btn.dataset.action;
        if (a === 'share')        btn.style.display = options.allowShare       ? '' : 'none';
        if (a === 'add-queue')    btn.style.display = options.allowAddQueue    ? '' : 'none';
        if (a === 'block')        btn.style.display = options.allowBlock       ? '' : 'none';
        if (a === 'remove-queue') btn.style.display = options.allowRemoveQueue ? '' : 'none';
    });

    if (options.allowBlock) {
        const lbl = menu.querySelector('.ctx-block-label');
        if (lbl) lbl.textContent = options.isBlocked ? 'Разблокировать' : 'Заблокировать';
    }

    menu.classList.remove('hidden');
    const rect = menu.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    if (x + rect.width  > vw - 8) x = vw - rect.width  - 8;
    if (y + rect.height > vh - 8) y = vh - rect.height - 8;
    if (x < 8) x = 8;
    if (y < 8) y = 8;
    menu.style.left = x + 'px';
    menu.style.top  = y + 'px';

    window.__ctxTarget = target;
}

function hideContextMenu() {
    const menu = document.getElementById('context-menu');
    if (menu) menu.classList.add('hidden');
    window.__ctxTarget = null;
}

function initContextMenu() {
    const menu = document.getElementById('context-menu');
    if (!menu) return;

    menu.addEventListener('click', (e) => {
        const btn = e.target.closest('.context-menu-item');
        if (!btn) return;
        const action = btn.dataset.action;
        const target = window.__ctxTarget;
        hideContextMenu();
        if (!target) return;

        if (action === 'add-queue') {
            const file = target.dataset.file;
            if (!file) return;
            const found = findTrackAndAlbum(file);
            if (found) addToManualQueue(found.track, found.album);
            return;
        }

        if (action === 'block') {
            const file = target.dataset.file;
            if (!file) return;
            toggleBlockedTrack(file);
            return;
        }

        if (action === 'remove-queue') {
            const manualId = parseInt(target.dataset.manualId, 10);
            if (Number.isInteger(manualId) && manualId > 0) {
                removeFromManualQueue(manualId);
            }
            return;
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#context-menu')) hideContextMenu();
    });
    document.addEventListener('scroll', hideContextMenu, true);
    window.addEventListener('resize', hideContextMenu);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideContextMenu();
    });

    document.addEventListener('contextmenu', (e) => {
        const queueItem = e.target.closest('.queue-item');
        if (queueItem) {
            e.preventDefault();
            const manualId = parseInt(queueItem.dataset.manualId, 10);
            const isManual = Number.isInteger(manualId) && manualId > 0;
            const file = queueItem.dataset.file;

            if (isManual) {
                showContextMenu(e.clientX, e.clientY, queueItem, {
                    allowShare: false,
                    allowAddQueue: false,
                    allowBlock: false,
                    allowRemoveQueue: true
                });
                return;
            }
            if (file) {
                showContextMenu(e.clientX, e.clientY, queueItem, {
                    allowShare: true,
                    allowAddQueue: false,
                    allowBlock: true,
                    isBlocked: isBlocked(file),
                    allowRemoveQueue: false
                });
                return;
            }
            return;
        }

        const trackRow = e.target.closest('.track-row');
        if (trackRow && trackRow.dataset.file) {
            e.preventDefault();
            const file = trackRow.dataset.file;
            showContextMenu(e.clientX, e.clientY, trackRow, {
                allowShare: true,
                allowAddQueue: true,
                allowBlock: true,
                isBlocked: isBlocked(file),
                allowRemoveQueue: false
            });
        }
    });
}