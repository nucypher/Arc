import React from 'react';
import { domains } from '@nucypher/taco';

interface WakuStatusProps {
  contentTopic: string | { name: string };
  nickname: string;
  tacoCondition: string | null;
  peerCount: number;
  isInitializing: boolean;
  tacoDomain: typeof domains;
  ethereumNetwork: string;
}

const WakuStatus: React.FC<WakuStatusProps> = ({ 
  contentTopic, 
  nickname, 
  tacoCondition, 
  peerCount, 
  isInitializing,
  tacoDomain,
  ethereumNetwork
}) => {
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

  const getNetworkName = (networkName: string): string => {
    switch (networkName.toLowerCase()) {
      case 'homestead':
        return 'Ethereum Mainnet';
      case 'amoy':
        return 'Polygon Amoy';
      default:
        return networkName;
    }
  };

  return (
    <div className="flex items-center space-x-4 text-sm text-black font-semibold bg-gray-100 p-2 pl-6 rounded-md">
      <div className="flex items-center" title="Waku connection status">
        <span className={`w-3 h-3 rounded-full mr-2 ${getStatusColor()}`}></span>
        <span>{getStatusText()}</span>
      </div>
      <div title={typeof contentTopic === 'string' ? contentTopic : contentTopic.name} className="flex items-center">
        <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/>
        </svg>
        <span>{getTopicDisplay(contentTopic)}</span>
      </div>
      <div title="Your nickname" className="flex items-center">
        <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span>{nickname}</span>
      </div>
      <div title="Taco Condition" className="flex items-center">
        <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
        </svg>
        <span>{tacoCondition || 'Not set'}</span>
      </div>
      <div title="Taco Domain" className="flex items-center">
        <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0-3-4.03-3-9s1.343-9 3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
        </svg>
        <span>{tacoDomain}</span>
      </div>
      <div title="Ethereum Network" className="flex items-center">
        <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
        <span>{getNetworkName(ethereumNetwork) || 'Not Connected'}</span>
      </div>
    </div>
  );
};

export default WakuStatus;
