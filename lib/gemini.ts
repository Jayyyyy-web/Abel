import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_PROMPT } from "./personality";
import { geocodePlace } from "./mapbox";
import { searchTrack, searchAlbum } from "./spotify";
import { setLastPlayed, getLastPlayed } from "./lastPlayed";
import { addFavorite, getLatestFavorite } from "./favorites";
import { getWeather } from "./weather";

// One shared client, built from the server-only env var.
// GEMINI_API_KEY never reaches the browser because this file
// is only ever imported from app/api/* route handlers.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export type ChatMessage = {
  role: "user" | "model";
  text: string;
};

// Describes the "show a map" tool to Gemini. Gemini decides on its own
// when a user's message calls for this (e.g. "show me London",
// "what does Tokyo look like from above") vs. just replying with text.
const showMapTool = {
  name: "show_map",
  description:
    "Shows the user an interactive 3D map of a place they asked to see, " +
    "such as a city, landmark, monument, or region. Use this whenever the " +
    "user asks to see, visualize, or explore a real-world location.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      place: {
        type: Type.STRING,
        description:
          "The precise, well-known name of the place, exactly as it would " +
          "appear on a map or in an encyclopedia — not a vague description. " +
          "For monuments/landmarks, use their full proper name and include " +
          "the city if it helps disambiguate, e.g. 'Eiffel Tower, Paris', " +
          "'Statue of Liberty', 'Christ the Redeemer, Rio de Janeiro', " +
          "'Colosseum, Rome' — not just 'the tower' or 'that famous statue'.",
      },
    },
    required: ["place"],
  },
};

// Describes the "play a song" tool. Gemini decides when the user is
// asking to hear/play music vs. just talking about a song/artist.
const playMusicTool = {
  name: "play_music",
  description:
    "Plays a single song for the user in an embedded player. Use this " +
    "whenever the user asks to play, hear, or listen to a specific song " +
    "— not when they're just discussing music generally, and not when " +
    "they ask for a whole album (use play_album for that).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description:
          "The song search query — song title and/or artist name, e.g. " +
          "'Blinding Lights The Weeknd', 'Bohemian Rhapsody Queen'.",
      },
    },
    required: ["query"],
  },
};

// Describes the "play an album" tool — separate from play_music since an
// album embed shows a full tracklist rather than one song.
const playAlbumTool = {
  name: "play_album",
  description:
    "Plays a full album for the user in an embedded player with its " +
    "tracklist. Use this when the user asks to play, hear, or listen to " +
    "an entire album, not just one song.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description:
          "The album search query — album title and/or artist name, e.g. " +
          "'Abbey Road The Beatles', 'Random Access Memories Daft Punk'.",
      },
    },
    required: ["query"],
  },
};

// Saves a song as a favorite, remembered across conversations via
// Supabase. Works either for a song the user names explicitly, or —
// if they omit both fields — whatever was most recently played.
const saveFavoriteSongTool = {
  name: "save_favorite_song",
  description:
    "Saves a song as one of the user's favorites, remembered across " +
    "future conversations. Use this when the user says to remember, " +
    "save, or favorite a song — either the one currently/most recently " +
    "playing, or one they name explicitly.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      trackName: {
        type: Type.STRING,
        description:
          "Song title to favorite, if the user named a specific song. " +
          "Omit this (and artist) to favorite whatever was most recently played.",
      },
      artist: {
        type: Type.STRING,
        description: "Artist name, only if trackName is also given.",
      },
    },
  },
};

// Plays back whatever the user has saved as a favorite. If there are
// several, plays the most recently saved one.
const playFavoriteSongTool = {
  name: "play_favorite_song",
  description:
    "Plays one of the user's saved favorite songs. Use when the user " +
    "asks to play their favorite song or music, without naming a " +
    "specific track.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

// Weather for any place — now, a future forecast date, or a past date.
const getWeatherTool = {
  name: "get_weather",
  description:
    "Gets the weather for a place, optionally at a specific date and/or " +
    "time of day. Use whenever the user asks about weather, temperature, " +
    "or conditions anywhere — right now, in the past, or in the forecast.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      place: {
        type: Type.STRING,
        description: "The place to get weather for, e.g. 'Tokyo', 'Paris, France'.",
      },
      date: {
        type: Type.STRING,
        description:
          "The date in YYYY-MM-DD format. Compute this yourself from " +
          "relative phrases like 'tomorrow', 'this weekend', 'next Friday', " +
          "or 'last Tuesday', using today's date given in your instructions. " +
          "Omit entirely for current/right-now weather.",
      },
      hour: {
        type: Type.NUMBER,
        description:
          "Hour of day in 24-hour format (0-23), only if the user asked " +
          "about a specific time like '3pm' or 'tonight'. Omit for a " +
          "full-day summary.",
      },
    },
    required: ["place"],
  },
};

export type AskResult =
  | { type: "text"; text: string }
  | {
      type: "map";
      text: string;
      place: string;
      latitude: number;
      longitude: number;
    }
  | {
      type: "music";
      text: string;
      trackName: string;
      artist: string;
      albumArt: string;
      mediaId: string;
      mediaType: "track" | "album";
      spotifyUrl: string;
    };

