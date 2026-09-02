import { supabase } from "./supabase";
import { PlayedTrack } from "./lastPlayed";

export type FavoriteTrack = PlayedTrack;

// Upserts on track_id so favoriting the same song twice updates the one
// row instead of piling up duplicates.
export async function addFavorite(track: PlayedTrack) {
  const { error } = await supabase.from("favorites").upsert(
    {
      track_id: track.trackId,
      track_name: track.name,
      artist: track.artist,
      album_art: track.albumArt,
      spotify_url: track.spotifyUrl,
    },
    { onConflict: "track_id" }
  );
  if (error) throw error;
}

export async function getLatestFavorite(): Promise<FavoriteTrack | null> {
  const { data, error } = await supabase
    .from("favorites")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
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

export async function getAllFavorites(): Promise<FavoriteTrack[]> {
  const { data, error } = await supabase
    .from("favorites")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((d) => ({
    name: d.track_name,
    artist: d.artist,
    trackId: d.track_id,
    albumArt: d.album_art,
    spotifyUrl: d.spotify_url,
  }));
}
