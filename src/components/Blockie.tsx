import React from 'react';
import Image from 'next/image';
import makeBlockie from 'ethereum-blockies-base64';

interface BlockieProps {
  address: string;
  size?: number;
  className?: string;
}

const Blockie: React.FC<BlockieProps> = ({ address, size = 24, className = '' }) => {
  const blockieUrl = makeBlockie(address);

  return (
    <Image
      src={blockieUrl}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      alt={`${address} blockie`}
    />
  );
};

export default Blockie;