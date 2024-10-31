import React, { useState, useEffect, useRef } from 'react';
import { conditions } from '@nucypher/taco';

interface ChatBubbleProps {
  message: {
    id: number;
    sender: string;
    senderNickname: string;
    content: string;
    timestamp: number;
    encrypted: boolean;
    decrypted?: string;
    condition?: string;
  };
  isCurrentUser: boolean;
  canDecrypt: boolean;
  isDecrypting: boolean;
  onRetryDecryption: (messageId: number) => void;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ 
  message, 
  isCurrentUser, 
  canDecrypt, 
  isDecrypting,
  onRetryDecryption
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const displayContent = message.encrypted
    ? message.decrypted || '[Unable to decrypt]'
    : message.content;

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (message.condition && !canDecrypt) {
      const parsedCondition = JSON.parse(message.condition);
      if (parsedCondition.schema?._def?.typeName === 'ZodObject' && parsedCondition.value?.chain !== undefined) {
        const targetTime = parsedCondition.value.returnValueTest?.value * 1000; // Convert to milliseconds
        
        const updateTimeRemaining = () => {
          const now = Date.now();
          const diff = targetTime - now;
          if (diff > 0) {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeRemaining(`${days}d ${hours}h ${minutes}m ${seconds}s`);
          } else {
            setTimeRemaining('Decryption time reached');
            if (intervalRef.current) clearInterval(intervalRef.current);
          }
        };

        updateTimeRemaining();
        intervalRef.current = setInterval(updateTimeRemaining, 1000);
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [message.condition, canDecrypt]);

  const getConditionIcon = () => {
    if (!message.condition) return null;
    
    const parsedCondition = JSON.parse(message.condition);
    
    if (parsedCondition.schema?._def?.typeName === 'ZodObject') {
      if (parsedCondition.value?.chain !== undefined) {
        return (
          <div className="flex items-center">
            <span className="text-xs text-blue-400 mr-1">time locked</span>
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      } else if (parsedCondition.value?.contractAddress !== undefined) {
        return (
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      }
    }
    
    return (
      <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  };

  const getTooltipText = () => {
    if (canDecrypt) {
      return "You meet the conditions to decrypt this message.";
    } else if (timeRemaining) {
      return `Time remaining until decryption: ${timeRemaining}`;
    } else {
      return "You don't meet the conditions to decrypt this message.";
    }
  };

  return (
    <div 
      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} w-full`}
    >
      <div 
        className={`w-full p-4 rounded-lg shadow-lg ${
          isCurrentUser 
            ? 'text-gray-200'
            : 'text-gray-200'
        } backdrop-blur-sm transition-all duration-300`}
      >
        <div className="font-bold text-sm mb-2 text-blue-300 flex items-center justify-between">
          <span>{isCurrentUser ? 'You' : (message.senderNickname || message.sender.slice(0, 6))}</span>
          {message.condition && (
            <div className="relative">
              <button
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="focus:outline-none"
              >
                {getConditionIcon()}
              </button>
              {showTooltip && (
                <div className="absolute z-10 p-2 bg-gray-900 text-white text-xs rounded shadow-lg -top-8 right-0 whitespace-nowrap">
                  {getTooltipText()}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="break-words w-full">
          {isDecrypting ? (
            <div className="flex items-center space-x-2">
              <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-blue-500">Decrypting...</span>
            </div>
          ) : message.encrypted && !message.decrypted ? (
            <div>
              <span className="text-gray-400 italic">[Unable to decrypt]</span>
              <button
                onClick={() => onRetryDecryption(message.id)}
                className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors duration-200"
              >
                Retry Decryption
              </button>
            </div>
          ) : (
            displayContent
          )}
        </div>
        <div className="flex justify-between items-end mt-2">
          <div className="text-xs text-gray-400">
            {new Date(message.timestamp).toLocaleString()}
          </div>
          {timeRemaining && (
            <div className="text-xs text-blue-300 ml-4">
              {timeRemaining}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;
