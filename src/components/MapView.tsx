import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { sendLocationUpdate } from '../lib/waku';
import Blockie from './Blockie';
import makeBlockie from 'ethereum-blockies-base64';
import ChatBubble from './ChatBubble';
import TacoConditionBuilder from './TacoConditionBuilder';
import TacoDomainSelector from './TacoDomainSelector';
import * as ethers from 'ethers';

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;

// Add the LocationUpdate interface at the top of the file and export it
export interface LocationUpdate {
  sender: string;
  nickname: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  isLive: boolean;
  timestamp: number;
}

// Component to handle map updates
const MapUpdater: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15);
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
  onSendMessage: (e: React.FormEvent) => Promise<void>;
  inputText: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  messages: Message[];
  isCurrentUser: (sender: string) => boolean;
  canDecryptMessage: (condition?: string) => boolean;
  decryptingMessages: Set<number>;
  onRetryDecryption: (messageId: number) => void;
  isSettingsOpen: boolean;
  onCloseSettings: () => void;
  settingsContent: React.ReactNode;
  onNicknameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveNickname: () => void;
  isEditingNickname: boolean;
  setIsEditingNickname: (isEditing: boolean) => void;
  handleConditionChange: (condition: any) => void;
  handleDomainChange: (domain: any, ritualId: string) => void;
  currentDomain: any;
  web3Provider: ethers.providers.Web3Provider;
  condition: any;
  ritualId: string;
}

// Add this new interface for the LiveShareControl props
interface LiveShareControlProps {
  isSharing: boolean;
  isSettingUp: boolean;
  isReconnecting?: boolean;
  userPosition: [number, number] | null;
  onStartSharing: () => void;
  onStopSharing: () => void;
  onRecenter: () => void;
}

