/**
 * Fatsa BİLSEM — Supabase İstemci (Client) Kurulumu
 */

const SUPABASE_URL = 'https://aagnhtmjhilqvskhffnw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhZ25odG1qaGlscXZza2hmZm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwOTIxOTAsImV4cCI6MjEwNTY2ODE5MH0.82z00Sfet1YyliLdmv5d1fk_qY7tfd6NQensWtId3hc';

// Supabase client oluştur
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Kolay erişim için global değişkene ata
window.supabaseClient = supabase;
