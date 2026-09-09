import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./env";

/** Client Supabase para Client Components (navegador). */
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
