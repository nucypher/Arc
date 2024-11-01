'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ethers } from 'ethers';
import Blockie from './Blockie';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { useAccount, useDisconnect, useSwitchChain } from 'wagmi';
import { polygonAmoy } from 'wagmi/chains';

interface WalletConnectProps {
  onConnect: (provider: ethers.providers.Web3Provider, account: string) => void;
  connectedAccount: string | null;
}

const WalletConnectButton: React.FC<WalletConnectProps> = ({ onConnect, connectedAccount }) => {
  const { open } = useWeb3Modal();
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleConnection = async () => {
      if (isConnected && address && window.ethereum && !connectedAccount) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // Check if we're on the correct network
        if (chainId !== polygonAmoy.id) {
          console.log('Not on Polygon Amoy, switching networks...');
          try {
            await switchChain({ chainId: polygonAmoy.id });
            // Wait a moment for the network switch to complete
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Get fresh provider after network switch
            const updatedProvider = new ethers.providers.Web3Provider(window.ethereum);
            onConnect(updatedProvider, address);
          } catch (error) {
            console.error('Failed to switch network:', error);
          }
        } else {
          onConnect(provider, address);
        }
      }
    };

    handleConnection();
  }, [isConnected, address, onConnect, connectedAccount, switchChain, chainId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConnect = async () => {
    if (!isConnected) {
      try {
        await open();
      } catch (error) {
        console.error('Failed to connect:', error);
      }
    } else {
      setShowDropdown(!showDropdown);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    setShowDropdown(false);
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const displayAddress = address || connectedAccount;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleConnect}
        className="h-8 px-3 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center space-x-1"
      >
        {displayAddress ? (
          <>
            <Blockie address={displayAddress} size={16} className="mr-1.5" />
            <span className="truncate max-w-[80px] sm:max-w-[120px]">{truncateAddress(displayAddress)}</span>
            <svg 
              className={`w-4 h-4 ml-1 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        ) : (
          <span>Connect Wallet</span>
        )}
      </button>

      {/* Dropdown Menu */}
      {showDropdown && displayAddress && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl z-50">
          <div className="py-1">
            <button
              onClick={() => navigator.clipboard.writeText(displayAddress)}
              className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy Address
            </button>
            <button
              onClick={handleDisconnect}
              className="w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const WalletConnect: React.FC<WalletConnectProps> = (props) => {
  return (
    <>
      <WalletConnectButton {...props} />
    </>
  );
};

export default WalletConnect;
