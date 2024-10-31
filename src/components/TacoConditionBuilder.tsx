'use client';

import React, { useState, useEffect } from 'react';
import { conditions } from '@nucypher/taco';

interface TacoConditionBuilderProps {
  onConditionChange: (condition: any) => void;
}

export const chainIdMapping: { [key: string]: number } = {
  '137': 137,    // Polygon Mainnet
  '80001': 80001, // Mumbai Testnet
  '80002': 80002, // Amoy Testnet
  '1': 1,        // Ethereum Mainnet
  '11155111': 11155111 // Sepolia Testnet
};

type ConditionType = 'time' | 'erc20' | 'erc721';

const TacoConditionBuilder: React.FC<TacoConditionBuilderProps> = ({ onConditionChange }) => {
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

  // Call updateCondition on mount with initial timestamp
  useEffect(() => {
    updateCondition('time', timestamp);
  }, []); // Empty dependency array means this runs once on mount

  const handleTimePresetClick = (minutes: number) => {
    const futureTime = Math.floor(Date.now() / 1000) + minutes * 60;
    setTimestamp(futureTime.toString());
    updateCondition('time', futureTime.toString());
  };

  const updateCondition = (type: ConditionType, value: string) => {
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
            value: parseInt(balance) || 1,
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
  };

  return (
    <div className="space-y-6">
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
              setTimestamp(time.toString());
              updateCondition('time', time.toString());
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
            <input
              type="text"
              placeholder="Token Contract Address"
              value={contractAddress}
              onChange={(e) => {
                setContractAddress(e.target.value);
                updateCondition('erc20', e.target.value);
              }}
              className="w-full px-3 py-2 bg-gray-700 text-gray-200 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
            />
            <input
              type="number"
              placeholder="Minimum Balance"
              value={balance}
              onChange={(e) => {
                setBalance(e.target.value);
                updateCondition('erc20', contractAddress);
              }}
              className="w-full px-3 py-2 bg-gray-700 text-gray-200 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* NFT Requirements */}
      {conditionType === 'erc721' && (
        <div className="space-y-4">
          <label className="text-sm font-medium text-gray-300">NFT Requirements</label>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="NFT Contract Address"
              value={contractAddress}
              onChange={(e) => {
                setContractAddress(e.target.value);
                updateCondition('erc721', e.target.value);
              }}
              className="w-full px-3 py-2 bg-gray-700 text-gray-200 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="Token ID"
              value={tokenId}
              onChange={(e) => {
                setTokenId(e.target.value);
                updateCondition('erc721', contractAddress);
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
            updateCondition(conditionType, timestamp || contractAddress);
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
