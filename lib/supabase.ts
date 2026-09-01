import { createClient } from "@supabase/supabase-js";

// Server-only client. Uses the SERVICE ROLE key (not the public "anon" key)
// so it can freely read/write your messages table without needing a login
// system — fine for a single-user personal assistant. This file must only
// ever be imported from app/api/* routes, never from a "use client" file,
// or the service key would leak to the browser.
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type StoredMessage = {
  id: string;
  role: "user" | "model";
  content: string;
  created_at: string;
};

export async function loadHistory(limit = 50): Promise<StoredMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function saveMessage(role: "user" | "model", content: string) {
  const { error } = await supabase.from("messages").insert({ role, content });
  if (error) throw error;
}