// Add a separate component for the recenter button
const RecenterControl: React.FC<{ userPosition: [number, number] | null; onRecenter: () => void }> = ({ 
  userPosition, 
  onRecenter 
}) => {
  if (!userPosition) return null;

  return (
    <div className="leaflet-top leaflet-left" style={{ zIndex: 1000 }}>
      <div className="leaflet-control leaflet-bar m-4">
        <button
          onClick={onRecenter}
          className="h-10 px-3 bg-gray-800 bg-opacity-90 text-white rounded hover:bg-gray-700 transition-colors duration-200 flex items-center shadow-lg border border-gray-600"
          title="Center on your location"
        >
          <svg 
            className="w-5 h-5 text-blue-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0" 
            />
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 2v4m0 12v4m10-10h-4m-12 0h-4" 
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Update the LiveShareControl to only handle sharing controls
const LiveShareControl: React.FC<Omit<LiveShareControlProps, 'onRecenter' | 'userPosition'>> = ({ 
  isSharing, 
  isSettingUp,
  isReconnecting = false,
  onStartSharing, 
  onStopSharing,
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
            <div className={`flex items-center justify-center bg-gray-800 bg-opacity-90 ${
              isReconnecting ? 'text-yellow-400' : 'text-green-400'
            } px-2 py-1 rounded shadow-lg border ${
              isReconnecting ? 'border-yellow-600' : 'border-gray-600'
            }`}>
              <div className={`w-2 h-2 ${
                isReconnecting ? 'bg-yellow-400' : 'bg-green-400'
              } rounded-full mr-2 animate-pulse`}></div>
              {isReconnecting ? 'Locating' : 'Live'}
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

// Update the createBlockieMarker function
const createBlockieMarker = (address: string, isUser: boolean = false) => {
  let blockieUrl;
  try {
    // Check if address is valid Ethereum address
    if (ethers.utils.isAddress(address)) {
      blockieUrl = makeBlockie(address);
    } else {
      // Use a default image for invalid addresses
      blockieUrl = makeBlockie('0x0000000000000000000000000000000000000000');
    }
  } catch (error) {
    console.error('Error creating blockie for address:', address, error);
    // Fallback to default blockie
    blockieUrl = makeBlockie('0x0000000000000000000000000000000000000000');
  }
  
  const color = isUser ? 'rgb(59, 130, 246)' : 'rgb(234, 179, 8)'; // blue-500 and yellow-500
  
  return new L.DivIcon({
    html: `
      <div class="relative">
        <img 
          src="${blockieUrl}" 
          class="w-8 h-8 rounded-full border-2"
          style="border-color: ${color}; box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.2)"
        />
        ${isUser ? `<div class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900" style="background-color: ${color}"></div>` : ''}
      </div>
    `,
    className: 'custom-blockie-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

// Add these styles to your global CSS file or add them inline in the component
const darkPopupStyle = `
  .dark-theme-popup .leaflet-popup-content-wrapper {
    background-color: #1a1a1a;
    color: #ffffff;
    border: 1px solid #333;
  }
  .dark-theme-popup .leaflet-popup-tip {
    background-color: #1a1a1a;
    border: 1px solid #333;
  }
  .dark-theme-popup .leaflet-popup-close-button {
    color: #666;
  }
  .dark-theme-popup .leaflet-popup-close-button:hover {
    color: #999;
  }
`;

// Add this CSS block near the top of the file, after imports
const mapStyles = `
  .leaflet-control-attribution {
    display: none;
  }
  .leaflet-control-container .leaflet-bottom.leaflet-right {
    display: none;
  }
`;

// Add this near the top with other interfaces
interface SaveIndicatorProps {
  isSaving: boolean;
  showSuccess: boolean;
}

// Add this component definition before MapView
const SaveIndicator: React.FC<SaveIndicatorProps> = ({ isSaving, showSuccess }) => {
  return (
    <div className="flex items-center justify-center space-x-2">
      <p className="text-sm text-gray-400">
        Settings are automatically saved
      </p>
      {isSaving && (
        <svg className="animate-spin h-4 w-4 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {showSuccess && !isSaving && (
        <svg 
          className="h-4 w-4 text-green-400 transition-opacity duration-200" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M5 13l4 4L19 7"
          />
        </svg>
      )}
    </div>
  );
};

const MapView: React.FC<MapViewProps> = ({
  messages,
  account,
  nickname,
  liveLocations,
  centerOnUser,
  onSendMessage,
  inputText,
  onInputChange,
  messages: chatMessages,
  isCurrentUser,
  canDecryptMessage,
  decryptingMessages,
  onRetryDecryption,
  isSettingsOpen,
  onCloseSettings,
  onNicknameChange,
  onSaveNickname,
  isEditingNickname,
  setIsEditingNickname,
  handleConditionChange,
  handleDomainChange,
  currentDomain,
  web3Provider,
  condition,
  ritualId,
}) => {
  const [isSharing, setIsSharing] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const [defaultCenter, setDefaultCenter] = useState<[number, number]>([0, 0]);
  const [hasSetInitialPosition, setHasSetInitialPosition] = useState(false);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [isSettingUpSharing, setIsSettingUpSharing] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  const requestLocationPermission = async (): Promise<GeolocationPosition | false> => {
    console.log('Requesting location permission...');
    if (!("geolocation" in navigator)) {
      console.error('Geolocation not supported');
      setIsReconnecting(true);
      return false;
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      console.log('Permission status:', permission.state);
      
      if (permission.state === 'denied') {
        console.error('Location permission denied');
        setIsReconnecting(true);
        return false;
      }

      // Get initial position if needed
      if (permission.state === 'prompt' || !userPosition) {
        console.log('Getting initial position...');
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: true,
              timeout: 20000,
              maximumAge: 5000
            }
          );
        });
        
        // Just store the position locally, don't send update yet
        setUserPosition([position.coords.latitude, position.coords.longitude]);
        return position;
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setIsReconnecting(true);
      return false;
    }
  };
  const startLocationWatch = useCallback((options: PositionOptions = {}) => {
    if ("geolocation" in navigator) {
      // Add a flag to ignore the first update
      let isFirstUpdate = true;

      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          setUserPosition([position.coords.latitude, position.coords.longitude]);
          setIsReconnecting(false);

          // Skip sending update for the first position as it's likely the same as our initial position
          if (isFirstUpdate) {
            isFirstUpdate = false;
            return;
          }

          try {
            await sendLocationUpdate(
              account,
              nickname,
              position.coords.latitude,
              position.coords.longitude,
              position.coords.accuracy,
              true,
              web3Provider,
              condition,
              currentDomain,
              ritualId
            );
          } catch (error) {
            console.error('Failed to send location update:', error);
          }
        },
        (error) => {
          console.warn('Location watch error:', error);
          setIsReconnecting(true);

          // If we get a timeout, try with more lenient settings
          if (error.code === error.TIMEOUT) {
            console.log('Timeout error, retrying with more lenient settings...');
            // Clear current watch
            if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current);
            }
            // Retry with more lenient settings
            startLocationWatch({
              enableHighAccuracy: false,
              timeout: 30000,
              maximumAge: 30000
            });
          }
          // For other errors, just keep trying with current settings
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 5000,
          ...options
        }
      );

      watchIdRef.current = watchId;
      return watchId;
    }
    return null;
  }, [account, nickname, web3Provider, condition, currentDomain, ritualId]);

  const startSharingLocation = async () => {
    console.log('Starting location sharing...');
    setIsSettingUpSharing(true);
    
    try {
      const permissionResult = await requestLocationPermission();
      console.log('Permission check result:', permissionResult);
      
      if (permissionResult) {
        // If we got a position from permission request, just store it locally
        if (permissionResult instanceof GeolocationPosition) {
          console.log('Setting initial position locally');
          setUserPosition([
            permissionResult.coords.latitude,
            permissionResult.coords.longitude
          ]);
          // Don't send an update here, let the watch handle it
        }

        // Add a small delay before starting the watch to ensure we don't get duplicate positions
        setTimeout(() => {
          startLocationWatch({
            // Start with less frequent updates initially
            maximumAge: 10000, // Use cached position if it's less than 10 seconds old
            timeout: 20000,
          });
          setIsSharing(true);
        }, 1000);
      }
    } catch (error) {
      console.error('Error setting up location sharing:', error);
      setIsReconnecting(true);
    } finally {
      setIsSettingUpSharing(false);
    }
  };

  const stopSharingLocation = () => {
    if (watchIdRef.current !== null) {
      console.log('Stopping location sharing, watch ID:', watchIdRef.current);
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsSharing(false);
      setIsReconnecting(false);
    }
  };

  // Update the initial position effect to use the same watching mechanism
  useEffect(() => {
    if (!hasSetInitialPosition && "geolocation" in navigator) {
      console.log('Getting initial position...');
      const positionPromise = new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 30000
          }
        );
      });

      positionPromise.then(
        (position) => {
          const newPosition: [number, number] = [position.coords.latitude, position.coords.longitude];
          setDefaultCenter(newPosition);
          setUserPosition(newPosition);
          setHasSetInitialPosition(true);
          console.log('Initial position set');
        }
      ).catch((error) => {
        console.warn('Error getting initial position:', error);
        // Set a default position but don't treat it as an error
        setDefaultCenter([51.505, -0.09]);
        setHasSetInitialPosition(true);
      });
    }
  }, [hasSetInitialPosition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Add effect to handle centering on user
  useEffect(() => {
    if (centerOnUser && liveLocations.has(centerOnUser)) {
      const userLocation = liveLocations.get(centerOnUser)!;
      console.log('Centering map on user:', {
        userId: centerOnUser,
        lat: userLocation.latitude,
        lng: userLocation.longitude
      });
      setDefaultCenter([userLocation.latitude, userLocation.longitude]);
    }
  }, [centerOnUser, liveLocations]);

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Parse location messages to get coordinates
  const locationMarkers = messages
    .filter(msg => msg.content.startsWith('📍 Location:'))
    .map(msg => {
      try {
        const [lat, lng] = msg.content
          .replace('📍 Location:', '')
          .trim()
          .split(',')
          .map(coord => parseFloat(coord.trim()));

        if (isNaN(lat) || isNaN(lng)) {
          console.warn('Invalid coordinates in message:', msg.content);
          return null;
        }

        return {
          position: [lat, lng] as [number, number],
          sender: msg.senderNickname,
          timestamp: msg.timestamp,
          isLive: false
        };
      } catch (error) {
        console.warn('Failed to parse location message:', msg.content, error);
        return null;
      }
    })
    .filter((marker): marker is NonNullable<typeof marker> => marker !== null);

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

  return (
    <div className="flex-1 relative">
      <style>{darkPopupStyle}</style>
      <style>{mapStyles}</style>
      
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={defaultCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          className="dark-theme-map"
        >
          <MapUpdater center={defaultCenter} />
          <TileLayer
            attribution={DARK_MAP_ATTRIBUTION}
            url={DARK_MAP_STYLE}
            className="dark-tiles"
          />
          <RecenterControl 
            userPosition={userPosition}
            onRecenter={() => {
              if (userPosition) {
                setDefaultCenter(userPosition);
              }
            }}
          />
          <LiveShareControl
            isSharing={isSharing}
            isSettingUp={isSettingUpSharing}
            isReconnecting={isReconnecting}
            onStartSharing={startSharingLocation}
            onStopSharing={stopSharingLocation}
          />
          {userPosition && (
            <Marker position={userPosition} icon={createBlockieMarker(account, true)}>
              <Popup className="dark-theme-popup">
                <div className="flex items-center">
                  <Blockie address={account} size={24} className="mr-2" />
                  <strong className="text-blue-400">Your Location</strong>
                </div>
                <small className="text-gray-400 block mt-1">Last updated: {new Date().toLocaleString()}</small>
              </Popup>
            </Marker>
          )}
          {allMarkers.map((marker, index) => (
            <Marker 
              key={index} 
              position={marker.position}
              icon={createBlockieMarker(marker.sender === account ? account : marker.sender)}
            >
              <Popup className="dark-theme-popup">
                <div className="flex items-center">
                  <Blockie address={marker.sender === account ? account : marker.sender} size={24} className="mr-2" />
                  <strong className="text-yellow-400">
                    {marker.sender === account ? 'You' : marker.sender}
                  </strong>
                </div>
                <small className="text-gray-400 block mt-1">
                  {new Date(marker.timestamp).toLocaleString()}
                </small>
                {marker.isLive && (
                  <div className="text-green-400 text-xs mt-1 flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></div>
                    Live
                  </div>
                )}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="absolute top-32 right-8 bottom-24 w-96 overflow-hidden z-[1000]">
        <div className="h-full overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {chatMessages.map((message) => (
            <div key={message.id} className="backdrop-blur-sm bg-black bg-opacity-30 rounded-lg">
              <ChatBubble
                message={message}
                isCurrentUser={isCurrentUser(message.sender)}
                canDecrypt={canDecryptMessage(message.condition)}
                isDecrypting={decryptingMessages.has(message.id)}
                onRetryDecryption={onRetryDecryption}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-4 left-4 right-4 bg-gray-900 bg-opacity-75 backdrop-blur-sm rounded-lg border border-gray-800 p-4 z-[1000]">
        <form 
          onSubmit={async (e) => {
            e.preventDefault();
            console.log('Form submitted in MapView, input text:', inputText);
            if (inputText.trim()) {
              try {
                await onSendMessage(e);
              } catch (error) {
                console.error('Error sending message:', error);
              }
            }
          }} 
          className="flex space-x-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={onInputChange}
            className="flex-grow px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-l focus:outline-none focus:ring-2 focus:ring-gray-600"
            placeholder="Type your message..."
          />
          <button 
            type="submit" 
            className={`px-4 py-2 ${
              inputText.trim() 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-gray-600 cursor-not-allowed'
            } text-white rounded-r transition-colors duration-200 flex items-center justify-center`}
            disabled={!inputText.trim()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </form>
      </div>

      {isSettingsOpen && (
        <div className="absolute inset-0 bg-black bg-opacity-50 z-[2000] flex justify-end">
          <div className="w-96 bg-gray-900 h-full overflow-y-auto border-l border-gray-800">
            <div className="p-6">
              <div className="flex justify-end mb-6">
                <button
                  onClick={onCloseSettings}
                  className="text-gray-400 hover:text-gray-300 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="border-b border-gray-800 pb-2">
                    <h3 className="text-lg font-medium text-gray-200">Identity</h3>
                    <p className="text-sm text-gray-400">Your profile settings</p>
                  </div>
                  <div className="bg-gray-800 bg-opacity-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Nickname</span>
                      <div className="flex items-center space-x-2">
                        {isEditingNickname ? (
                          <>
                            <input
                              type="text"
                              value={nickname}
                              onChange={onNicknameChange}
                              className="px-2 py-1 bg-gray-700 text-gray-200 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                              placeholder="Enter nickname"
                            />
                            <button
                              onClick={onSaveNickname}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              Save
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-gray-200">{nickname}</span>
                            <button
                              onClick={() => setIsEditingNickname(true)}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              Edit
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Wallet</span>
                      <div className="flex items-center space-x-2">
                        <Blockie address={account} size={20} className="mr-2" />
                        <span className="text-gray-200">{truncateAddress(account)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="border-b border-gray-800 pb-2">
                    <h3 className="text-lg font-medium text-gray-200">Message Encryption</h3>
                    <p className="text-sm text-gray-400">Choose how your messages will be encrypted</p>
                  </div>

                  <TacoConditionBuilder 
                    onConditionChange={handleConditionChange} 
                    isActive={isSettingsOpen}
                  />
                </div>

                <div className="space-y-4">
                  <div className="border-b border-gray-800 pb-2">
                    <h3 className="text-lg font-medium text-gray-200">Network</h3>
                    <p className="text-sm text-gray-400">Network and connection settings</p>
                  </div>
                  <div className="bg-gray-800 bg-opacity-50 rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Network</span>
                      <span className="text-gray-200">Polygon Amoy</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Taco Domain</span>
                      <div className="w-32">
                        <TacoDomainSelector 
                          onDomainChange={handleDomainChange} 
                          currentDomain={currentDomain} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-800">
                <SaveIndicator 
                  isSaving={isSavingSettings} 
                  showSuccess={showSaveSuccess}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;