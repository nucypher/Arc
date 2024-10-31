'use client';

import React, { useEffect } from 'react';
import { ethers } from 'ethers';
import Blockie from './Blockie';
import { Web3Modal, useWeb3Modal } from '@web3modal/react';
import { EthereumClient, w3mConnectors, w3mProvider } from '@web3modal/ethereum';
import { configureChains, createConfig, WagmiConfig, useAccount, useConnect, useDisconnect } from 'wagmi';
import { polygon } from 'wagmi/chains';

interface WalletConnectProps {
  onConnect: (provider: ethers.providers.Web3Provider, account: string) => void;
  connectedAccount: string | null;
}

// Configure chains & providers
const chains = [polygon];
const projectId = 'ad30b976755707360bac24e9e8f0d682';

const { publicClient } = configureChains(chains, [w3mProvider({ projectId })]);
const wagmiConfig = createConfig({
  autoConnect: false,
  connectors: w3mConnectors({ projectId, chains }),
  publicClient
});

const ethereumClient = new EthereumClient(wagmiConfig, chains);

const WalletConnectButton: React.FC<WalletConnectProps> = ({ onConnect, connectedAccount }) => {
  const { open } = useWeb3Modal();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  // Update the useEffect to prevent infinite loop
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
      className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors duration-200 flex items-center space-x-2"
    >
      {displayAddress ? (
        <>
          <Blockie address={displayAddress} size={24} className="mr-2" />
          <span>{truncateAddress(displayAddress)}</span>
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
        }}
        defaultChain={polygon}
      />
    </>
  );
};

export default WalletConnect;
