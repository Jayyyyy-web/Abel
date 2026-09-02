"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

type MapViewProps = {
  place: string;
  latitude: number;
  longitude: number;
};

export default function MapView({ place, latitude, longitude }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [entering, setEntering] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;
    setEntering(true);

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [longitude, latitude],
      zoom: 3.5,
      pitch: 0,
      bearing: 0,
      antialias: true,
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 12,
      });
      map.setTerrain({ source: "mapbox-dem", exaggeration: 2.2 });

      map.addLayer({
        id: "sky",
        type: "sky",
        paint: {
          "sky-type": "atmosphere",
          "sky-atmosphere-sun-intensity": 10,
        },
      });

      map.setFog({
        range: [0.5, 10],
        color: "#2a2f45",
        "horizon-blend": 0.3,
        "high-color": "#1b1e33",
        "space-color": "#0a0b14",
        "star-intensity": 0.4,
      });

      // Real satellite imagery shows actual vegetation/terrain now, so
      // no synthetic vegetation overlay is needed here (that was a
      // stand-in for the old vector dark-v11 style, which had none).

      // Simple building meshes — plain shaded volumes, no pattern,
      // no outline overlay. Just clean solid 3D shapes.
      map.addLayer({
        id: "3d-buildings",
        source: "composite",
        "source-layer": "building",
        filter: ["==", "extrude", "true"],
        type: "fill-extrusion",
        minzoom: 13,
        paint: {
          "fill-extrusion-color": "#1c2733",
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": ["get", "min_height"],
          "fill-extrusion-opacity": 0.9,
          "fill-extrusion-vertical-gradient": true,
          // Buildings default to a flat height reference while terrain
          // undulates beneath them, which is what causes them to look
          // partly buried on sloped ground. Following the terrain slope
          // for both base and height keeps the whole building volume
          // sitting correctly on the land mesh.
          "fill-extrusion-base-alignment": "terrain",
          "fill-extrusion-height-alignment": "terrain",
        },
      });

      // Recolor the vector road/label overlay on top of the satellite
      // imagery to match the cyan console theme. Water and terrain are
      // baked into the satellite photo itself now, so those branches
      // are harmless no-ops on this style — left in since the same
      // code still applies cleanly if the base style ever changes back.
      // Wrapped per-layer in try/catch since not every layer supports
      // every paint property. Runs once the style has settled and
      // doesn't touch the flyTo below.
      try {
        const styleLayers = map.getStyle()?.layers ?? [];
        styleLayers.forEach((layer) => {
          try {
            if (layer.type === "background") {
              map.setPaintProperty(layer.id, "background-color", "#03060a");
            } else if (layer.type === "fill" && layer["source-layer"] === "water") {
              map.setPaintProperty(layer.id, "fill-color", "#040e18");
            } else if (layer.type === "line" && layer["source-layer"] === "road") {
              map.setPaintProperty(layer.id, "line-color", "#153542");
            } else if (layer.type === "symbol") {
              map.setPaintProperty(layer.id, "text-color", "#7fd8ea");
              map.setPaintProperty(layer.id, "text-halo-color", "#03060a");
            }
          } catch {
            // Layer doesn't support this property — skip it.
          }
        });
      } catch {}

      map.flyTo({
        center: [longitude, latitude],
        zoom: 15.5,
        pitch: 70,
        bearing: 120,
        duration: 4200,
        curve: 1.4,
        essential: true,
      });

      setTimeout(() => setEntering(false), 4200);
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.dragRotate.enable();
    map.touchZoomRotate.enableRotation();

    new mapboxgl.Marker({ color: "#ff3b3b" })
      .setLngLat([longitude, latitude])
      .addTo(map);

    return () => map.remove();
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