/**
 * Sends the conversation so far to Gemini and returns a plain text reply,
 * a map result, or a music result depending on what Gemini decided the
 * user wants. `history` should be the past messages (oldest first), NOT
 * including the newest user message, which is passed separately as
 * `userMessage`.
 */
export async function askGemini(
  history: ChatMessage[],
  userMessage: string
): Promise<AskResult> {
  const contents = [
    ...history
      .filter((m) => m.text && m.text.trim().length > 0)
      .map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      })),
    {
      role: "user" as const,
      parts: [{ text: userMessage }],
    },
  ];

  // Gemini has no innate sense of "today" — giving it the real date lets
  // it turn relative phrases ("tomorrow", "next Friday") into a concrete
  // YYYY-MM-DD for get_weather.
  const today = new Date().toISOString().slice(0, 10);
  const systemInstruction =
    `${SYSTEM_PROMPT}\n\nToday's date is ${today}. Use this as the ` +
    `reference point for any relative dates in get_weather calls.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents,
    config: {
      systemInstruction,
      tools: [
        {
          functionDeclarations: [
            showMapTool,
            playMusicTool,
            playAlbumTool,
            saveFavoriteSongTool,
            playFavoriteSongTool,
            getWeatherTool,
          ],
        },
      ],
    },
  });

  const call = response.functionCalls?.[0];

  if (call && call.name === "show_map") {
    const place = (call.args?.place as string) ?? "";
    const geo = await geocodePlace(place);

    if (geo) {
      return {
        type: "map",
        text: `Here's ${geo.name}.`,
        place: geo.name,
        latitude: geo.latitude,
        longitude: geo.longitude,
      };
    }
    return {
      type: "text",
      text: `I couldn't find a place called "${place}".`,
    };
  }

  if (call && call.name === "play_music") {
    const query = (call.args?.query as string) ?? "";
    const track = await searchTrack(query);

    if (track) {
      await setLastPlayed({
        name: track.name,
        artist: track.artist,
        albumArt: track.albumArt,
        trackId: track.trackId,
        spotifyUrl: track.spotifyUrl,
      }).catch((err) => console.error("Failed to save last played:", err));

      return {
        type: "music",
        text: `Playing "${track.name}" by ${track.artist}.`,
        trackName: track.name,
        artist: track.artist,
        albumArt: track.albumArt,
        mediaId: track.trackId,
        mediaType: "track",
        spotifyUrl: track.spotifyUrl,
      };
    }
    return {
      type: "text",
      text: `I couldn't find a track matching "${query}".`,
    };
  }

  if (call && call.name === "play_album") {
    const query = (call.args?.query as string) ?? "";
    const album = await searchAlbum(query);

    if (album) {
      return {
        type: "music",
        text: `Playing "${album.name}" by ${album.artist}.`,
        trackName: album.name,
        artist: album.artist,
        albumArt: album.albumArt,
        mediaId: album.albumId,
        mediaType: "album",
        spotifyUrl: album.spotifyUrl,
      };
    }
    return {
      type: "text",
      text: `I couldn't find an album matching "${query}".`,
    };
  }

  if (call && call.name === "save_favorite_song") {
    const trackName = call.args?.trackName as string | undefined;
    const artist = call.args?.artist as string | undefined;

    try {
      let toSave;
      if (trackName) {
        const found = await searchTrack(artist ? `${trackName} ${artist}` : trackName);
        if (!found) {
          return { type: "text", text: `I couldn't find "${trackName}" to save.` };
        }
        toSave = {
          name: found.name,
          artist: found.artist,
          albumArt: found.albumArt,
          trackId: found.trackId,
          spotifyUrl: found.spotifyUrl,
        };
      } else {
        const last = await getLastPlayed();
        if (!last) {
          return {
            type: "text",
            text: "Nothing's played yet for me to save — tell me a song to favorite.",
          };
        }
        toSave = last;
      }

      await addFavorite(toSave);
      return {
        type: "text",
        text: `Saved "${toSave.name}" by ${toSave.artist} to your favorites.`,
      };
    } catch (err) {
      console.error("Failed to save favorite:", err);
      return { type: "text", text: "Something went wrong saving that favorite." };
    }
  }

  if (call && call.name === "play_favorite_song") {
    try {
      const fav = await getLatestFavorite();
      if (!fav) {
        return { type: "text", text: "You don't have any favorites saved yet." };
      }
      return {
        type: "music",
        text: `Playing your favorite — "${fav.name}" by ${fav.artist}.`,
        trackName: fav.name,
        artist: fav.artist,
        albumArt: fav.albumArt,
        mediaId: fav.trackId,
        mediaType: "track",
        spotifyUrl: fav.spotifyUrl,
      };
    } catch (err) {
      console.error("Failed to load favorite:", err);
      return { type: "text", text: "Something went wrong finding your favorite." };
    }
  }

  if (call && call.name === "get_weather") {
    const place = (call.args?.place as string) ?? "";
    const date = call.args?.date as string | undefined;
    const hour = call.args?.hour as number | undefined;

    const weather = await getWeather(place, date, hour);
    if (!weather) {
      return { type: "text", text: `I couldn't get the weather for "${place}".` };
    }
    return { type: "text", text: weather.summary };
  }

  return { type: "text", text: response.text ?? "(no response)" };
}
