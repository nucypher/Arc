import React from 'react';
import makeBlockie from 'ethereum-blockies-base64';
import Image from 'next/image';

interface BlockieProps {
  address: string;
  size?: number;
  className?: string;
}

const Blockie: React.FC<BlockieProps> = ({ address, size = 24, className = '' }) => {
  if (!address) {
    return null;
  }

  try {
    const blockieUrl = makeBlockie(address);

    return (
      <Image
        src={blockieUrl}
        alt={`Blockie for ${address}`}
        width={size}
        height={size}
        className={`rounded-full ${className}`}
      />
    );
  } catch (error) {
    console.error('Error generating blockie:', error);
    return null;
  }
};

export default Blockie;