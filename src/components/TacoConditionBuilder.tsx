'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { conditions } from '@nucypher/taco';
import { ethers } from 'ethers';

interface TacoConditionBuilderProps {
  onConditionChange: (condition: any) => void;
  isActive?: boolean;
}

export const chainIdMapping: { [key: string]: number } = {
  '137': 137,    // Polygon Mainnet
  '80001': 80001, // Mumbai Testnet
  '80002': 80002, // Amoy Testnet
  '1': 1,        // Ethereum Mainnet
  '11155111': 11155111 // Sepolia Testnet
};

type ConditionType = 'time' | 'erc20' | 'erc721';

const mapStyles = `
  /* Hide number input spinners */
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type=number] {
    -moz-appearance: textfield;
  }
`;

const TacoConditionBuilder: React.FC<TacoConditionBuilderProps> = ({ onConditionChange, isActive = false }) => {
  const [conditionType, setConditionType] = useState<ConditionType>('time');
  const [timestamp, setTimestamp] = useState(() => {
    // Initialize with current timestamp
    const now = Math.floor(Date.now() / 1000);
    return now.toString();
  });
  const [chain, setChain] = useState('80002'); // Default to Polygon Amoy
  const [contractAddress, setContractAddress] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [balance, setBalance] = useState('');
  const [isValidAddress, setIsValidAddress] = useState<boolean | null>(null);

  // Add debounce timer ref
  const debounceTimer = useRef<NodeJS.Timeout>();

  // Wrap condition updates in debounced function
  const debouncedUpdateCondition = useCallback((type: ConditionType, value: string) => {
    if (!isActive) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      let condition;
      switch (type) {
        case 'time':
          condition = new conditions.base.time.TimeCondition({
            returnValueTest: {
              comparator: '>=',
              value: parseInt(value),
            },
            method: "blocktime",
            chain: chainIdMapping[chain],
          });
          break;
        case 'erc20':
          condition = new conditions.predefined.erc20.ERC20Balance({
            contractAddress: value,
            chain: chainIdMapping[chain],
            returnValueTest: {
              comparator: '>=',
              value: ethers.utils.parseEther(balance || '0').toString(),
            },
          });
          break;
        case 'erc721':
          condition = new conditions.predefined.erc721.ERC721Ownership({
            contractAddress: value,
            chain: chainIdMapping[chain],
            parameters: [tokenId],
          });
          break;
      }
      if (condition) onConditionChange(condition);
    }, 500); // 500ms debounce
  }, [chain, balance, tokenId, onConditionChange, isActive]);

  const handleTimeChange = (newTime: string | number) => {
    if (!isActive) return;
    
    const time = typeof newTime === 'string' ? parseInt(newTime) : newTime;
    setTimestamp(time.toString());
    
    const condition = new conditions.base.time.TimeCondition({
      returnValueTest: {
        comparator: '>=',
        value: time,
      },
      method: "blocktime",
      chain: chainIdMapping[chain],
    });
    onConditionChange(condition);
  };

  const handleTimePresetClick = (minutes: number) => {
    if (!isActive) return;
    
    const futureTime = Math.floor(Date.now() / 1000) + minutes * 60;
    setTimestamp(futureTime.toString());
    
    const condition = new conditions.base.time.TimeCondition({
      returnValueTest: {
        comparator: '>=',
        value: futureTime,
      },
      method: "blocktime",
      chain: chainIdMapping[chain],
    });
    onConditionChange(condition);
  };

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const validateAddress = (address: string) => {
    try {
      if (!address) {
        setIsValidAddress(null);
        return false;
      }
      const isValid = ethers.utils.isAddress(address);
      setIsValidAddress(isValid);
      return isValid;
    } catch {
      setIsValidAddress(false);
      return false;
    }
  };

  return (
    <div className="space-y-6">
      <style>{mapStyles}</style>
      {/* Condition Type Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Condition Type</label>
        <select
          value={conditionType}
          onChange={(e) => {
            setConditionType(e.target.value as ConditionType);
            // Reset form when changing condition type
            setContractAddress('');
            setTokenId('');
            setBalance('');
          }}
          className="w-full px-3 py-2 bg-gray-700 text-gray-200 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
        >
          <option value="time">Time Lock</option>
          <option value="erc20">Token Balance</option>
          <option value="erc721">NFT Ownership</option>
        </select>
      </div>

      {/* Time-based Conditions */}
      {conditionType === 'time' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-300">Time Lock</label>
            <div className="flex space-x-2">
              <button
                onClick={() => handleTimePresetClick(5)}
                className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
              >
                5m
              </button>
              <button
                onClick={() => handleTimePresetClick(15)}
                className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
              >
                15m
              </button>
              <button
                onClick={() => handleTimePresetClick(60)}
                className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
              >
                1h
              </button>
            </div>
          </div>
          <input
            type="datetime-local"
            value={timestamp ? new Date(parseInt(timestamp) * 1000).toISOString().slice(0, 16) : ''}
            onChange={(e) => {
              const time = Math.floor(new Date(e.target.value).getTime() / 1000);
              handleTimeChange(time);
            }}
            className="w-full px-3 py-2 bg-gray-700 text-gray-200 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
          />
        </div>
      )}

      {/* Token Requirements */}
      {conditionType === 'erc20' && (
        <div className="space-y-4">
          <label className="text-sm font-medium text-gray-300">Token Requirements</label>
          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Token Contract Address"
                value={contractAddress}
                onChange={(e) => {
                  const address = e.target.value;
                  setContractAddress(address);
                  if (validateAddress(address)) {
                    debouncedUpdateCondition('erc20', address);
                  }
                }}
                className={`w-full px-3 py-2 bg-gray-700 text-gray-200 rounded border ${
                  isValidAddress === null 
                    ? 'border-gray-600' 
                    : isValidAddress 
                      ? 'border-green-500' 
                      : 'border-red-500'
                } focus:outline-none focus:border-blue-500 pr-10`}
              />
              {contractAddress && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {isValidAddress ? (
                    <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Minimum Balance"
                  value={balance}
                  onChange={(e) => {
                    try {
                      const ethValue = e.target.value;
                      if (ethValue === '') {
                        setBalance('');
                        return;
                      }
                      
                      // Ensure the value is positive
                      const parsedValue = parseFloat(ethValue);
                      if (parsedValue < 0) {
                        setBalance('0');
                        return;
                      }

                      setBalance(ethValue);
                      if (isValidAddress) {
                        // Convert ETH to wei for the condition
                        const weiValue = ethers.utils.parseEther(ethValue).toString();
                        const condition = new conditions.predefined.erc20.ERC20Balance({
                          contractAddress,
                          chain: chainIdMapping[chain],
                          returnValueTest: {
                            comparator: '>=',
                            value: weiValue,
                          },
                        });
                        onConditionChange(condition);
                      }
                    } catch (error) {
                      console.error('Error converting ETH to wei:', error);
                    }
                  }}
                  onKeyDown={(e) => {
                    // Only allow one decimal point
                    if (e.key === '.' && balance.includes('.')) {
                      e.preventDefault();
                    }
                    // Prevent negative signs and 'e'
                    if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                      e.preventDefault();
                    }
                  }}
                  className="w-full px-3 py-2 bg-gray-700 text-gray-200 rounded border border-gray-600 focus:outline-none focus:border-blue-500 pr-24"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                  Tokens
                </div>
              </div>
              {balance && (
                <div className="text-xs text-gray-400 pl-2">
                  {`${ethers.utils.parseEther(balance || '0').toString()} wei`}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NFT Requirements */}
      {conditionType === 'erc721' && (
        <div className="space-y-4">
          <label className="text-sm font-medium text-gray-300">NFT Requirements</label>
          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                placeholder="NFT Contract Address"
                value={contractAddress}
                onChange={(e) => {
                  const address = e.target.value;
                  setContractAddress(address);
                  if (validateAddress(address)) {
                    debouncedUpdateCondition('erc721', address);
                  }
                }}
                className={`w-full px-3 py-2 bg-gray-700 text-gray-200 rounded border ${
                  isValidAddress === null 
                    ? 'border-gray-600' 
                    : isValidAddress 
                      ? 'border-green-500' 
                      : 'border-red-500'
                } focus:outline-none focus:border-blue-500 pr-10`}
              />
              {contractAddress && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {isValidAddress ? (
                    <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
              )}
            </div>
            <input
              type="text"
              placeholder="Token ID"
              value={tokenId}
              onChange={(e) => {
                setTokenId(e.target.value);
                if (isValidAddress) {
                  debouncedUpdateCondition('erc721', contractAddress);
                }
              }}
              className="w-full px-3 py-2 bg-gray-700 text-gray-200 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Network Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Network</label>
        <select
          value={chain}
          onChange={(e) => {
            setChain(e.target.value);
            debouncedUpdateCondition(conditionType, timestamp || contractAddress);
          }}
          className="w-full px-3 py-2 bg-gray-700 text-gray-200 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
        >
          <option value="80002">Polygon Amoy</option>
          <option value="80001">Polygon Mumbai</option>
          <option value="137">Polygon Mainnet</option>
          <option value="11155111">Sepolia</option>
          <option value="1">Ethereum Mainnet</option>
        </select>
      </div>
    </div>
  );
};

export default TacoConditionBuilder;
