// Loads the Google Maps JavaScript API script exactly once per page,
// regardless of how many times/components call this. Once the returned
// promise resolves, window.google.maps.importLibrary(...) is ready to use
// (that function is part of the core script, independent of which
// libraries — maps3d, geocoding, etc. — you import through it later).

declare global {
  interface Window {
    google?: any;
    __googleMapsLoadingPromise?: Promise<void>;
  }
}

export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("loadGoogleMaps must run in the browser"));
  }

  if (window.google?.maps?.importLibrary) {
    return Promise.resolve();
  }

  if (window.__googleMapsLoadingPromise) {
    return window.__googleMapsLoadingPromise;
  }

  window.__googleMapsLoadingPromise = new Promise<void>((resolve, reject) => {
    const callbackName = "__abelGoogleMapsReady";

    (window as any)[callbackName] = () => {
      delete (window as any)[callbackName];
      resolve();
    };

    const script = document.createElement("script");
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}` +
      `&v=weekly&loading=async&callback=${callbackName}`;
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load Google Maps JS API"));
    document.head.appendChild(script);
  });

  return window.__googleMapsLoadingPromise;
}
