import React, { useState, useCallback, useEffect } from 'react';

interface Topic {
  name: string;
  lastMessage?: string;
  lastMessageTime?: number;
}

interface TopicSidebarProps {
  topics: Topic[];
  currentTopic: string;
  onTopicSelect: (topic: string) => void;
  onTopicCreate: (topic: string) => void;
  backgroundStyle: React.CSSProperties;
}

const TopicSidebar: React.FC<TopicSidebarProps> = ({ topics, currentTopic, onTopicSelect, onTopicCreate, backgroundStyle }) => {
  const [newTopic, setNewTopic] = useState('');
  const [sidebarWidth, setSidebarWidth] = useState(540); // Increased from 400 to 540 (35% wider)
  const [isResizing, setIsResizing] = useState(false);

  const handleCreateTopic = () => {
    if (newTopic.trim()) {
      onTopicCreate(newTopic.trim());
      setNewTopic('');
    }
  };

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        setSidebarWidth(mouseMoveEvent.clientX);
      }
    },
    [isResizing]
  );

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const truncateMessage = (message: string, maxLength: number) => {
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div 
      className="bg-black bg-opacity-50 text-gray-300 h-full relative"
      style={{ width: sidebarWidth, minWidth: '470px', maxWidth: '50%' }}
    >
      <div className="absolute inset-0" style={backgroundStyle}></div>
      <div className="relative z-10 p-4 overflow-y-auto h-full">
        <ul className="mb-4 space-y-2">
          {topics.map((topic) => (
            <li
              key={topic.name}
              className={`cursor-pointer p-3 rounded transition-colors duration-150 ease-in-out ${
                topic.name === currentTopic ? 'bg-gray-900 text-white' : 'hover:bg-gray-800'
              }`}
              onClick={() => onTopicSelect(topic.name)}
            >
              <div className="font-medium mb-1">{topic.name}</div>
              {topic.lastMessage && (
                <div className="text-sm text-gray-500">
                  {truncateMessage(topic.lastMessage, 40)}
                </div>
              )}
              {topic.lastMessageTime && (
                <div className="text-xs text-gray-600 mt-1">
                  {formatTime(topic.lastMessageTime)}
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <input
            type="text"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            className="w-full p-2 bg-gray-900 text-gray-300 border border-gray-700 rounded focus:outline-none focus:border-gray-500"
            placeholder="New topic name"
          />
          <button
            onClick={handleCreateTopic}
            className="w-full mt-2 p-2 bg-gray-800 text-gray-200 rounded hover:bg-gray-700 transition-colors duration-150 ease-in-out"
          >
            Create New Topic
          </button>
        </div>
      </div>
      <div
        className="absolute top-0 right-0 w-px h-full bg-gray-800 cursor-col-resize"
        onMouseDown={startResizing}
      />
    </div>
  );
};

export default TopicSidebar;
