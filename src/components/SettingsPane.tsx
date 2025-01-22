import React, { useState, useEffect } from 'react';
import TacoConditionBuilder from './TacoConditionBuilder';
import TacoDomainSelector from './TacoDomainSelector';
import Blockie from './Blockie';
import { useAccount } from 'wagmi';
import { revokeDelegation, initializeEncryptorSigner, getDelegationStatus } from '../lib/taco';
import { ethers } from 'ethers';

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
  web3Provider: ethers.providers.Web3Provider;
}

const DelegationStatus: React.FC<{
  isActive: boolean;
  timeRemaining: string | null;
}> = ({ isActive, timeRemaining }) => (
  <div className="flex items-center space-x-2">
    <div className={`w-2 h-2 rounded-full ${
      isActive ? 'bg-green-400 animate-pulse' : 'bg-red-400'
    }`} />
    <span className={`text-sm ${isActive ? 'text-green-400' : 'text-red-400'}`}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
    {isActive && timeRemaining && (
      <span className="text-xs text-gray-400">
        ({timeRemaining} remaining)
      </span>
    )}
  </div>
);

const SettingsPane: React.FC<SettingsPaneProps> = ({
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
  web3Provider,
}) => {
  const { address } = useAccount();
  
  const displayAddress = address || connectedAccount;

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const [delegationActive, setDelegationActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);

  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60));
    if (minutes < 1) return 'less than a minute';
    if (minutes === 1) return '1 minute';
    return `${minutes} minutes`;
  };

  const checkProvider = async () => {
    try {
      if (!web3Provider) {
        setProviderError('Wallet not connected');
        return false;
      }
      
      const signer = web3Provider.getSigner();
      await signer.getAddress();
      
      setProviderError(null);
      return true;
    } catch (error) {
      setProviderError('Error accessing wallet');
      return false;
    }
  };

  const delegationSection = (
    <section className="space-y-3">
      <div className="flex items-center space-x-2 text-gray-300">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
        <h3 className="text-sm font-medium">Encryption Delegation</h3>
      </div>
      <div className="bg-gray-800 rounded-lg p-3 space-y-3">
        <div className="flex justify-between items-center">
          <DelegationStatus isActive={delegationActive} timeRemaining={timeRemaining} />
          <div className="flex space-x-2">
            {delegationActive ? (
              <button
                onClick={async () => {
                  setIsRevoking(true);
                  try {
                    revokeDelegation();
                    setDelegationActive(false);
                    setTimeRemaining(null);
                  } catch (error) {
                    console.error('Failed to revoke delegation:', error);
                  } finally {
                    setIsRevoking(false);
                  }
                }}
                disabled={isRevoking || isCreating}
                className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
              >
                {isRevoking ? (
                  <div className="flex items-center space-x-1">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Revoking...</span>
                  </div>
                ) : 'Revoke'}
              </button>
            ) : (
              <button
                onClick={async () => {
                  setProviderError(null);
                  if (!await checkProvider()) {
                    return;
                  }
                  
                  setIsCreating(true);
                  try {
                    await initializeEncryptorSigner(web3Provider, true);
                    const status = getDelegationStatus();
                    setDelegationActive(status.isActive);
                    if (status.timeRemaining) {
                      setTimeRemaining(formatTimeRemaining(status.timeRemaining));
                    }
                  } catch (error) {
                    console.error('Failed to create delegation:', error);
                    setProviderError('Failed to create delegation');
                  } finally {
                    setIsCreating(false);
                  }
                }}
                disabled={isCreating || isRevoking}
                className={`px-3 py-1.5 ${
                  isCreating
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } rounded text-sm transition-colors duration-200`}
              >
                {isCreating ? (
                  <div className="flex items-center space-x-1">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Creating...</span>
                  </div>
                ) : 'Create New'}
              </button>
            )}
          </div>
        </div>
        
        {providerError && (
          <div className="mt-2 text-sm text-red-400 flex items-center space-x-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{providerError}</span>
          </div>
        )}
        
        <p className="text-xs text-gray-400">
          {delegationActive 
            ? 'Encryption delegation is active. Messages will be encrypted without additional signatures.'
            : 'Create a new delegation to encrypt messages without repeated signature requests.'}
        </p>
      </div>
    </section>
  );

  useEffect(() => {
    checkProvider();
  }, [web3Provider]);

  useEffect(() => {
    const checkDelegationStatus = () => {
      const status = getDelegationStatus();
      setDelegationActive(status.isActive);
      if (status.isActive && status.timeRemaining > 0) {
        setTimeRemaining(formatTimeRemaining(status.timeRemaining));
      } else {
        setTimeRemaining(null);
      }
    };

    checkDelegationStatus();

    const interval = setInterval(checkDelegationStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!delegationActive) return;

    const interval = setInterval(() => {
      const status = getDelegationStatus();
      if (!status.isActive || status.timeRemaining <= 0) {
        setDelegationActive(false);
        setTimeRemaining(null);
      } else {
        setTimeRemaining(formatTimeRemaining(status.timeRemaining));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [delegationActive]);

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-[2000] flex justify-end transition-opacity duration-200">
      <div className="w-96 bg-gray-900 h-full overflow-y-auto border-l border-gray-800 shadow-2xl">
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

        <div className="p-4 space-y-6">
          <section className="space-y-3">
            <div className="flex items-center space-x-2 text-gray-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              <h3 className="text-sm font-medium">Identity</h3>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 space-y-3">
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

          {delegationSection}

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

export default SettingsPane; 