'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { polygonAmoy } from 'wagmi/chains';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { type ReactNode, useState } from 'react';
import { State, deserialize, serialize } from 'wagmi';

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