import { createClient } from "@supabase/supabase-js";

// Access Vite client environment variables safely with direct, robust fallbacks for immediate synchronization
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "https://ktlpkpfpiushkkfkfdyf.supabase.co";
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "sb_publishable_p4UZmfOhXUYR27NjQa8vxQ_KQxNbLI2";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Lazy load or gracefully create client
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface SupabaseVocabulary {
  id?: string;
  word: string;
  phonetic: string;
  meaning: string;
  example_sentence: string;
  example_translation: string;
  created_at?: string;
}
