// Weather for any place, at the current moment, a future date (forecast,
// up to 16 days out), or a past date (historical archive) — using
// Open-Meteo, which is free and needs no API key at all.
//
// Reuses the same geocodePlace() as the map feature, so "weather in the
// Eiffel Tower" resolves through the same curated-landmark-first lookup.

import { geocodePlace } from "./mapbox";

export type WeatherResult = {
  place: string;
  summary: string;
};

const WEATHER_CODES: Record<number, { text: string; emoji: string }> = {
  0: { text: "clear sky", emoji: "☀️" },
  1: { text: "mainly clear", emoji: "🌤️" },
  2: { text: "partly cloudy", emoji: "⛅" },
  3: { text: "overcast", emoji: "☁️" },
  45: { text: "fog", emoji: "🌫️" },
  48: { text: "depositing rime fog", emoji: "🌫️" },
  51: { text: "light drizzle", emoji: "🌦️" },
  53: { text: "moderate drizzle", emoji: "🌦️" },
  55: { text: "dense drizzle", emoji: "🌧️" },
  56: { text: "light freezing drizzle", emoji: "🌧️" },
  57: { text: "dense freezing drizzle", emoji: "🌧️" },
  61: { text: "slight rain", emoji: "🌦️" },
  63: { text: "moderate rain", emoji: "🌧️" },
  65: { text: "heavy rain", emoji: "🌧️" },
  66: { text: "light freezing rain", emoji: "🌧️" },
  67: { text: "heavy freezing rain", emoji: "🌨️" },
  71: { text: "slight snow", emoji: "🌨️" },
  73: { text: "moderate snow", emoji: "🌨️" },
  75: { text: "heavy snow", emoji: "❄️" },
  77: { text: "snow grains", emoji: "❄️" },
  80: { text: "slight rain showers", emoji: "🌦️" },
  81: { text: "moderate rain showers", emoji: "🌧️" },
  82: { text: "violent rain showers", emoji: "⛈️" },
  85: { text: "slight snow showers", emoji: "🌨️" },
  86: { text: "heavy snow showers", emoji: "❄️" },
  95: { text: "thunderstorm", emoji: "⛈️" },
  96: { text: "thunderstorm with slight hail", emoji: "⛈️" },
  99: { text: "thunderstorm with heavy hail", emoji: "⛈️" },
};

function describeCode(code: number) {
  return WEATHER_CODES[code] ?? { text: "unknown conditions", emoji: "🌡️" };
}

function cToF(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

/**
 * @param place  Any place name — city, landmark, address.
 * @param date   YYYY-MM-DD. Omit for "right now". The caller (Gemini) is
 *               responsible for turning relative phrases like "tomorrow"
 *               into a concrete date using the current date it's given.
 * @param hour   0–23, if the user asked about a specific time of day.
 */
export async function getWeather(
  place: string,
  date?: string,
  hour?: number
): Promise<WeatherResult | null> {
  const geo = await geocodePlace(place);
  if (!geo) return null;

  const today = new Date().toISOString().slice(0, 10);
  const targetDate = date || today;
  const isPast = targetDate < today;

  const base = isPast
    ? "https://archive-api.open-meteo.com/v1/archive"
    : "https://api.open-meteo.com/v1/forecast";

  const params = new URLSearchParams({
    latitude: String(geo.latitude),
    longitude: String(geo.longitude),
    timezone: "auto",
    start_date: targetDate,
    end_date: targetDate,
    daily: "temperature_2m_max,temperature_2m_min,weather_code",
    hourly: "temperature_2m,weather_code",
  });

  if (!date && !isPast) {
    params.set("current", "temperature_2m,weather_code");
  }

  const res = await fetch(`${base}?${params.toString()}`);
  if (!res.ok) return null;

  const data = await res.json();

  // No date given at all — live current conditions.
  if (!date && data.current) {
    const { text, emoji } = describeCode(data.current.weather_code);
    const tempC = Math.round(data.current.temperature_2m);
    const high = data.daily?.temperature_2m_max?.[0];
    const low = data.daily?.temperature_2m_min?.[0];
    const summary =
      `${emoji} ${geo.name} — ${tempC}°C (${cToF(tempC)}°F), ${text} right now.` +
      (high !== undefined && low !== undefined
        ? ` High ${Math.round(high)}° / Low ${Math.round(low)}°C today.`
        : "");
    return { place: geo.name, summary };
  }

  // A specific hour on a specific date.
  if (hour !== undefined && data.hourly?.time) {
    const targetIso = `${targetDate}T${String(hour).padStart(2, "0")}:00`;
    const idx = data.hourly.time.indexOf(targetIso);
    if (idx !== -1) {
      const tempC = Math.round(data.hourly.temperature_2m[idx]);
      const { text, emoji } = describeCode(data.hourly.weather_code[idx]);
      const when = isPast ? "was" : "should be";
      const hourLabel = new Date(targetIso).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
      const summary =
        `${emoji} ${geo.name} at ${hourLabel} on ${targetDate} ${when} ` +
        `${tempC}°C (${cToF(tempC)}°F), ${text}.`;
      return { place: geo.name, summary };
    }
  }

  // A full-day summary — past or future, no specific hour requested.
  if (data.daily?.temperature_2m_max?.length) {
    const high = Math.round(data.daily.temperature_2m_max[0]);
    const low = Math.round(data.daily.temperature_2m_min[0]);
    const { text, emoji } = describeCode(data.daily.weather_code[0]);
    const when = isPast ? "was" : "forecast is";
    const summary =
      `${emoji} ${geo.name} on ${targetDate} ${when} ${text}. ` +
      `High ${high}°C (${cToF(high)}°F) / Low ${low}°C (${cToF(low)}°F).`;
    return { place: geo.name, summary };
  }

  return null;
}
