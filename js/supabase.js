// js/supabase.js
const SUPABASE_URL = 'https://pzcxolhvwopllmeaxvtb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PkYSrEObImSp5XR28_r71g_rzw2WWTh';

if (!window.supabaseClient) {
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            flowType: 'pkce',
            detectSessionInUrl: true // ← Включаем автоматическую обработку кода из URL
        }
    });
}