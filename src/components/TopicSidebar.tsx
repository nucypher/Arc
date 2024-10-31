import React, { useState } from 'react';
import Blockie from './Blockie';

interface TopicSidebarProps {
  topics: Array<{
    name: string;
    lastMessage?: string;
    lastMessageTime?: number;
  }>;
  currentTopic: string;
  onTopicSelect: (topic: { name: string }) => void;
  onTopicCreate: (name: string) => void;
  backgroundStyle: React.CSSProperties;
  activeUsers?: Map<string, { nickname: string; lastSeen: number; address: string }>;
  onMemberClick?: (userId: string) => void;
}

const TopicSidebar: React.FC<TopicSidebarProps> = ({
  topics,
  currentTopic,
  onTopicSelect,
  onTopicCreate,
  activeUsers = new Map(),
  onMemberClick
}) => {
  const [newTopicName, setNewTopicName] = useState('');
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);

  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTopicName.trim()) {
      onTopicCreate(newTopicName.trim());
      setNewTopicName('');
      setIsCreatingTopic(false);
    }
  };

  const getTopicName = (fullPath: string) => {
    return fullPath.split('/').pop() || fullPath;
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="w-64 bg-gray-900 bg-opacity-75 backdrop-blur-sm border-r border-gray-800 overflow-y-auto z-[900] relative">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-200">Channels</h2>
          <button
            onClick={() => setIsCreatingTopic(true)}
            className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
            title="Create new channel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {isCreatingTopic && (
          <form onSubmit={handleCreateTopic} className="mb-4">
            <input
              type="text"
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              placeholder="New channel name"
              className="w-full px-3 py-2 bg-gray-800 bg-opacity-50 text-gray-200 rounded border border-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-gray-500"
            />
          </form>
        )}

        <div className="space-y-1">
          {topics.map((topic) => (
            <div key={topic.name} className="space-y-1">
              <button
                onClick={() => onTopicSelect(topic)}
                className={`w-full text-left px-3 py-2 rounded transition-colors duration-150 ${
                  currentTopic === topic.name
                    ? 'bg-blue-600 bg-opacity-50 text-white border border-blue-500'
                    : 'text-gray-300 hover:bg-gray-800 hover:bg-opacity-50 hover:text-gray-100'
                }`}
              >
                <div className="flex items-center">
                  <span className="text-gray-400 mr-2">#</span>
                  <span>{getTopicName(topic.name)}</span>
                </div>
              </button>
              
              {/* Show channel members if this is the current topic */}
              {currentTopic === topic.name && activeUsers.size > 0 && (
                <div className="bg-gray-800 bg-opacity-30 backdrop-blur-sm rounded">
                  <div className="px-3 py-2 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700 border-opacity-50">
                    Online
                  </div>
                  <div className="py-1">
                    {Array.from(activeUsers.entries()).map(([userId, user]) => (
                      <div 
                        key={userId} 
                        className="px-3 py-1 flex items-center text-sm text-gray-400 hover:bg-gray-700 hover:bg-opacity-50 transition-colors duration-150 cursor-pointer"
                        title={`Click to center map on ${user.nickname === 'Anonymous' ? truncateAddress(userId) : user.nickname}`}
                        onClick={() => onMemberClick?.(userId)}
                      >
                        <Blockie address={userId} size={20} className="mr-2" />
                        <span className="truncate flex-1">
                          {user.nickname === 'Anonymous' ? truncateAddress(userId) : user.nickname}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TopicSidebar;

