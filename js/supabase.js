// js/supabase.js
const SUPABASE_URL = 'https://pzcxolhvwopllmeaxvtb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PkYSrEObImSp5XR28_r71g_rzw2WWTh';

// Создаем клиент и вешаем его на window, чтобы он был доступен во всех файлах
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Supabase клиент инициализирован!'); // Проверка в консоли