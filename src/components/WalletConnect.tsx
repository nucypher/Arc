'use client';

import React from 'react';
import { ethers } from 'ethers';

interface WalletConnectProps {
  onConnect: (provider: ethers.providers.Web3Provider, account: string) => void;
  connectedAccount: string | null;
}

const WalletConnect: React.FC<WalletConnectProps> = ({ onConnect, connectedAccount }) => {
  const connectWallet = async () => {
    if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
      try {
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        onConnect(provider, address);
        console.log('Wallet connected successfully');
      } catch (err) {
        console.error('Failed to connect wallet:', err);
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
      className="px-4 py-2 bg-black text-white border border-white rounded hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600 transition-colors"
    >
      {connectedAccount ? truncateAddress(connectedAccount) : 'Connect Wallet'}
    </button>
  );
};

export default WalletConnect;
