"use client";

import { useEffect, useRef } from "react";

// Spotify's IFrame API has no official TS types — treat it as opaque.
declare global {
  interface Window {
    onSpotifyIframeApiReady?: (IFrameAPI: any) => void;
    __spotifyIframeAPI?: any;
  }
}

const SPOTIFY_IFRAME_API_SRC = "https://open.spotify.com/embed/iframe-api/v1";

type SpotifyPlayerProps = {
  trackId: string;
};

/**
 * Renders a Spotify embed and starts it playing automatically, using
 * Spotify's IFrame API instead of a bare <iframe src="...&autoplay=1">.
 *
 * Why: a plain iframe's autoplay query param is not something browsers
 * reliably honor for cross-origin, unmuted audio. Calling the API's own
 * `.play()` method, as a direct continuation of the user's "play this
 * song" request, is what browsers actually treat as permitted playback.
 *
 * Mount with `key={trackId}` from the parent so each new track gets a
 * fresh controller instead of trying to update one in place.
 */
export default function SpotifyPlayer({ trackId }: SpotifyPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let controller: any = null;

    function createController(IFrameAPI: any) {
      if (cancelled || !containerRef.current) return;
      IFrameAPI.createController(
        containerRef.current,
        { uri: `spotify:track:${trackId}`, width: "100%", height: "152" },
        (EmbedController: any) => {
          if (cancelled) return;
          controller = EmbedController;
          EmbedController.play();
        }
      );
    }

    if (window.__spotifyIframeAPI) {
      createController(window.__spotifyIframeAPI);
    } else {
      // The API script only needs to load once per page. If another
      // player mounted first and is still waiting, chain onto its
      // callback instead of overwriting it.
      const previousCallback = window.onSpotifyIframeApiReady;
      window.onSpotifyIframeApiReady = (IFrameAPI: any) => {
        window.__spotifyIframeAPI = IFrameAPI;
        previousCallback?.(IFrameAPI);
        createController(IFrameAPI);
      };

      if (!document.getElementById("spotify-iframe-api")) {
        const script = document.createElement("script");
        script.id = "spotify-iframe-api";
        script.src = SPOTIFY_IFRAME_API_SRC;
        script.async = true;
        document.body.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      controller?.destroy?.();
    };
  }, [trackId]);

  return <div ref={containerRef} className="spotify-player-mount" />;
}
