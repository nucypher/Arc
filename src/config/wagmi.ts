'use client';

import { createConfig, http } from 'wagmi';
import { polygonAmoy } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// Constants
export const PROJECT_ID = 'ad30b976755707360bac24e9e8f0d682';
export const CHAINS = [polygonAmoy] as const;

// Create wagmi config
export const config = createConfig({
  chains: CHAINS,
  connectors: [
    injected(),
    walletConnect({
      projectId: PROJECT_ID,
      showQrModal: true,
      metadata: {
        name: 'Arc',
        description: 'Privacy-preserving location sharing',
        url: 'https://arc.chat',
        icons: ['https://avatars.githubusercontent.com/u/37784886'],
      },
    }),
  ],
  transports: {
    [polygonAmoy.id]: http(),
  },
  ssr: true,
});

export { config as wagmiConfig };