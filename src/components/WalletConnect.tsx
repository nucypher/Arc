'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ethers } from 'ethers';
import Blockie from './Blockie';
import { Web3Modal, useWeb3Modal } from '@web3modal/react';
import { EthereumClient, w3mConnectors, w3mProvider } from '@web3modal/ethereum';
import { configureChains, createConfig, WagmiConfig, useAccount, useConnect, useDisconnect, useSwitchNetwork, useNetwork } from 'wagmi';
import { Chain } from 'wagmi/chains';

interface WalletConnectProps {
  onConnect: (provider: ethers.providers.Web3Provider, account: string) => void;
  connectedAccount: string | null;
}

// Define Polygon Amoy testnet
const polygonAmoy: Chain = {
  id: 80002,
  name: 'Polygon Amoy',
  network: 'amoy',
  nativeCurrency: {
    decimals: 18,
    name: 'MATIC',
    symbol: 'MATIC',
  },
  rpcUrls: {
    public: { http: ['https://rpc-amoy.polygon.technology'] },
    default: { http: ['https://rpc-amoy.polygon.technology'] },
  },
  blockExplorers: {
    default: { name: 'OKLink', url: 'https://www.oklink.com/amoy' },
  },
  testnet: true,
};

// Configure chains & providers
const chains = [polygonAmoy];
const projectId = 'ad30b976755707360bac24e9e8f0d682';

const { publicClient } = configureChains(chains, [w3mProvider({ projectId })]);
export const wagmiConfig = createConfig({
  autoConnect: false,
  connectors: w3mConnectors({ 
    projectId, 
    chains,
    version: 2,
    includeWalletConnect: true,
    includeCoinbaseWallet: false,
    includeInjected: true,
    includeMetaMask: true,
  }),
  publicClient
});

const ethereumClient = new EthereumClient(wagmiConfig, chains);

const WalletConnectButton: React.FC<WalletConnectProps> = ({ onConnect, connectedAccount }) => {
  const { open } = useWeb3Modal();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchNetwork } = useSwitchNetwork();
  const { chain } = useNetwork();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleConnection = async () => {
      if (isConnected && address && window.ethereum && !connectedAccount) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // Check if we're on the correct network using wagmi's chain info
        if (chain?.id !== 80002) {
          console.log('Not on Polygon Amoy, switching networks...');
          try {
            await switchNetwork?.(80002);
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
  }, [isConnected, address, onConnect, connectedAccount, switchNetwork, chain?.id]);

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
      <WagmiConfig config={wagmiConfig}>
        <WalletConnectButton {...props} />
      </WagmiConfig>

      <Web3Modal
        projectId={projectId}
        ethereumClient={ethereumClient}
        themeMode="dark"
        themeVariables={{
          '--w3m-font-family': 'inherit',
          '--w3m-accent-color': '#3b82f6', // blue-500
          '--w3m-background-color': '#1f2937', // gray-800
          '--w3m-container-border-radius': '16px',
          '--w3m-wallet-icon-border-radius': '12px',
          '--w3m-wallet-icon-large-border-radius': '16px',
          '--w3m-z-index': '99999',
          '--w3m-background-border-radius': '24px',
          '--w3m-container-top-distance': '10%',
          '--w3m-container-position': 'fixed',
        }}
        defaultChain={polygonAmoy}
        explorerRecommendedWalletIds={[
          'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
          '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0'  // Trust Wallet
        ]}
        explorerExcludedWalletIds="ALL"
      />

      {/* Add global styles for Web3Modal */}
      <style jsx global>{`
        #w3m-modal {
          position: relative !important;
          height: auto !important;
          max-height: 90vh !important;
          margin: 20px auto !important;
          overflow-y: auto !important;
        }

        @media (max-width: 768px) {
          #w3m-modal {
            margin: 10px !important;
            max-height: 85vh !important;
          }
        }
      `}</style>
    </>
  );
};

export default WalletConnect;
