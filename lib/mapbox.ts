// Turns a place name ("London", "Eiffel Tower") into coordinates using
// Mapbox's Geocoding API. Runs server-side, using the same public token
// (Mapbox's geocoding endpoint accepts the public pk. token fine for
// this volume of use).

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

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // Try landmarks/points-of-interest first — this is what makes
  // "the Eiffel Tower" resolve to the actual tower instead of just
  // the city of Paris in general.
  const poiResult = await tryGeocode(place, token, "poi");
  if (poiResult) return poiResult;

  // Fall back to an unrestricted search (covers cities, countries,
  // regions — anything that isn't a specific point of interest).
  return tryGeocode(place, token, undefined);
}

async function tryGeocode(
  place: string,
  token: string | undefined,
  types: string | undefined
): Promise<GeocodeResult | null> {
  const typesParam = types ? `&types=${types}` : "";
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    place
  )}.json?access_token=${token}&limit=1${typesParam}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) return null;

  const [longitude, latitude] = feature.center;
  return { name: feature.place_name, latitude, longitude };
}