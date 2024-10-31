import React from 'react';
import Image from 'next/image';

interface AboutPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutPopup: React.FC<AboutPopupProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 bg-opacity-80 backdrop-filter backdrop-blur-md p-6 rounded-lg max-w-2xl w-full shadow-xl border border-gray-700 relative">
        {/* Title bar */}
        <div className="absolute top-0 left-0 right-0 bg-gray-800 bg-opacity-90 p-3 rounded-t-lg flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            About Arc
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="mt-12 text-gray-300">
          <p className="mb-4">
            Arc is a privacy-preserving, permissionless, decentralized location sharing application.
          </p>
          <ul className="list-disc list-inside mb-4">
            <li>Utilizes Waku nodes for decentralized message routing</li>
            <li>Implements Threshold&apos;s Taco for E2E encryption and access control</li>
          </ul>
          <div className="flex items-center justify-center space-x-4 mb-4">
            <a href="https://docs.waku.org/" target="_blank" rel="noopener noreferrer" className="flex items-center bg-gray-800 bg-opacity-70 px-3 py-2 rounded-lg hover:bg-opacity-100 transition-colors duration-200">
              <Image src="https://docs.waku.org/theme/image/logo.svg" alt="Waku" width={24} height={24} className="mr-2" />
              <span className="text-blue-400 hover:text-blue-300">Waku</span>
            </a>
            <a href="https://threshold.network/build/taco" target="_blank" rel="noopener noreferrer" className="flex items-center bg-gray-800 bg-opacity-70 px-3 py-2 rounded-lg hover:bg-opacity-100 transition-colors duration-200">
              <Image src="https://docs.threshold.network/~gitbook/image?url=https%3A%2F%2F2518393180-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FWosjlL4zUGUMlcMfuSAp%252Flogo%252FzAAyu1YeuoKu82a8J4Du%252Favatar-circle-purple.png%3Falt%3Dmedia%26token%3D8a013e20-022c-4fac-bf2d-166bba94e04d&width=128&dpr=2&quality=100&sign=b3490513&sv=1" alt="Taco" width={24} height={24} className="mr-2" />
              <span className="text-blue-400 hover:text-blue-300">Taco</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPopup; 