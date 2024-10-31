'use client';

import React, { useEffect } from 'react';
import { ethers } from 'ethers';
import Blockie from './Blockie';
import { Web3Modal, useWeb3Modal } from '@web3modal/react';
import { EthereumClient, w3mConnectors, w3mProvider } from '@web3modal/ethereum';
import { configureChains, createConfig, WagmiConfig, useAccount, useConnect, useDisconnect } from 'wagmi';
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
const wagmiConfig = createConfig({
  autoConnect: false,
  connectors: w3mConnectors({ 
    projectId, 
    chains,
    version: 2,
    includeWalletConnect: true,
    includeCoinbaseWallet: false,
    includeInjected: true, // MetaMask and similar injected wallets
    includeMetaMask: true,
  }),
  publicClient
});

const ethereumClient = new EthereumClient(wagmiConfig, chains);

const WalletConnectButton: React.FC<WalletConnectProps> = ({ onConnect, connectedAccount }) => {
  const { open } = useWeb3Modal();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    if (isConnected && address && window.ethereum && !connectedAccount) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      onConnect(provider, address);
    }
  }, [isConnected, address, onConnect, connectedAccount]);

  const handleConnect = async () => {
    if (isConnected) {
      await disconnect();
      return;
    }

    try {
      await open();
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const displayAddress = address || connectedAccount;

  return (
    <button
      onClick={handleConnect}
      className="h-8 px-3 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center space-x-1"
    >
      {displayAddress ? (
        <>
          <Blockie address={displayAddress} size={16} className="mr-1.5" />
          <span className="truncate max-w-[80px] sm:max-w-[120px]">{truncateAddress(displayAddress)}</span>
        </>
      ) : (
        <span>Connect Wallet</span>
      )}
    </button>
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
