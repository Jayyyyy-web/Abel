// Turns a place name ("London", "Eiffel Tower") into coordinates using
// Google's Geocoding API. Runs server-side with GOOGLE_MAPS_API_KEY — a
// key restricted to just the Geocoding API, never exposed to the browser.

import { findLandmark } from "./landmarks";

export type GeocodeResult = {
  name: string;
  latitude: number;
  longitude: number;
};

export async function geocodePlace(
  place: string
): Promise<GeocodeResult | null> {
  // Check the curated landmark list first — guaranteed-accurate
  // coordinates for major monuments, no dependency on search ranking.
  const known = findLandmark(place);
  if (known) return known;

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json` +
    `?address=${encodeURIComponent(place)}&key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  if (data.status !== "OK") return null;

  const result = data.results?.[0];
  if (!result) return null;

  return {
    name: result.formatted_address as string,
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
  };
}
