import React, { useState } from 'react';
import { domains } from '@nucypher/taco';
import { useNetwork } from 'wagmi';
import { WagmiConfig } from 'wagmi';
import { wagmiConfig } from './WalletConnect';

interface WakuStatusProps {
  contentTopic: string | { name: string };
  nickname: string;
  tacoCondition: string | null;
  peerCount: number;
  isInitializing: boolean;
  tacoDomain: typeof domains;
  ethereumNetwork: string;
  isSidebarCollapsed: boolean;
  onSidebarToggle: () => void;
}

const WakuStatusContent: React.FC<WakuStatusProps> = ({ 
  contentTopic, 
  nickname, 
  tacoCondition, 
  peerCount, 
  isInitializing,
  tacoDomain,
  ethereumNetwork,
  isSidebarCollapsed,
  onSidebarToggle
}) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });

  const { chain } = useNetwork();

  const getNetworkName = (networkName: string): string => {
    // First check if we have chain info from wagmi
    if (chain) {
      return chain.name;
    }

    // Fallback to the passed network name
    switch (networkName.toLowerCase()) {
      case 'homestead':
        return 'Ethereum Mainnet';
      case 'amoy':
        return 'Polygon Amoy';
      default:
        return networkName;
    }
  };

  const getTopicDisplay = (topic: string | { name: string }) => {
    if (typeof topic === 'string') {
      return topic;
    } else if (topic && typeof topic === 'object' && 'name' in topic) {
      return topic.name;
    }
    return 'No topic';
  };

  const getStatusColor = () => {
    if (isInitializing) return 'bg-yellow-500';
    if (peerCount > 0) return 'bg-green-500';
    return 'bg-red-500';
  };

  const getStatusText = () => {
    if (isInitializing) return 'Initializing';
    if (peerCount > 0) return `${peerCount} peers`;
    return 'No peers';
  };

  return (
    <div className="w-full bg-gray-900 bg-opacity-50 border-b border-gray-800">
      {/* Mobile toggle button */}
      <div className="lg:hidden w-full px-2 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between text-gray-300 hover:bg-gray-800 transition-colors duration-200">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            onClick={onSidebarToggle}
            className="p-1.5 sm:p-2 -ml-1 sm:-ml-2 hover:bg-gray-700 rounded-lg transition-colors duration-200"
          >
            <svg
              className={`w-5 h-5 sm:w-6 sm:h-6 text-gray-300 transform transition-transform duration-200 ${
                isSidebarCollapsed ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={isSidebarCollapsed ? "M13 5l7 7-7 7" : "M11 19l-7-7 7-7"}
              />
            </svg>
          </button>
          <div className="flex items-center">
            <span className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full mr-1.5 sm:mr-2 ${getStatusColor()}`}></span>
            <span className="text-sm sm:text-base">{getStatusText()}</span>
          </div>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <svg
            className={`w-5 h-5 transform transition-transform duration-200 ${
              isCollapsed ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Status details */}
      <div className={`
        ${isCollapsed ? 'hidden' : 'grid'} 
        lg:flex lg:flex-row lg:items-center 
        grid-cols-2 lg:grid-cols-none gap-2 lg:gap-4 
        text-sm text-black font-semibold 
        bg-gray-100 p-2 pl-6 rounded-md
      `}>
        {/* Connection Status */}
        <div className="flex flex-col space-y-1" title="Waku connection status">
          <div className="flex items-center">
            <span className={`w-3 h-3 rounded-full mr-2 ${getStatusColor()}`}></span>
            <span className="truncate">{getStatusText()}</span>
          </div>
          <span className="text-xs text-gray-500">Connection Status</span>
        </div>

        {/* Channel */}
        <div className="flex flex-col space-y-1" title={typeof contentTopic === 'string' ? contentTopic : contentTopic.name}>
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/>
            </svg>
            <span className="truncate">{getTopicDisplay(contentTopic)}</span>
          </div>
          <span className="text-xs text-gray-500">Current Channel</span>
        </div>

        {/* Nickname */}
        <div className="flex flex-col space-y-1" title="Your nickname">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span className="truncate">{nickname}</span>
          </div>
          <span className="text-xs text-gray-500">Your Identity</span>
        </div>

        {/* Taco Condition */}
        <div className="flex flex-col space-y-1 lg:hidden" title="Taco Condition">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
            <span className="truncate">{tacoCondition || 'Not set'}</span>
          </div>
          <span className="text-xs text-gray-500">Message Encryption</span>
        </div>

        {/* Taco Domain */}
        <div className="flex flex-col space-y-1 lg:hidden" title="Taco Domain">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0-3-4.03-3-9s1.343-9 3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
            </svg>
            <span className="truncate">{tacoDomain.toString()}</span>
          </div>
          <span className="text-xs text-gray-500">Network Domain</span>
        </div>

        {/* Ethereum Network */}
        <div className="flex flex-col space-y-1 lg:hidden" title="Ethereum Network">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            <span className="truncate">{getNetworkName(ethereumNetwork) || 'Not Connected'}</span>
          </div>
          <span className="text-xs text-gray-500">Blockchain Network</span>
        </div>

        {/* Desktop-only versions */}
        <div className="hidden lg:flex flex-col space-y-1" title="Taco Condition">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
            <span className="truncate">{tacoCondition || 'Not set'}</span>
          </div>
          <span className="text-xs text-gray-500">Message Encryption</span>
        </div>

        <div className="hidden lg:flex flex-col space-y-1" title="Taco Domain">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0-3-4.03-3-9s1.343-9 3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
            </svg>
            <span className="truncate">{tacoDomain.toString()}</span>
          </div>
          <span className="text-xs text-gray-500">Network Domain</span>
        </div>

        <div className="hidden lg:flex flex-col space-y-1" title="Ethereum Network">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            <span className="truncate">{getNetworkName(ethereumNetwork) || 'Not Connected'}</span>
          </div>
          <span className="text-xs text-gray-500">Blockchain Network</span>
        </div>
      </div>
    </div>
  );
};

// Wrap the component with WagmiConfig
const WakuStatus: React.FC<WakuStatusProps> = (props) => {
  return (
    <WagmiConfig config={wagmiConfig}>
      <WakuStatusContent {...props} />
    </WagmiConfig>
  );
};

export default WakuStatus;
