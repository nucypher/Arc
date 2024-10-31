'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { initializeTaco, encryptMessage, decryptMessage } from '../lib/tacoSetup';
import { createNode, subscribeToMessages, sendWakuMessage, defaultContentTopic, getWakuNodeStatus } from '../lib/wakuSetup';
import { ThresholdMessageKit, domains, conditions } from '@nucypher/taco';
import WalletConnect from './WalletConnect';
import TacoConditionBuilder from './TacoConditionBuilder';
import TacoDomainSelector from './TacoDomainSelector';
import WakuStatus from './WakuStatus';
import TopicSidebar from './TopicSidebar';
import ChatBubble from './ChatBubble';

interface Message {
  id: number;
  sender: string;
  senderNickname: string;
  content: string;
  timestamp: number;
  encrypted: boolean;
  messageKit?: ThresholdMessageKit;
  decrypted?: string;
}

interface Topic {
  name: string;
  lastMessage?: string;
  lastMessageTime?: number;
}

const ChatInterfaceInner: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [web3Provider, setWeb3Provider] = useState<ethers.providers.Web3Provider | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [condition, setCondition] = useState<any>(null);
  const [conditionDescription, setConditionDescription] = useState<string | null>(null);
  const [currentDomain, setCurrentDomain] = useState<domains>(domains.TESTNET);
  const [error, setError] = useState<string | null>(null);
  const [isTacoInitialized, setIsTacoInitialized] = useState(false);
  const [isConditionBuilderVisible, setIsConditionBuilderVisible] = useState(true);
  const [nickname, setNickname] = useState<string>(() => {
    return localStorage.getItem('userNickname') || 'Anonymous';
  });
  const [isEditingNickname, setIsEditingNickname] = useState<boolean>(false);
  const [topics, setTopics] = useState<{ name: string; lastMessage?: string; lastMessageTime?: number; }[]>([
    { name: defaultContentTopic, lastMessage: "Welcome to the default topic!", lastMessageTime: Date.now() }
  ]);
  const [currentTopic, setCurrentTopic] = useState<{ name: string }>({ name: defaultContentTopic });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [peerCount, setPeerCount] = useState(0);
  const [ritualId, setRitualId] = useState<string>('6'); // Default to Testnet ritual ID
  const [isWakuReady, setIsWakuReady] = useState(false);
  const [isTacoReady, setIsTacoReady] = useState(false);
  const [wakuNode, setWakuNode] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [sentMessageIds, setSentMessageIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const init = async () => {
      setIsInitializing(true);
      try {
        await initializeTaco();
        console.log('TACo initialized successfully');
      } catch (error) {
        console.error('Failed to initialize TACo:', error);
      }

      try {
        const node = await createNode();
        setWakuNode(node);
        console.log('Waku node initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Waku:', error);
      }

      setIsInitializing(false);
    };
    init();
  }, []);

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const LockIcon = () => (
    <svg className="inline-block w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );

  const UnlockIcon = () => (
    <svg className="inline-block w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
    </svg>
  );

  useEffect(() => {
    const setupWeb3 = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          // Request account access
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          setWeb3Provider(provider);
          const signer = provider.getSigner();
          const address = await signer.getAddress();
          setAccount(address);
          console.log('Web3 initialized, account:', address);
        } catch (error) {
          console.error('Failed to initialize Web3:', error);
        }
      } else {
        console.log('Please install MetaMask!');
      }
    };

    setupWeb3();
  }, []);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        await initializeTaco();
        console.log('TACo initialized successfully');
        setInitializationError(null);
      } catch (error) {
        console.error('Failed to initialize TACo:', error);
        setInitializationError(`Failed to initialize TACo: ${error.message}`);
      }
    };

    initializeChat();
  }, []);

  const setupSubscription = useCallback(async () => {
    if (wakuNode && currentTopic) {
      console.log(`Setting up message subscription for topic: ${currentTopic.name}`);
      try {
        await subscribeToMessages(currentTopic.name, async (decodedMessage: any) => {
          console.log('Received message:', decodedMessage);
          // Check if the message is from the current user
          if (decodedMessage.sender === account && sentMessageIds.has(decodedMessage.timestamp)) {
            console.log('Ignoring message from self');
            return; // Skip processing messages from self
          }
          try {
            console.log('Attempting to decrypt message...');
            const messageKit = ThresholdMessageKit.fromBytes(decodedMessage.content);
            const decrypted = await decryptMessage(messageKit, web3Provider, currentDomain);
            const decryptedContent = new TextDecoder().decode(decrypted);
            console.log('Message decrypted successfully:', decryptedContent);

            const newMessage: Message = {
              id: decodedMessage.timestamp,
              sender: decodedMessage.sender,
              senderNickname: decodedMessage.nickname,
              content: decryptedContent,
              timestamp: decodedMessage.timestamp,
              encrypted: false,
            };
            setMessages(prevMessages => {
              const updatedMessages = [...prevMessages, newMessage];
              return updatedMessages.sort((a, b) => a.timestamp - b.timestamp);
            });
          } catch (error) {
            console.error('Error processing received message:', error);
          }
        });
        console.log(`Successfully set up subscription for topic: ${currentTopic.name}`);
      } catch (error) {
        console.error('Error setting up message subscription:', error);
      }
    }
  }, [wakuNode, currentTopic, web3Provider, currentDomain, account, sentMessageIds]);

  useEffect(() => {
    if (wakuNode && currentTopic) {
      setupSubscription();
    }
  }, [wakuNode, currentTopic, setupSubscription]);

  const handleWalletConnect = async (provider: ethers.providers.Web3Provider, connectedAccount: string) => {
    setWeb3Provider(provider);
    setAccount(connectedAccount);
    console.log('Wallet connected:', connectedAccount);
  };

  const handleConditionChange = (newCondition: any) => {
    setCondition(newCondition);
    // Create a shorthand description of the condition
    let description = 'Unknown condition';
    if (newCondition) {
      if (newCondition instanceof conditions.base.time.TimeCondition) {
        const value = newCondition.returnValueTest?.value;
        description = value ? `Time: ${new Date(value * 1000).toLocaleString()}` : 'Time condition';
      } else if (newCondition instanceof conditions.base.evm.EvmCondition) {
        description = `EVM: ${newCondition.method || 'Unknown method'}`;
      } else if (newCondition instanceof conditions.base.erc20.ERC20BalanceCondition) {
        description = `ERC20: ${newCondition.contractAddress?.slice(0, 6) || 'Unknown'}...`;
      } else if (newCondition instanceof conditions.base.erc721.ERC721OwnershipCondition) {
        description = `ERC721: ${newCondition.contractAddress?.slice(0, 6) || 'Unknown'}...`;
      } else if (newCondition instanceof conditions.base.erc1155.ERC1155BalanceCondition) {
        description = `ERC1155: ${newCondition.contractAddress?.slice(0, 6) || 'Unknown'}...`;
      } else {
        console.log('Unrecognized condition type:', newCondition.constructor.name);
      }
    }
    setConditionDescription(description);
  };

  const handleDomainChange = (domain: domains, newRitualId: string) => {
    setCurrentDomain(domain);
    setRitualId(newRitualId);
  };

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNickname(e.target.value);
  };

  const saveNickname = () => {
    const trimmedNickname = nickname.trim();
    if (trimmedNickname) {
      localStorage.setItem('userNickname', trimmedNickname);
      setNickname(trimmedNickname);
    } else {
      setNickname('Anonymous');
      localStorage.removeItem('userNickname');
    }
    setIsEditingNickname(false);
  };

  useEffect(() => {
    const savedNickname = localStorage.getItem('userNickname');
    if (savedNickname) {
      setNickname(savedNickname);
    }
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !account || !web3Provider || !condition) {
      setError("Please ensure you're connected and have set a condition before sending a message.");
      return;
    }

    try {
      console.log('Encrypting message...');
      console.log('Condition:', condition);
      console.log('Domain:', currentDomain);
      console.log('Ritual ID:', ritualId);
      const messageKit = await encryptMessage(inputText.trim(), web3Provider, condition, currentDomain, ritualId);
      console.log('Message encrypted successfully:', messageKit);

      if (wakuNode) {
        console.log('Sending encrypted message via Waku...');
        const messageKitBytes = messageKit.toBytes();
        await sendWakuMessage(currentTopic.name, account, messageKitBytes, nickname);
        console.log('Encrypted message sent via Waku');
        
        const newMessageId = Date.now();
        const newMessage: Message = {
          id: newMessageId,
          sender: account,
          senderNickname: nickname,
          content: inputText.trim(),
          timestamp: newMessageId,
          encrypted: true,
          decrypted: inputText.trim(),
        };
        setMessages(prevMessages => {
          const updatedMessages = [...prevMessages, newMessage];
          return updatedMessages.sort((a, b) => a.timestamp - b.timestamp);
        });
        setSentMessageIds(prev => new Set(prev).add(newMessageId));
        setInputText('');
      } else {
        console.warn('Waku is not initialized. Message encrypted but not sent.');
      }
    } catch (error) {
      console.error('Error encrypting or sending message:', error);
      setError(`Failed to process message: ${error.message}`);
    }
  };

  const handleTopicSelect = (topicName: string) => {
    setCurrentTopic({ name: topicName });
    // You might want to clear messages or fetch messages for the new topic here
    setMessages([]);
  };

  const handleTopicCreate = (newTopic: string) => {
    if (!topics.some(topic => topic.name === newTopic)) {
      setTopics(prevTopics => [...prevTopics, { name: newTopic, lastMessage: "Welcome to the new topic!", lastMessageTime: Date.now() }]);
      setCurrentTopic({ name: newTopic });
      // You might want to clear messages or perform other actions for the new topic
      setMessages([]);
    }
  };

  const updateTopicWithNewMessage = (topicName: string, message: string) => {
    setTopics(prevTopics => prevTopics.map(topic => 
      topic.name === topicName 
        ? { ...topic, lastMessage: message, lastMessageTime: Date.now() } 
        : topic
    ));
  };

  const toggleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen);
  };

  useEffect(() => {
    const updatePeerCount = () => {
      if (wakuNode) {
        const status = getWakuNodeStatus();
        setPeerCount(status.peerCount);
      }
    };

    updatePeerCount();
    const interval = setInterval(updatePeerCount, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [wakuNode]);

  const generateStars = useCallback((count: number) => {
    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        cx: Math.random() * 100 + '%',
        cy: Math.random() * 100 + '%',
        r: Math.random() * 0.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.3
      });
    }
    return stars;
  }, []);

  const stars = useMemo(() => generateStars(200), [generateStars]);

  const backgroundStyle = {
    background: 'linear-gradient(to bottom right, #000000, #0a0a2a, #000000)',
    opacity: 0.2,
  };

  const toggleAbout = () => {
    setIsAboutOpen(!isAboutOpen);
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white relative overflow-hidden">
      {/* Subtle blue-black gradient background */}
      <div className="absolute inset-0" style={backgroundStyle}></div>
      
      {/* Starfield background */}
      <div className="absolute inset-0 z-0">
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="transparent" />
          {stars.map((star, index) => (
            <circle
              key={index}
              cx={star.cx}
              cy={star.cy}
              r={star.r}
              fill="white"
              opacity={star.opacity}
            />
          ))}
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="translate"
            from="0 0"
            to="100 100"
            dur="60s"
            repeatCount="indefinite"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="flex flex-col h-full z-10">
        <div className="w-full bg-gray-900 bg-opacity-50 border-b border-gray-800">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center">
              <svg className="w-8 h-8 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <h1 className="text-2xl font-bold">Arc</h1>
            </div>
            <div className="flex items-center space-x-4">
              <WalletConnect onConnect={handleWalletConnect} connectedAccount={account} />
              <button
                onClick={toggleAbout}
                className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors duration-200"
              >
                About
              </button>
              <button
                onClick={toggleSettings}
                className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200"
                title="Settings"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
          <WakuStatus 
            contentTopic={currentTopic.name} 
            nickname={nickname} 
            tacoCondition={conditionDescription}
            peerCount={peerCount}
            isInitializing={isInitializing}
          />
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          <TopicSidebar
            topics={topics}
            currentTopic={currentTopic.name}
            onTopicSelect={handleTopicSelect}
            onTopicCreate={handleTopicCreate}
            backgroundStyle={backgroundStyle}
          />
          <div className="flex-1 flex flex-col overflow-hidden">
            {isSettingsOpen && (
              <div className="p-6 bg-gray-900 border-b border-gray-800 overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6 text-gray-100">Settings</h2>
                <div className="space-y-8">
                  <div className="bg-black p-6 rounded-lg border border-gray-800 shadow-lg">
                    <h3 className="text-lg font-semibold mb-4 text-gray-200">Nickname</h3>
                    {isEditingNickname ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={nickname}
                          onChange={handleNicknameChange}
                          className="flex-grow px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                          placeholder="Enter nickname"
                        />
                        <button
                          onClick={saveNickname}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 text-lg">{nickname}</span>
                        <button
                          onClick={() => setIsEditingNickname(true)}
                          className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600 transition-colors duration-200"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="bg-black p-6 rounded-lg border border-gray-800 shadow-lg">
                    <h3 className="text-lg font-semibold mb-4 text-gray-200">Taco Domain</h3>
                    <TacoDomainSelector currentDomain={currentDomain} onDomainChange={handleDomainChange} />
                  </div>
                  <div className="bg-black p-6 rounded-lg border border-gray-800 shadow-lg">
                    <h3 className="text-lg font-semibold mb-4 text-gray-200">Taco Condition</h3>
                    <TacoConditionBuilder onConditionChange={handleConditionChange} />
                  </div>
                </div>
              </div>
            )}
            <div className="flex-grow overflow-y-auto p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <ChatBubble
                    key={message.id}
                    message={{
                      id: message.id,
                      sender: message.sender,
                      senderNickname: message.senderNickname,
                      content: message.content,
                      timestamp: message.timestamp,
                      encrypted: message.encrypted,
                      decrypted: message.decrypted
                    }}
                    isCurrentUser={message.sender === account}
                  />
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-800">
              <form onSubmit={handleSendMessage} className="flex">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-grow px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-l focus:outline-none focus:ring-2 focus:ring-gray-600"
                  placeholder="Type your message..."
                />
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded-r hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center"
                  disabled={!condition || !web3Provider}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      
      {initializationError && (
        <div className="p-2 bg-red-600 text-white absolute bottom-0 left-0 right-0">
          {initializationError}. Please check the console for more details and try refreshing the page.
        </div>
      )}

      {/* About popup */}
      {isAboutOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg max-w-2xl">
            <h2 className="text-2xl font-bold mb-4">About Arc</h2>
            <p className="mb-4">
              Arc is a privacy-preserving, permissionless, decentralized chat application that leverages cutting-edge technologies to ensure secure and private communication.
            </p>
            <ul className="list-disc list-inside mb-4">
              <li>Built on libp2p for peer-to-peer networking</li>
              <li>Utilizes Waku nodes for decentralized message routing</li>
              <li>Implements Threshold's Taco for sophisticated access control</li>
            </ul>
            <p className="mb-4">
              With Arc, you can enjoy the benefits of decentralized communication while maintaining control over your privacy and data.
            </p>
            <button
              onClick={toggleAbout}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes backgroundMove {
          0% {
            background-position: 0% 0%, 0% 0%, 0% 0%;
          }
          100% {
            background-position: 200% 200%, 160% 160%, 240% 240%;
          }
        }
      `}</style>
    </div>
  );
};

const ChatInterface: React.FC = () => {
  return (
      <ChatInterfaceInner />
  );
};

export default ChatInterface;