'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { initializeTaco, encryptMessage, decryptMessage } from '../lib/tacoSetup';
import { createNode, subscribeToMessages, sendWakuMessage, defaultContentTopic, getWakuNodeStatus, subscribeToLocationUpdates } from '../lib/wakuSetup';
import { ThresholdMessageKit, domains, conditions } from '@nucypher/taco';
import WalletConnect from './WalletConnect';
import TacoConditionBuilder from './TacoConditionBuilder';
import TacoDomainSelector from './TacoDomainSelector';
import WakuStatus from './WakuStatus';
import TopicSidebar from './TopicSidebar';
import ChatBubble from './ChatBubble';
import { FaExclamationCircle, FaMapMarkerAlt } from 'react-icons/fa'; // Change to circle icon
import { switchToPolygonAmoy } from '../utils/ethereum';
import MapView from './MapView';

interface Message {
  id: number;
  sender: string;
  senderNickname: string;
  content: string;
  timestamp: number;
  encrypted: boolean;
  encryptedContent?: Uint8Array; // Add this line to store the original encrypted content
  decrypted?: string;
  condition?: string;
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
  const [sentMessages, setSentMessages] = useState<Map<string, number>>(new Map());
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [decryptingMessages, setDecryptingMessages] = useState<Set<number>>(new Set());
  const [ethereumNetwork, setEthereumNetwork] = useState<string>('Unknown');
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [currentView, setCurrentView] = useState<'chat' | 'map'>('chat');
  const [liveLocations, setLiveLocations] = useState<Map<string, LocationUpdate>>(new Map());
  const [activeUsers, setActiveUsers] = useState<Map<string, { nickname: string; lastSeen: number }>>(new Map());

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
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 018 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
    </svg>
  );

  useEffect(() => {
    const setupWeb3 = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          setWeb3Provider(provider);
          const signer = provider.getSigner();
          const address = await signer.getAddress();
          setAccount(address);

          // Get the network information
          const network = await provider.getNetwork();
          setEthereumNetwork(network.name);
          setIsCorrectNetwork(network.chainId === 80002); // Polygon Amoy chainId

          console.log('Web3 initialized, account:', address, 'network:', network.name);

          // Listen for network changes
          window.ethereum.on('chainChanged', (chainId: string) => {
            console.log('Network changed to:', chainId);
            const newNetwork = ethers.providers.getNetwork(parseInt(chainId));
            setEthereumNetwork(newNetwork.name);
            setIsCorrectNetwork(parseInt(chainId) === 80002);
          });

        } catch (error) {
          console.error('Failed to initialize Web3:', error);
          setEthereumNetwork('Unknown');
          setIsCorrectNetwork(false);
        }
      } else {
        console.log('Please install MetaMask!');
        setEthereumNetwork('Not Connected');
        setIsCorrectNetwork(false);
      }
    };

    setupWeb3();

    // Cleanup function
    return () => {
      if (window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeListener('chainChanged', () => {
          console.log('Removed chainChanged event listener');
        });
      }
    };
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
    if (wakuNode && currentTopic && !isSubscribed) {
      console.log(`Setting up subscriptions for topic: ${currentTopic.name}`);
      try {
        // Subscribe to regular messages
        await subscribeToMessages(currentTopic.name, async (decodedMessage: any) => {
          setTimeout(async () => {
            console.log('Received message:', decodedMessage);
            console.log('Current account:', account);
            console.log('Web3Provider status:', web3Provider ? 'Initialized' : 'Not initialized');
            
            const messageKey = `${decodedMessage.sender}-${decodedMessage.timestamp}`;
            if (sentMessages.has(messageKey)) {
              console.log('Ignoring message from self (found in sentMessages)');
              return;
            }

            if (!web3Provider) {
              console.error('Web3Provider is not initialized. Unable to decrypt message.');
              // You might want to add the message to the list as encrypted
              // and provide a way for the user to retry decryption later
              return;
            }

            try {
              console.log('Attempting to decrypt message...');
              setDecryptingMessages(prev => new Set(prev).add(decodedMessage.timestamp));
              const messageKit = ThresholdMessageKit.fromBytes(decodedMessage.content);
              const decrypted = await decryptMessage(messageKit, web3Provider, currentDomain);
              const decryptedContent = new TextDecoder().decode(decrypted);
              console.log('Message decrypted successfully:', decryptedContent);

              setDecryptingMessages(prev => {
                const newSet = new Set(prev);
                newSet.delete(decodedMessage.timestamp);
                return newSet;
              });

              const newMessage: Message = {
                id: decodedMessage.timestamp,
                sender: decodedMessage.sender,
                senderNickname: decodedMessage.nickname,
                content: decryptedContent,
                timestamp: decodedMessage.timestamp,
                encrypted: true,
                encryptedContent: decodedMessage.content, // Store the original encrypted content
                decrypted: decryptedContent,
                condition: decodedMessage.condition,
              };
              setFilteredMessages(prevMessages => {
                const updatedMessages = [...prevMessages, newMessage];
                return updatedMessages.sort((a, b) => a.timestamp - b.timestamp);
              });
            } catch (error) {
              console.error('Error processing received message:', error);
              setDecryptingMessages(prev => {
                const newSet = new Set(prev);
                newSet.delete(decodedMessage.timestamp);
                return newSet;
              });
              // Add a message bubble for undecryptable messages
              const newMessage: Message = {
                id: decodedMessage.timestamp,
                sender: decodedMessage.sender,
                senderNickname: decodedMessage.nickname,
                content: '[Encrypted Message]',
                timestamp: decodedMessage.timestamp,
                encrypted: true,
                encryptedContent: decodedMessage.content, // Store the original encrypted content
                decrypted: undefined,
                condition: decodedMessage.condition,
              };
              setFilteredMessages(prevMessages => {
                const updatedMessages = [...prevMessages, newMessage];
                return updatedMessages.sort((a, b) => a.timestamp - b.timestamp);
              });
            }
          }, 500);
        });
        
        // Subscribe to location updates
        await subscribeToLocationUpdates((update: LocationUpdate) => {
          console.log('[Location] Received location update:', update);
          setLiveLocations(prev => {
            const next = new Map(prev);
            next.set(update.sender, update);
            return next;
          });
        });

        console.log('Successfully set up all subscriptions');
        setIsSubscribed(true);
      } catch (error) {
        console.error('Error setting up subscriptions:', error);
      }
    }
  }, [wakuNode, currentTopic, web3Provider, currentDomain, account, sentMessages, isSubscribed]);

  useEffect(() => {
    if (wakuNode && currentTopic && !isSubscribed) {
      setupSubscription();
    }
  }, [wakuNode, currentTopic, setupSubscription, isSubscribed]);

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
    if (!inputText.trim() || !account || !web3Provider || !isSubscribed) {
      setError("Please ensure you're connected and the subscription is set up before sending a message.");
      return;
    }

    // Check if there's no condition set, and set the default condition if needed
    if (!condition) {
      const defaultCondition = generateDefaultCondition();
      setCondition(defaultCondition);
      setConditionDescription(`Time: ${new Date(defaultCondition.returnValueTest.value * 1000).toLocaleString()}`);
    }

    // Check if the user is on the Polygon Amoy network
    if (!isCorrectNetwork) {
      const switched = await switchToPolygonAmoy();
      if (!switched) {
        setError("Please switch to the Polygon Amoy network to send messages.");
        return;
      }
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
        const conditionString = JSON.stringify(condition);
        const timestamp = Date.now();
        await sendWakuMessage(currentTopic.name, account, messageKitBytes, nickname, conditionString);
        console.log('Encrypted message sent via Waku');
        
        const messageKey = `${account}-${timestamp}`;
        setSentMessages(prev => new Map(prev).set(messageKey, timestamp));
        console.log('Updated sentMessages:', Array.from(sentMessages.entries()));

        const newMessage: Message = {
          id: timestamp,
          sender: account,
          senderNickname: nickname,
          content: inputText.trim(),
          timestamp: timestamp,
          encrypted: true,
          decrypted: inputText.trim(),
          condition: conditionString,
        };
        
        // Add the sent message to the displayed list
        setFilteredMessages(prevMessages => {
          const updatedMessages = [...prevMessages, newMessage];
          return updatedMessages.sort((a, b) => a.timestamp - b.timestamp);
        });
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

  const handleTopicCreate = (newTopicName: string) => {
    // Ensure the base structure is maintained
    const baseTopicPath = '/taco-chat/1/messages/';
    const fullNewTopic = `${baseTopicPath}${newTopicName}`;

    if (!topics.some(topic => topic.name === fullNewTopic)) {
      setTopics(prevTopics => [
        ...prevTopics, 
        { 
          name: fullNewTopic, 
          lastMessage: "Welcome to the new topic!", 
          lastMessageTime: Date.now() 
        }
      ]);
      setCurrentTopic({ name: fullNewTopic });
      // Clear messages for the new topic
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

  const canDecryptMessage = useCallback((messageCondition: string) => {
    if (!condition || !messageCondition) return false;
    
    try {
      const parsedMessageCondition = JSON.parse(messageCondition);
      // Here you would implement the logic to check if the current user's condition
      // meets the message's condition. This is a placeholder implementation.
      return JSON.stringify(condition) === JSON.stringify(parsedMessageCondition);
    } catch (error) {
      console.error('Error parsing message condition:', error);
      return false;
    }
  }, [condition]);

  const getNetworkName = (networkName: string): string => {
    switch (networkName.toLowerCase()) {
      case 'homestead':
        return 'Ethereum Mainnet';
      case 'sepolia':
        return 'Sepolia Testnet';
      case 'goerli':
        return 'Goerli Testnet';
      default:
        return networkName;
    }
  };

  const generateDefaultCondition = () => {
    const now = Math.floor(Date.now() / 1000);
    return new conditions.base.time.TimeCondition({
      chain: chainIdMapping['80002'], // Polygon Amoy
      returnValueTest: {
        comparator: '>=',
        value: now,
      },
    });
  };

  // Modify the filterMessages function
  const filterMessages = useCallback((messages: Message[]) => {
    return messages.filter(message => 
      message.sender === account || // Keep outgoing messages
      (message.sender !== account && message.encrypted) // Keep encrypted messages from others
    );
  }, [account]);

  // Modify the setMessages calls to use the filterMessages function
  const setFilteredMessages = useCallback((newMessages: Message[] | ((prevMessages: Message[]) => Message[])) => {
    setMessages(prevMessages => {
      const updatedMessages = typeof newMessages === 'function' ? newMessages(prevMessages) : newMessages;
      return filterMessages(updatedMessages);
    });
  }, [filterMessages]);

  const handleRetryDecryption = async (messageId: number) => {
    const messageToDecrypt = messages.find(msg => msg.id === messageId);
    if (!messageToDecrypt || !web3Provider || !messageToDecrypt.encryptedContent) return;

    setDecryptingMessages(prev => new Set(prev).add(messageId));

    try {
      const messageKit = ThresholdMessageKit.fromBytes(messageToDecrypt.encryptedContent);
      const decrypted = await decryptMessage(messageKit, web3Provider, currentDomain);
      const decryptedContent = new TextDecoder().decode(decrypted);

      setMessages(prevMessages => prevMessages.map(msg => 
        msg.id === messageId ? { ...msg, decrypted: decryptedContent, content: decryptedContent } : msg
      ));
    } catch (error) {
      console.error('Error decrypting message:', error);
      setError(`Failed to decrypt message: ${error.message}`);
    } finally {
      setDecryptingMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
    }
  };

  const handleLiveLocation = useCallback(async (location: { lat: number; lng: number }) => {
    if (!account || !web3Provider || !condition || !isSubscribed) {
      setError("Please ensure you're connected and have set a condition before sharing location.");
      return;
    }

    const locationMessage = `📍 Location: https://www.google.com/maps?q=${location.lat},${location.lng}`;
    
    try {
      const messageKit = await encryptMessage(locationMessage, web3Provider, condition, currentDomain, ritualId);
      
      if (wakuNode) {
        const messageKitBytes = messageKit.toBytes();
        const conditionString = JSON.stringify(condition);
        const timestamp = Date.now();
        await sendWakuMessage(currentTopic.name, account, messageKitBytes, nickname, conditionString);
        
        const messageKey = `${account}-${timestamp}`;
        setSentMessages(prev => new Map(prev).set(messageKey, timestamp));

        const newMessage: Message = {
          id: timestamp,
          sender: account,
          senderNickname: nickname,
          content: locationMessage,
          timestamp: timestamp,
          encrypted: true,
          decrypted: locationMessage,
          condition: conditionString,
        };
        
        setFilteredMessages(prevMessages => {
          const updatedMessages = [...prevMessages, newMessage];
          return updatedMessages.sort((a, b) => a.timestamp - b.timestamp);
        });
      }
    } catch (error) {
      console.error('Error sending location:', error);
      setError('Failed to send location update');
    }
  }, [account, web3Provider, condition, currentDomain, ritualId, wakuNode, nickname, currentTopic.name, isSubscribed]);

  useEffect(() => {
    const now = Date.now();
    setActiveUsers(new Map(
      Array.from(liveLocations.entries()).map(([userId, location]) => [
        userId,
        {
          nickname: location.nickname,
          lastSeen: now
        }
      ])
    ));
  }, [liveLocations]);

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
              {!isCorrectNetwork && (
                <button 
                  onClick={switchToPolygonAmoy}
                  className="text-white hover:text-gray-300 transition-colors duration-200"
                  title="Switch to Polygon Amoy"
                >
                  <FaExclamationCircle size={20} />
                </button>
              )}
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
            tacoDomain={currentDomain}
            ethereumNetwork={getNetworkName(ethereumNetwork)}
          />
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          <TopicSidebar
            topics={topics}
            currentTopic={currentTopic.name}
            onTopicSelect={handleTopicSelect}
            onTopicCreate={handleTopicCreate}
            backgroundStyle={backgroundStyle}
            activeUsers={activeUsers}
          />
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-gray-800 px-4 border-b border-gray-700">
              <div className="flex space-x-4">
                <button
                  onClick={() => setCurrentView('chat')}
                  className={`py-2 px-4 focus:outline-none ${
                    currentView === 'chat'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Chat
                </button>
                <button
                  onClick={() => setCurrentView('map')}
                  className={`py-2 px-4 focus:outline-none ${
                    currentView === 'map'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Map
                </button>
              </div>
            </div>

            {currentView === 'chat' ? (
              <>
                <div className="flex-grow overflow-y-auto p-4">
                  <div className="space-y-4">
                    {filterMessages(messages).map((message) => (
                      <ChatBubble
                        key={message.id}
                        message={message}
                        isCurrentUser={message.sender === account}
                        canDecrypt={canDecryptMessage(message.condition)}
                        isDecrypting={decryptingMessages.has(message.id)}
                        onRetryDecryption={handleRetryDecryption}
                      />
                    ))}
                  </div>
                </div>
                <div className="p-4 border-t border-gray-800">
                  <form onSubmit={handleSendMessage} className="flex space-x-2">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="flex-grow px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-l focus:outline-none focus:ring-2 focus:ring-gray-600"
                      placeholder="Type your message..."
                    />
                    <button
                      type="button"
                      onClick={handleLiveLocation}
                      className="px-4 py-2 bg-gray-700 text-white hover:bg-gray-600 transition-colors duration-200 flex items-center justify-center"
                      title="Share location"
                    >
                      <FaMapMarkerAlt size={20} />
                    </button>
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
              </>
            ) : (
              <MapView 
                messages={messages} 
                onShareLocation={handleLiveLocation}
                account={account || ''}
                nickname={nickname}
                liveLocations={liveLocations}
              />
            )}
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