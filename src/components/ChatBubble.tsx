import React from 'react';

interface ChatBubbleProps {
  message: {
    id: number;
    sender: string;
    senderNickname: string;
    content: string;
    timestamp: number;
    encrypted: boolean;
    decrypted?: string;
  };
  isCurrentUser: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isCurrentUser }) => {
  const displayContent = message.encrypted ? message.decrypted || message.content : message.content;

  return (
    <div 
      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
    >
      <div 
        className={`max-w-[85%] p-4 rounded-lg shadow-md ${
          isCurrentUser 
            ? 'bg-gray-800 bg-opacity-50 text-gray-200 border border-gray-600' 
            : 'bg-gray-700 bg-opacity-50 text-gray-200 border border-gray-500'
        } backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-gray-700/20`}
      >
        <div className="font-bold text-sm mb-2 text-blue-300">
          {isCurrentUser ? 'You' : (message.senderNickname || message.sender.slice(0, 6))}
        </div>
        <div className="break-words">
          {displayContent}
        </div>
        <div className="text-xs text-gray-400 mt-2">
          {new Date(message.timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;
