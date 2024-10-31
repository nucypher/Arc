'use client';

import React from 'react';
import { domains } from '@nucypher/taco';

interface TacoDomainSelectorProps {
  currentDomain: domains;
  onDomainChange: (domain: domains, ritualId: string) => void;
}

const TacoDomainSelector: React.FC<TacoDomainSelectorProps> = ({ currentDomain, onDomainChange }) => {
  const handleDomainChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedDomain = event.target.value as domains;
    const ritualId = selectedDomain === domains.TESTNET ? '6' : '26';
    onDomainChange(selectedDomain, ritualId);
  };

  return (
    <div className="relative inline-block">
      <select 
        value={currentDomain} 
        onChange={handleDomainChange}
        className="appearance-none bg-gray-800 text-white border border-gray-700 rounded px-4 py-2 pr-8 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
      >
        <option value={domains.TESTNET}>Testnet</option>
        <option value={domains.DEVNET}>Devnet</option>
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </div>
    </div>
  );
};

export default TacoDomainSelector;
