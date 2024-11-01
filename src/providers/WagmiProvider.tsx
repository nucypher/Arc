import { WagmiConfig } from 'wagmi';
import { wagmiConfig } from '../components/WalletConnect';

export const WagmiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <WagmiConfig config={wagmiConfig}>{children}</WagmiConfig>;
}; 