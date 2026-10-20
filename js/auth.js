// js/auth.js
let currentUser = null;
let currentProfile = null;

async function loginWithDiscord() {
    console.log("Нажата кнопка входа в Discord...");
    const { error } = await window.supabaseClient.auth.signInWithOAuth({
        provider: 'discord',
        options: {
            redirectTo: window.location.origin
        }
    });
    if (error) console.error('Ошибка входа:', error.message);
}

async function logout() {
    await window.supabaseClient.auth.signOut();
    currentUser = null;
    currentProfile = null;
    updateAuthUI();
}

async function fetchProfile(userId) {
    const { data, error } = await window.supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    
    if (!error && data) {
        currentProfile = data;
    }
    return currentProfile;
}

function updateAuthUI() {
    const authContainer = document.getElementById('auth-container');
    if (!authContainer) return;

    if (currentUser && currentProfile) {
        const roleBadge = currentProfile.role === 'artist' 
            ? '<span class="auth-role-badge artist">Артист</span>' 
            : currentProfile.role === 'admin' 
                ? '<span class="auth-role-badge admin">Админ</span>' 
                : '';

        // Показываем кнопку кабинета, если роль artist или admin
        const dashboardBtn = (currentProfile.role === 'artist' || currentProfile.role === 'admin')
            ? `<button class="auth-dropdown-btn" onclick="openDashboard()">Личный кабинет</button>`
            : '';

        authContainer.innerHTML = `
            <div class="auth-user-profile" id="auth-user-menu">
                <img src="${currentProfile.avatar_url || 'photo/placeholder.jpg'}" class="auth-avatar" alt="">
                <div class="auth-user-info">
                    <span class="auth-name">${currentProfile.username}</span>
                    ${roleBadge}
                </div>
                <div class="auth-dropdown hidden" id="auth-dropdown">
                    ${dashboardBtn}
                    <button class="auth-dropdown-btn" onclick="logout()">Выйти</button>
                </div>
            </div>
        `;

        document.getElementById('auth-user-menu').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('auth-dropdown').classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('auth-dropdown');
            const menu = document.getElementById('auth-user-menu');
            if (dropdown && menu && !menu.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });
    } else {
        authContainer.innerHTML = `
            <button class="auth-login-btn" onclick="loginWithDiscord()">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z"/>
                </svg>
                Войти через Discord
            </button>
        `;
    }
}

async function initAuth() {
    // ★ Очистка URL от токенов после редиректа
    if (window.location.hash && window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    
    console.log("Запуск initAuth...");
    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        
        if (session) {
            currentUser = session.user;
            await fetchProfile(currentUser.id);
        }
        
        updateAuthUI();

        window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth state changed:", event);
            if (event === 'SIGNED_IN' && session) {
                currentUser = session.user;
                await fetchProfile(currentUser.id);
            } else if (event === 'SIGNED_OUT') {
                currentUser = null;
                currentProfile = null;
            }
            updateAuthUI();
        });
    } catch (err) {
        console.error("Ошибка в initAuth:", err);
    }
}