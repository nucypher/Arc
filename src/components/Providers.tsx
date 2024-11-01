'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { polygonAmoy } from 'wagmi/chains';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { type ReactNode, useState } from 'react';
import { State, deserialize, serialize } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';

// Constants
const projectId = 'ad30b976755707360bac24e9e8f0d682';
const metadata = {
  name: 'Arc',
  description: 'Privacy-preserving location sharing',
  url: 'https://arc.chat',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

const chains = [polygonAmoy] as const;

// Create wagmi config
const config = createConfig({
  chains: [polygonAmoy],
  connectors: [
    injected({
      shimDisconnect: true,
      name: 'MetaMask',
    }),
    walletConnect({
      projectId,
      showQrModal: true,
      metadata,
    }),
  ],
  transports: {
    [polygonAmoy.id]: http(),
  },
  ssr: true,
});

// Create react-query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    },
  },
});

// Initialize modal
if (typeof window !== 'undefined') {
  try {
    createWeb3Modal({
      wagmiConfig: config,
      projectId,
      chains,
      defaultChain: polygonAmoy,
      themeMode: 'dark',
      themeVariables: {
        '--w3m-accent': '#3b82f6',
        '--w3m-background': '#1f2937',
        '--w3m-border-radius': '16px',
        '--w3m-z-index': '99999',
      },
      // Updated mobile wallet configuration
      mobileWallets: [
        {
          id: 'metamask',
          name: 'MetaMask',
          links: {
            native: 'metamask://',
            universal: 'https://metamask.app.link/dapp/arc.chat'
          }
        },
        {
          id: 'rainbow',
          name: 'Rainbow',
          links: {
            native: 'rainbow://',
            universal: 'https://rainbow.me/app'
          }
        },
        {
          id: 'trust',
          name: 'Trust Wallet',
          links: {
            native: 'trust://',
            universal: 'https://link.trustwallet.com/open_url?coin_id=60&url=https://arc.chat'
          }
        }
      ],
      // Updated desktop wallet configuration
      desktopWallets: [
        {
          id: 'metamask',
          name: 'MetaMask',
          links: {
            native: 'metamask://',
            universal: 'https://metamask.io/download.html'
          }
        },
        {
          id: 'rainbow',
          name: 'Rainbow',
          links: {
            native: 'rainbow://',
            universal: 'https://rainbow.me/download'
          }
        }
      ],
      // Updated wallet images with better quality
      walletImages: {
        metamask: 'https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg',
        rainbow: 'https://avatars.githubusercontent.com/u/48327834',
        trust: 'https://trustwallet.com/assets/images/media/assets/trust_platform.svg'
      },
      // Updated recommended wallets
      explorerRecommendedWalletIds: [
        'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
        '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust
        'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase
        '225affb176778569276e484e1b92637ad061b01e13a048b35a9d280c3b58970f', // Rainbow
      ],
      // Explicitly include all wallet IDs we want to support
      includeWalletIds: [
        'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
        '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust
        'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase
        '225affb176778569276e484e1b92637ad061b01e13a048b35a9d280c3b58970f', // Rainbow
      ],
      // Enable features for better mobile support
      featuredWalletIds: [
        'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
      ],
      enableExplorer: true,
      enableAccountView: true,
      enableNetworkView: true,
    });
  } catch (error) {
    console.error('Failed to initialize Web3Modal:', error);
  }
}

// Serialization functions for state hydration
const serializedState = typeof window !== 'undefined' 
  ? localStorage.getItem('wagmi') 
  : undefined;

const initialState = serializedState 
  ? deserialize(serializedState) as State 
  : undefined;

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
} 