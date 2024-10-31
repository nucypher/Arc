import React from 'react';
import TacoConditionBuilder from './TacoConditionBuilder';
import TacoDomainSelector from './TacoDomainSelector';
import Blockie from './Blockie';
import { useAccount, WagmiConfig } from 'wagmi';
import { wagmiConfig } from './WalletConnect'; // We'll export wagmiConfig from WalletConnect

interface SettingsPaneProps {
  onClose: () => void;
  nickname: string;
  onNicknameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveNickname: () => void;
  isEditingNickname: boolean;
  setIsEditingNickname: (isEditing: boolean) => void;
  handleConditionChange: (condition: any) => void;
  handleDomainChange: (domain: any, ritualId: string) => void;
  currentDomain: any;
  connectedAccount: string | null;
}

const SettingsPaneContent: React.FC<SettingsPaneProps> = ({
  onClose,
  nickname,
  onNicknameChange,
  onSaveNickname,
  isEditingNickname,
  setIsEditingNickname,
  handleConditionChange,
  handleDomainChange,
  currentDomain,
  connectedAccount,
}) => {
  // Get the current account from wagmi
  const { address } = useAccount();
  
  // Use either the wagmi address or the passed connectedAccount
  const displayAddress = address || connectedAccount;

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-[2000] flex justify-end transition-opacity duration-200">
      <div className="w-96 bg-gray-900 h-full overflow-y-auto border-l border-gray-800 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <h2 className="text-lg font-semibold text-white">Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-800 rounded-full transition-colors duration-200"
            >
              <svg className="w-5 h-5 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Settings Content */}
        <div className="p-4 space-y-6">
          {/* Identity Section */}
          <section className="space-y-3">
            <div className="flex items-center space-x-2 text-gray-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              <h3 className="text-sm font-medium">Identity</h3>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 space-y-3">
              {/* Wallet Address */}
              {displayAddress && (
                <div className="flex items-center justify-between p-2 bg-gray-700 bg-opacity-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Blockie address={displayAddress} size={24} className="rounded-full" />
                    <span className="text-sm text-gray-300 font-mono">
                      {truncateAddress(displayAddress)}
                    </span>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(displayAddress)}
                    className="text-gray-400 hover:text-gray-300 transition-colors"
                    title="Copy address"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Nickname */}
              {isEditingNickname ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={nickname}
                    onChange={onNicknameChange}
                    className="flex-grow px-3 py-1.5 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter nickname"
                  />
                  <button
                    onClick={onSaveNickname}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">Nickname:</span>
                    <span className="text-gray-200">{nickname}</span>
                  </div>
                  <button
                    onClick={() => setIsEditingNickname(true)}
                    className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Encryption Settings */}
          <section className="space-y-3">
            <div className="flex items-center space-x-2 text-gray-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              <h3 className="text-sm font-medium">Message Encryption</h3>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <TacoConditionBuilder onConditionChange={handleConditionChange} />
            </div>
          </section>

          {/* Network Settings */}
          <section className="space-y-3">
            <div className="flex items-center space-x-2 text-gray-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0-3-4.03-3-9s1.343-9 3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
              </svg>
              <h3 className="text-sm font-medium">Network</h3>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <TacoDomainSelector onDomainChange={handleDomainChange} currentDomain={currentDomain} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const SettingsPane: React.FC<SettingsPaneProps> = (props) => {
  return (
    <WagmiConfig config={wagmiConfig}>
      <SettingsPaneContent {...props} />
    </WagmiConfig>
  );
};

export default SettingsPane; 