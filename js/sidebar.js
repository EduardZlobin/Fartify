// ============================================================
// js/sidebar.js — левая панель навигации
// ============================================================

function initSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const toggle  = document.getElementById('sidebar-toggle');
    if (!sidebar) return;

    // Восстанавливаем состояние из localStorage
    try {
        const saved = localStorage.getItem('fartify_sidebar_expanded');
        if (saved === '1') {
            document.documentElement.classList.add('sidebar-expanded');
        }
    } catch (e) {}

    if (toggle) {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const expanded = document.documentElement.classList.toggle('sidebar-expanded');
            try {
                localStorage.setItem('fartify_sidebar_expanded', expanded ? '1' : '0');
            } catch (e) {}
        });
    }

    // Подсветка активного раздела
    updateSidebarActive();
}

function updateSidebarActive() {
    const links = document.querySelectorAll('.app-sidebar-link');
    if (!links.length) return;

    const path = getRelativePath();
    let active = null;

    if (path === '/' || path === '') active = 'home';
    else if (path === '/reviews') active = 'reviews';
    else if (path === '/favorites') active = 'favorites';
    else if (path === '/chart') active = 'chart';
    else if (path.startsWith('/playlist/')) active = 'home';
    else if (path.startsWith('/release/')) active = 'home';
    else if (path.startsWith('/Artist/')) active = 'home';
    else if (path.startsWith('/track/')) active = 'home';
    else active = 'home';

    links.forEach(link => {
        link.classList.toggle('is-active', link.dataset.nav === active);
    });
}