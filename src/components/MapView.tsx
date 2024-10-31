import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { sendLocationUpdate, subscribeToLocationUpdates } from '../lib/wakuSetup';
import Blockie from './Blockie';

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create a custom icon for the user's location
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Create a custom icon for received location updates
const receivedLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map updates
const MapUpdater: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
};

interface MapViewProps {
  messages: Array<{
    content: string;
    timestamp: number;
    sender: string;
    senderNickname: string;
  }>;
  onShareLocation?: (location: { lat: number; lng: number }) => void;
  account: string;
  nickname: string;
  liveLocations: Map<string, LocationUpdate>;
  centerOnUser?: string;
}

interface LocationUpdate {
  sender: string;
  nickname: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  isLive: boolean;
}

// Add this new interface for the LiveShareControl props
interface LiveShareControlProps {
  isSharing: boolean;
  isSettingUp: boolean; // Add this new prop
  onStartSharing: () => void;
  onStopSharing: () => void;
}

// Add this new control component for the live sharing button
const LiveShareControl: React.FC<LiveShareControlProps> = ({ 
  isSharing, 
  isSettingUp,
  onStartSharing, 
  onStopSharing 
}) => {
  return (
    <div className="leaflet-top leaflet-right" style={{ zIndex: 1000 }}>
      <div className="leaflet-control leaflet-bar m-4">
        {!isSharing ? (
          <button
            onClick={onStartSharing}
            disabled={isSettingUp}
            className={`px-4 py-2 bg-gray-800 bg-opacity-90 text-white rounded hover:bg-gray-700 transition-colors duration-200 flex items-center shadow-lg border border-gray-600 ${
              isSettingUp ? 'opacity-75 cursor-not-allowed' : ''
            }`}
          >
            {isSettingUp ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-blue-400">Connecting...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-blue-400">Start Live Sharing</span>
              </>
            )}
          </button>
        ) : (
          <div className="flex flex-col space-y-2">
            <button
              onClick={onStopSharing}
              className="px-4 py-2 bg-gray-800 bg-opacity-90 text-white rounded hover:bg-gray-700 transition-colors duration-200 flex items-center shadow-lg border border-red-800"
            >
              <svg className="w-5 h-5 mr-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="text-red-400">Stop Sharing</span>
            </button>
            <div className="flex items-center justify-center bg-gray-800 bg-opacity-90 text-green-400 px-2 py-1 rounded shadow-lg border border-gray-600">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              Live
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Add this dark style URL for the map tiles
const DARK_MAP_STYLE = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const DARK_MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const MapView: React.FC<MapViewProps> = ({ messages, onShareLocation, account, nickname, liveLocations, centerOnUser }) => {
  const [isSharing, setIsSharing] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const [defaultCenter, setDefaultCenter] = useState<[number, number]>([0, 0]);
  const [hasSetInitialPosition, setHasSetInitialPosition] = useState(false);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSettingUpSharing, setIsSettingUpSharing] = useState(false); // Add this new state

  // Get user's initial position for map center
  useEffect(() => {
    if (!hasSetInitialPosition && "geolocation" in navigator) {
      console.log('Attempting to get initial position...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Initial position received:', {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          const newPosition: [number, number] = [position.coords.latitude, position.coords.longitude];
          setDefaultCenter(newPosition);
          setUserPosition(newPosition);
          setHasSetInitialPosition(true);
          setLocationError(null);
        },
        (error) => {
          console.error('Error getting initial location:', error, {
            code: error.code,
            message: error.message
          });
          const errorMessage = getGeolocationErrorMessage(error);
          setLocationError(errorMessage);
          console.log('Setting fallback position (London)');
          setDefaultCenter([51.505, -0.09]);
          setHasSetInitialPosition(true);
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0
        }
      );
    }
  }, [hasSetInitialPosition]);

  // Update user position regularly
  useEffect(() => {
    let watchId: number | null = null;
    
    if ("geolocation" in navigator) {
      console.log('Setting up position watching...');
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          console.log('Position update received:', {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp).toISOString()
          });
          setUserPosition([position.coords.latitude, position.coords.longitude]);
          setLocationError(null);
        },
        (error) => {
          console.error('Error watching position:', error, {
            code: error.code,
            message: error.message
          });
          const errorMessage = getGeolocationErrorMessage(error);
          setLocationError(errorMessage);
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 5000
        }
      );
      console.log('Position watching started with ID:', watchId);
    }

    return () => {
      if (watchId !== null) {
        console.log('Cleaning up position watching, ID:', watchId);
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const getGeolocationErrorMessage = (error: GeolocationPositionError): string => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return "Location access was denied. Please enable location services to use this feature.";
      case error.POSITION_UNAVAILABLE:
        return "Location information is unavailable. Please check your device's location settings.";
      case error.TIMEOUT:
        return "Location request timed out. Please check your internet connection and try again.";
      default:
        return "An unknown error occurred while trying to get your location.";
    }
  };

  // Parse location messages to get coordinates
  const locationMarkers = messages
    .filter(msg => msg.content.startsWith('📍 Location:'))
    .map(msg => {
      const url = msg.content.split(': ')[1];
      const coords = url.split('?q=')[1].split(',').map(Number);
      return {
        position: coords as [number, number],
        sender: msg.senderNickname,
        timestamp: msg.timestamp
      };
    });

  const requestLocationPermission = async (): Promise<boolean> => {
    console.log('Requesting location permission...');
    if (!("geolocation" in navigator)) {
      console.error('Geolocation not supported');
      setLocationError("Geolocation is not supported by your browser");
      return false;
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      console.log('Permission status:', permission.state);
      
      if (permission.state === 'denied') {
        console.error('Location permission denied');
        setLocationError("Location access is denied. Please enable location services in your browser settings.");
        return false;
      }

      if (permission.state === 'prompt') {
        console.log('Triggering permission prompt...');
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        });
        console.log('Permission prompt handled');
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      if (error instanceof GeolocationPositionError) {
        const errorMessage = getGeolocationErrorMessage(error);
        console.error('Geolocation error details:', {
          code: error.code,
          message: error.message,
          friendlyMessage: errorMessage
        });
        setLocationError(errorMessage);
      } else {
        setLocationError("Failed to get location permission");
      }
      return false;
    }
  };

  const startSharingLocation = async () => {
    console.log('Starting location sharing...');
    setIsSettingUpSharing(true);
    
    try {
      const hasPermission = await requestLocationPermission();
      console.log('Permission check result:', hasPermission);
      if (!hasPermission) {
        setIsSettingUpSharing(false);
        return;
      }

      if ("geolocation" in navigator) {
        console.log('Setting up live location sharing...');
        
        // First get a single position with high accuracy
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
              }
            );
          });

          // If we got an initial position, start watching with more lenient settings
          console.log('Got initial position, starting watch');
          watchIdRef.current = navigator.geolocation.watchPosition(
            async (position) => {
              console.log('Live sharing position update:', {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: new Date(position.timestamp).toISOString()
              });

              try {
                await sendLocationUpdate(
                  account,
                  nickname,
                  position.coords.latitude,
                  position.coords.longitude,
                  position.coords.accuracy,
                  true
                );
              } catch (error) {
                console.error('Failed to send location update:', error);
              }

              if (onShareLocation) {
                onShareLocation({
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
                });
              }
              setLocationError(null);
            },
            (error) => {
              console.error('Error in live location sharing:', error, {
                code: error.code,
                message: error.message
              });
              const errorMessage = getGeolocationErrorMessage(error);
              setLocationError(errorMessage);
              
              // Only stop and retry if it's a timeout error
              if (error.code === error.TIMEOUT) {
                console.log('Timeout error, retrying with more lenient settings...');
                stopSharingLocation();
                retryWithLongerTimeout();
              }
            },
            {
              enableHighAccuracy: false, // Less strict accuracy for continuous updates
              timeout: 15000,           // 15 second timeout
              maximumAge: 10000,        // Accept positions up to 10 seconds old
              maximumAge: 10000
            }
          );
          console.log('Live sharing watch started with ID:', watchIdRef.current);
          setIsSharing(true);
        } catch (initialError) {
          console.error('Failed to get initial position:', initialError);
          // Fall back to less accurate watching immediately
          retryWithLongerTimeout();
        }
      } else {
        console.error('Geolocation not supported');
        setLocationError("Geolocation is not supported by your browser");
      }
    } catch (error) {
      console.error('Error setting up location sharing:', error);
      setLocationError("Failed to set up location sharing");
    } finally {
      setIsSettingUpSharing(false);
    }
  };

  const retryWithLongerTimeout = () => {
    if ("geolocation" in navigator) {
      console.log('Retrying location watch with lenient settings');
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          console.log('Position update from retry:', {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp).toISOString()
          });

          try {
            await sendLocationUpdate(
              account,
              nickname,
              position.coords.latitude,
              position.coords.longitude,
              position.coords.accuracy,
              true
            );
          } catch (error) {
            console.error('Failed to send location update during retry:', error);
          }

          if (onShareLocation) {
            onShareLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          }
          setLocationError(null);
        },
        (error) => {
          console.error('Error in retry location watching:', error);
          const errorMessage = getGeolocationErrorMessage(error);
          setLocationError(errorMessage);
          stopSharingLocation();
        },
        {
          enableHighAccuracy: false,    // Don't require high accuracy
          timeout: 30000,               // 30 second timeout
          maximumAge: 30000             // Accept positions up to 30 seconds old
        }
      );
      setIsSharing(true);
    }
  };

  const stopSharingLocation = () => {
    if (watchIdRef.current !== null) {
      console.log('Stopping location sharing, watch ID:', watchIdRef.current);
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsSharing(false);
    }
  };

  // Add effect to handle centering on user
  useEffect(() => {
    if (centerOnUser && liveLocations.has(centerOnUser)) {
      const userLocation = liveLocations.get(centerOnUser)!;
      setDefaultCenter([userLocation.latitude, userLocation.longitude]);
    }
  }, [centerOnUser, liveLocations]);

  if (!hasSetInitialPosition) {
    return (
      <div className="flex-1 bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <svg 
            className="animate-spin h-10 w-10 text-blue-500 mb-4 mx-auto" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <div className="text-blue-400 text-lg font-semibold">Loading map...</div>
          <div className="text-gray-400 text-sm mt-2">Getting your location</div>
        </div>
      </div>
    );
  }

  // Add live location markers to the map
  const allMarkers = [
    ...locationMarkers,
    ...[...liveLocations.values()].map(update => ({
      position: [update.latitude, update.longitude] as [number, number],
      sender: update.nickname,
      timestamp: update.timestamp,
      isLive: update.isLive
    }))
  ];

  return (
    <div className="flex-1 bg-gray-900">
      <div className="text-gray-300 h-full flex flex-col">
        {locationError && (
          <div className="p-3 bg-red-900 bg-opacity-50 border border-red-700 text-red-200">
            {locationError}
          </div>
        )}

        {/* Map - now using dark theme */}
        <div className="flex-1 relative">
          <MapContainer
            center={defaultCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false} // Hide default zoom control
            className="dark-theme-map" // Add custom class for additional styling
          >
            <MapUpdater center={defaultCenter} />
            <TileLayer
              attribution={DARK_MAP_ATTRIBUTION}
              url={DARK_MAP_STYLE}
              className="dark-tiles"
            />
            {/* Add zoom control in custom position */}
            <div className="leaflet-control-container">
              <div className="leaflet-top leaflet-left">
                <div className="leaflet-control-zoom leaflet-bar leaflet-control">
                  <a className="leaflet-control-zoom-in" href="#" title="Zoom in" role="button" aria-label="Zoom in">+</a>
                  <a className="leaflet-control-zoom-out" href="#" title="Zoom out" role="button" aria-label="Zoom out">−</a>
                </div>
              </div>
            </div>
            {/* Live sharing control */}
            <LiveShareControl
              isSharing={isSharing}
              isSettingUp={isSettingUpSharing}
              onStartSharing={startSharingLocation}
              onStopSharing={stopSharingLocation}
            />
            {/* User position marker */}
            {userPosition && (
              <Marker position={userPosition} icon={userIcon}>
                <Popup className="dark-theme-popup">
                  <div className="text-gray-200 bg-gray-800 p-2 rounded">
                    <div className="flex items-center">
                      <Blockie address={account} size={24} className="mr-2" />
                      <strong className="text-blue-400">Your Location</strong>
                    </div>
                    <small className="text-gray-400 block mt-1">Last updated: {new Date().toLocaleString()}</small>
                  </div>
                </Popup>
              </Marker>
            )}
            {/* Other location markers */}
            {allMarkers.map((marker, index) => (
              <Marker 
                key={index} 
                position={marker.position}
                icon={receivedLocationIcon}
              >
                <Popup className="dark-theme-popup">
                  <div className="text-gray-200 bg-gray-800 p-2 rounded">
                    <div className="flex items-center">
                      <Blockie address={marker.sender} size={24} className="mr-2" />
                      <strong className="text-yellow-400">{marker.sender}</strong>
                    </div>
                    <small className="text-gray-400 block mt-1">{new Date(marker.timestamp).toLocaleString()}</small>
                    {marker.isLive && (
                      <div className="text-green-400 text-xs mt-1 flex items-center">
                        <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></div>
                        Live
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default MapView;