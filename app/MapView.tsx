"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "../lib/googleMapsLoader";

type MapViewProps = {
  place: string;
  latitude: number;
  longitude: number;
};

// Camera framing, in Google's terms instead of Mapbox's zoom/pitch/bearing:
//   range   = distance from camera to target, in meters (bigger = further out)
//   tilt    = degrees off straight-down (0 = looking straight down, 90 = horizon)
//   heading = compass direction the camera faces, in degrees
const WIDE_CAMERA = { range: 8_000_000, tilt: 0, heading: 0 };
const CLOSE_CAMERA = { range: 900, tilt: 65, heading: 110 };
const FLY_IN_DURATION_MS = 4200;

export default function MapView({ place, latitude, longitude }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const map3DRef = useRef<any>(null);
  const [entering, setEntering] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setEntering(true);

    async function init() {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
      await loadGoogleMaps(apiKey);
      if (cancelled || !containerRef.current) return;

      const google = (window as any).google;
      const { Map3DElement } = await google.maps.importLibrary("maps3d");
      const { Marker3DElement } = await google.maps.importLibrary("maps3d");
      if (cancelled || !containerRef.current) return;

      // Start pulled back looking straight down, matching the previous
      // Mapbox intro framing, before flying in close and tilted.
      const map3D = new Map3DElement({
        center: { lat: latitude, lng: longitude, altitude: 0 },
        range: WIDE_CAMERA.range,
        tilt: WIDE_CAMERA.tilt,
        heading: WIDE_CAMERA.heading,
        mode: "SATELLITE",
      });
      map3DRef.current = map3D;

      // Appended as a child of the React-ref'd container, never replacing
      // the container itself — same reasoning as the Spotify player, so
      // React's own cleanup of this div is never fighting Google's.
      containerRef.current.appendChild(map3D);

      const marker = new Marker3DElement({
        position: { lat: latitude, lng: longitude, altitude: 0 },
      });
      map3D.append(marker);

      map3D.flyCameraTo({
        endCamera: {
          center: { lat: latitude, lng: longitude, altitude: 200 },
          range: CLOSE_CAMERA.range,
          tilt: CLOSE_CAMERA.tilt,
          heading: CLOSE_CAMERA.heading,
        },
        durationMillis: FLY_IN_DURATION_MS,
      });

      setTimeout(() => {
        if (!cancelled) setEntering(false);
      }, FLY_IN_DURATION_MS);
    }

    init();

    return () => {
      cancelled = true;
      map3DRef.current?.remove?.();
      map3DRef.current = null;
    };
  }, [latitude, longitude]);

  return (
    <div className="map-card nfs">
      <div ref={containerRef} className="map-card-canvas" />

      <div className="hud-corner hud-tl" />
      <div className="hud-corner hud-tr" />
      <div className="hud-corner hud-bl" />
      <div className="hud-corner hud-br" />

      <div className={`hud-label ${entering ? "hud-label-enter" : ""}`}>
        <div className="hud-label-eyebrow">Destination</div>
        <div className="hud-label-name">{place.split(",")[0]}</div>
      </div>

      <div className="hud-hint">drag to rotate · scroll to zoom</div>
    </div>
  );
}
