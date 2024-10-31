'use client';

import React, { useState, useEffect } from 'react';
import { conditions } from '@nucypher/taco';

export const chainIdMapping: { [key: string]: number } = {
  '137': 137,    // Polygon Mainnet
  '80001': 80001, // Mumbai Testnet
  '80002': 80002, // Amoy Testnet
  '1': 1,        // Ethereum Mainnet
  '11155111': 11155111 // Sepolia Testnet
};

interface TacoConditionBuilderProps {
  onConditionChange: (condition: any) => void;
}

const TacoConditionBuilder: React.FC<TacoConditionBuilderProps> = ({ onConditionChange }) => {
  const [conditionType, setConditionType] = useState('time');
  const [chain, setChain] = useState('11155111');
  const [timestamp, setTimestamp] = useState('');
  const [amount, setAmount] = useState('');
  const [contractAddress, setContractAddress] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const timePresets = [
    { label: 'now', value: 0 },
    { label: '1m', value: 60 },
    { label: '5m', value: 5 * 60 },
    { label: '15m', value: 15 * 60 },
    { label: '1h', value: 60 * 60 },
    { label: '1d', value: 24 * 60 * 60 },
  ];

  useEffect(() => {
    // Set the default timestamp to "Now" when the component mounts
    handleTimePresetClick(0);
  }, []);

  const handleTimePresetClick = (seconds: number) => {
    const newTimestamp = Math.floor(Date.now() / 1000) + seconds;
    setTimestamp(newTimestamp.toString());
    validateAndBuildCondition(newTimestamp.toString());
  };

  const validateAndBuildCondition = (timestampValue: string = timestamp) => {
    setError(null);
    setSuccess(null);

    let condition;
    try {
      const mappedChainId = chainIdMapping[chain];
      if (!mappedChainId) {
        throw new Error('Unsupported chain ID');
      }

      switch (conditionType) {
        case 'time':
          condition = new conditions.base.time.TimeCondition({
            chain: mappedChainId,
            returnValueTest: {
              comparator: '>=',
              value: parseInt(timestampValue),
            },
          });
          break;
        case 'ether':
          condition = new conditions.base.evm.EvmCondition({
            method: 'eth_getBalance',
            parameters: [':userAddress'],
            chain: mappedChainId,
            returnValueTest: {
              comparator: '>=',
              value: amount,
            },
          });
          break;
        case 'erc20':
          condition = new conditions.base.erc20.ERC20BalanceCondition({
            chain: mappedChainId,
            contractAddress,
            returnValueTest: {
              comparator: '>=',
              value: amount,
            },
          });
          break;
        case 'erc721':
          condition = new conditions.base.erc721.ERC721OwnershipCondition({
            chain: mappedChainId,
            contractAddress,
            returnValueTest: {
              comparator: '==',
              value: tokenId,
            },
          });
          break;
        case 'erc1155':
          condition = new conditions.base.erc1155.ERC1155BalanceCondition({
            chain: mappedChainId,
            contractAddress,
            tokenId,
            returnValueTest: {
              comparator: '>=',
              value: amount,
            },
          });
          break;
      }
      onConditionChange(condition);
      setSuccess('Condition generated successfully!');
      
      console.log('Full condition object:', condition);
    } catch (error) {
      console.error('Error creating condition:', error);
      setError('Failed to create condition. Please check your inputs.');
    }
  };

  return (
    <div className="bg-black text-white p-4 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-4">Taco Condition Builder</h2>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="relative">
          <select
            value={conditionType}
            onChange={(e) => setConditionType(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded appearance-none focus:outline-none focus:ring-2 focus:ring-gray-600 text-white"
          >
            <option value="time">Time</option>
            <option value="ether">Ether Balance</option>
            <option value="erc20">ERC20 Balance</option>
            <option value="erc721">ERC721 Ownership</option>
            <option value="erc1155">ERC1155 Balance</option>
          </select>
          <label className="absolute text-xs text-gray-400 -top-2 left-2 bg-black px-1">Condition Type</label>
        </div>
        <div className="relative">
          <select
            value={chain}
            onChange={(e) => setChain(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded appearance-none focus:outline-none focus:ring-2 focus:ring-gray-600 text-white"
          >
            <option value="11155111">Sepolia Testnet (11155111)</option>
            <option value="1">Ethereum Mainnet (1)</option>
            <option value="137">Polygon Mainnet (137)</option>
            <option value="80001">Mumbai Testnet (80001)</option>
            <option value="80002">Amoy Testnet (80002)</option>
          </select>
          <label className="absolute text-xs text-gray-400 -top-2 left-2 bg-black px-1">Chain</label>
        </div>
      </div>
      {conditionType === 'time' && (
        <>
          <div className="relative mb-4">
            <input
              type="number"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-gray-600 text-white"
              placeholder=" "
            />
            <label className="absolute text-xs text-gray-400 -top-2 left-2 bg-black px-1">Timestamp</label>
          </div>
          <div className="flex mb-4 overflow-x-auto">
            <div className="flex space-x-2">
              {timePresets.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => handleTimePresetClick(preset.value)}
                  className="flex-shrink-0 w-12 h-12 bg-gray-700 text-white text-xs rounded-lg hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600 flex items-center justify-center"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      {(conditionType === 'ether' || conditionType === 'erc20' || conditionType === 'erc1155') && (
        <div className="relative mb-4">
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-gray-600 text-white"
            placeholder=" "
          />
          <label className="absolute text-xs text-gray-400 -top-2 left-2 bg-black px-1">Amount</label>
        </div>
      )}
      {(conditionType === 'erc20' || conditionType === 'erc721' || conditionType === 'erc1155') && (
        <div className="relative mb-4">
          <input
            type="text"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-gray-600 text-white"
            placeholder=" "
          />
          <label className="absolute text-xs text-gray-400 -top-2 left-2 bg-black px-1">Contract Address</label>
        </div>
      )}
      {(conditionType === 'erc721' || conditionType === 'erc1155') && (
        <div className="relative mb-4">
          <input
            type="text"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-gray-600 text-white"
            placeholder=" "
          />
          <label className="absolute text-xs text-gray-400 -top-2 left-2 bg-black px-1">Token ID</label>
        </div>
      )}
      <button
        onClick={() => validateAndBuildCondition()}
        className="w-full p-2 bg-white text-black rounded hover:bg-gray-200 transition-colors"
      >
        Generate Condition
      </button>
      {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
      {success && <p className="mt-2 text-green-400 text-sm">{success}</p>}
    </div>
  );
};

export default TacoConditionBuilder;
