// Searches Spotify for tracks/albums using the Client Credentials flow —
// this works with just an app's Client ID/Secret, no user login required,
// and is entirely free. Good for search + embeddable playback; it does
// NOT let us control someone's actual Spotify playback (that needs full
// user OAuth, a bigger feature for another day if you want it later).

export type TrackResult = {
  name: string;
  artist: string;
  albumArt: string;
  trackId: string;
  embedUrl: string;
  spotifyUrl: string;
};

export type AlbumResult = {
  name: string;
  artist: string;
  albumArt: string;
  albumId: string;
  spotifyUrl: string;
};

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.log("Spotify token error body:", errBody);
    throw new Error("Failed to get Spotify access token");
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

export async function searchTrack(query: string): Promise<TrackResult | null> {
  const token = await getAccessToken();

  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(
    query
  )}&type=track&limit=1`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.log("Spotify search error body:", errBody);
    return null;
  }

  const data = await res.json();
  const track = data.tracks?.items?.[0];
  if (!track) return null;

  return {
    name: track.name,
    artist: track.artists.map((a: { name: string }) => a.name).join(", "),
    albumArt: track.album.images?.[0]?.url ?? "",
    trackId: track.id,
    embedUrl: `https://open.spotify.com/embed/track/${track.id}`,
    spotifyUrl: track.external_urls.spotify,
  };
}

export async function searchAlbum(query: string): Promise<AlbumResult | null> {
  const token = await getAccessToken();

  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(
    query
  )}&type=album&limit=1`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.log("Spotify album search error body:", errBody);
    return null;
  }

  const data = await res.json();
  const album = data.albums?.items?.[0];
  if (!album) return null;

  return {
    name: album.name,
    artist: album.artists.map((a: { name: string }) => a.name).join(", "),
    albumArt: album.images?.[0]?.url ?? "",
    albumId: album.id,
    spotifyUrl: album.external_urls.spotify,
  };
}
