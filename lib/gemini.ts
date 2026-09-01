import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_PROMPT } from "./personality";
import { geocodePlace } from "./mapbox";
import { searchTrack } from "./spotify";

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
    "Plays a song for the user in an embedded player. Use this whenever " +
    "the user asks to play, hear, or listen to a specific song or artist " +
    "— not when they're just discussing music generally.",
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
      embedUrl: string;
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

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ functionDeclarations: [showMapTool, playMusicTool] }],
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
      return {
        type: "music",
        text: `Playing "${track.name}" by ${track.artist}.`,
        trackName: track.name,
        artist: track.artist,
        albumArt: track.albumArt,
        embedUrl: track.embedUrl,
        spotifyUrl: track.spotifyUrl,
      };
    }
    return {
      type: "text",
      text: `I couldn't find a track matching "${query}".`,
    };
  }

  return { type: "text", text: response.text ?? "(no response)" };
}