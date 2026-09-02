import { supabase } from "./supabase";

export type PlayedTrack = {
  name: string;
  artist: string;
  albumArt: string;
  trackId: string;
  spotifyUrl: string;
};

// Singleton row (id = 1) holding whatever song played most recently, so
// "remember this as my favorite" works without the user repeating the
// song name in the same breath.
export async function setLastPlayed(track: PlayedTrack) {
  const { error } = await supabase.from("last_played").upsert({
    id: 1,
    track_name: track.name,
    artist: track.artist,
    track_id: track.trackId,
    album_art: track.albumArt,
    spotify_url: track.spotifyUrl,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function getLastPlayed(): Promise<PlayedTrack | null> {
  const { data, error } = await supabase
    .from("last_played")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    name: data.track_name,
    artist: data.artist,
    trackId: data.track_id,
    albumArt: data.album_art,
    spotifyUrl: data.spotify_url,
  };
}
