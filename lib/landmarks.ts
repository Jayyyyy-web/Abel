// A curated list of major world landmarks with verified exact coordinates.
// Checked BEFORE live geocoding — this makes famous monuments reliably
// accurate instead of depending on a geocoder's search ranking, which can
// sometimes surface a nearby district or generic area instead of the
// landmark itself.
//
// Add more entries anytime: { aliases: [...names people might type],
// name: "Display name", latitude, longitude }

import { GeocodeResult } from "./geocode";

type Landmark = {
  aliases: string[];
  name: string;
  latitude: number;
  longitude: number;
};

const LANDMARKS: Landmark[] = [
  {
    aliases: ["statue of liberty"],
    name: "Statue of Liberty, New York",
    latitude: 40.6892,
    longitude: -74.0445,
  },
  {
    aliases: ["eiffel tower"],
    name: "Eiffel Tower, Paris",
    latitude: 48.8584,
    longitude: 2.2945,
  },
  {
    aliases: ["big ben"],
    name: "Big Ben, London",
    latitude: 51.5007,
    longitude: -0.1246,
  },
  {
    aliases: ["christ the redeemer"],
    name: "Christ the Redeemer, Rio de Janeiro",
    latitude: -22.9519,
    longitude: -43.2105,
  },
  {
    aliases: ["colosseum", "coliseum"],
    name: "Colosseum, Rome",
    latitude: 41.8902,
    longitude: 12.4922,
  },
  {
    aliases: ["taj mahal"],
    name: "Taj Mahal, Agra",
    latitude: 27.1751,
    longitude: 78.0421,
  },
  {
    aliases: ["great wall of china", "great wall"],
    name: "Great Wall of China (Badaling)",
    latitude: 40.3559,
    longitude: 116.0176,
  },
  {
    aliases: ["sydney opera house"],
    name: "Sydney Opera House",
    latitude: -33.8568,
    longitude: 151.2153,
  },
  {
    aliases: ["golden gate bridge"],
    name: "Golden Gate Bridge, San Francisco",
    latitude: 37.8199,
    longitude: -122.4783,
  },
  {
    aliases: ["mount fuji", "mt fuji", "mt. fuji"],
    name: "Mount Fuji, Japan",
    latitude: 35.3606,
    longitude: 138.7274,
  },
  {
    aliases: ["grand canyon"],
    name: "Grand Canyon, Arizona",
    latitude: 36.1069,
    longitude: -112.1129,
  },
  {
    aliases: ["empire state building"],
    name: "Empire State Building, New York",
    latitude: 40.7484,
    longitude: -73.9857,
  },
  {
    aliases: ["burj khalifa"],
    name: "Burj Khalifa, Dubai",
    latitude: 25.1972,
    longitude: 55.2744,
  },
  {
    aliases: ["petra"],
    name: "Petra, Jordan",
    latitude: 30.3285,
    longitude: 35.4444,
  },
  {
    aliases: ["machu picchu"],
    name: "Machu Picchu, Peru",
    latitude: -13.1631,
    longitude: -72.5450,
  },
  {
    aliases: [
      "pyramids of giza",
      "great pyramid of giza",
      "great pyramid",
      "giza pyramids",
      "pyramids",
    ],
    name: "Pyramids of Giza, Egypt",
    latitude: 29.9792,
    longitude: 31.1342,
  },
  {
    aliases: ["leaning tower of pisa", "tower of pisa"],
    name: "Leaning Tower of Pisa",
    latitude: 43.7230,
    longitude: 10.3966,
  },
  {
    aliases: ["mount rushmore"],
    name: "Mount Rushmore, South Dakota",
    latitude: 43.8791,
    longitude: -103.4591,
  },
  {
    aliases: ["stonehenge"],
    name: "Stonehenge, England",
    latitude: 51.1789,
    longitude: -1.8262,
  },
  {
    aliases: ["neuschwanstein castle", "neuschwanstein"],
    name: "Neuschwanstein Castle, Germany",
    latitude: 47.5576,
    longitude: 10.7498,
  },
];

export function findLandmark(place: string): GeocodeResult | null {
  const normalized = place.toLowerCase().trim();

  for (const landmark of LANDMARKS) {
    if (
      landmark.aliases.some(
        (alias) => normalized.includes(alias) || alias.includes(normalized)
      )
    ) {
      return {
        name: landmark.name,
        latitude: landmark.latitude,
        longitude: landmark.longitude,
      };
    }
  }

  return null;
}