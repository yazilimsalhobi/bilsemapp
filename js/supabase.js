/**
 * Fatsa BİLSEM — Supabase İstemci (Client) Kurulumu
 */

const SUPABASE_URL = 'https://aagnhtmjhilqvskhffnw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_QiYD-Ngc8JdUzdayWdvgQA_6ojQZYHX';

// Supabase client oluştur
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Kolay erişim için global değişkene ata
window.supabaseClient = supabase;
