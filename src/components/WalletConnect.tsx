'use client';

import React from 'react';
import { ethers } from 'ethers';
import Blockie from './Blockie';

interface WalletConnectProps {
  onConnect: (provider: ethers.providers.Web3Provider, account: string) => void;
  connectedAccount: string | null;
}

const WalletConnect: React.FC<WalletConnectProps> = ({ onConnect, connectedAccount }) => {
  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        onConnect(provider, address);
      } catch (error) {
        console.error('Failed to connect wallet:', error);
      }
    } else {
      console.log('Please install MetaMask!');
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <button
      onClick={connectWallet}
      className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors duration-200 flex items-center space-x-2"
    >
      {connectedAccount ? (
        <>
          <Blockie address={connectedAccount} size={24} className="mr-2" />
          <span>{truncateAddress(connectedAccount)}</span>
        </>
      ) : (
        <span>Connect Wallet</span>
      )}
    </button>
  );
};

export default WalletConnect;
