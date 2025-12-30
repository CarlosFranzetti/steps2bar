import { useState, useCallback, useEffect } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  isLoading: boolean;
}

const LOCATION_STORAGE_KEY = "steps2bar_saved_location";

interface SavedLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    isLoading: false,
  });

  // Load saved location on mount
  useEffect(() => {
    const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (saved) {
      try {
        const parsed: SavedLocation = JSON.parse(saved);
        // Use saved location if less than 24 hours old
        const isRecent = Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000;
        if (isRecent) {
          setState({
            latitude: parsed.latitude,
            longitude: parsed.longitude,
            error: null,
            isLoading: false,
          });
        }
      } catch {
        localStorage.removeItem(LOCATION_STORAGE_KEY);
      }
    }
  }, []);

  const saveLocation = useCallback((latitude: number, longitude: number) => {
    const data: SavedLocation = {
      latitude,
      longitude,
      timestamp: Date.now(),
    };
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(data));
  }, []);
  const clearSavedLocation = useCallback(() => {
    localStorage.removeItem(LOCATION_STORAGE_KEY);
  }, []);

  const setManualLocation = useCallback((latitude: number, longitude: number) => {
    setState({
      latitude,
      longitude,
      error: null,
      isLoading: false,
    });
    saveLocation(latitude, longitude);
  }, [saveLocation]);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: "Geolocation is not supported by your browser",
        isLoading: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setState({
          latitude,
          longitude,
          error: null,
          isLoading: false,
        });
        saveLocation(latitude, longitude);
      },
      (error) => {
        let errorMessage = "Unable to get your location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please enable location access in your browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again.";
            break;
        }
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isLoading: false,
        }));
      },
      {
        enableHighAccuracy: false, // Less strict for faster response
        timeout: 15000, // Longer timeout
        maximumAge: 300000, // Accept cached position up to 5 minutes old
      }
    );
  }, [saveLocation]);

  return { ...state, getLocation, clearSavedLocation, setManualLocation };
};
