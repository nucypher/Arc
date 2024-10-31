'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ethers } from 'ethers';
import { initializeTaco, encryptMessage, decryptMessage } from '../lib/taco';
import { createNode, subscribeToMessages, sendWakuMessage, defaultContentTopic, getWakuNodeStatus, subscribeToLocationUpdates } from '../lib/waku';
import { ThresholdMessageKit, domains, conditions } from '@nucypher/taco';
import WalletConnect from './WalletConnect';
import TacoConditionBuilder from './TacoConditionBuilder';
import WakuStatus from './WakuStatus';
import TopicSidebar from './TopicSidebar';
import { FaExclamationCircle } from 'react-icons/fa';
import { switchToPolygonAmoy } from '../utils/ethereum';
import MapView, { LocationUpdate } from './MapView';
import { chainIdMapping } from './TacoConditionBuilder';
import AboutPopup from './AboutPopup';
import SettingsPane from './SettingsPane';
import { useSwitchNetwork, WagmiConfig } from 'wagmi';
import { wagmiConfig } from './WalletConnect';

interface ChatMessage {
  id: number;
  sender: string;
  senderNickname: string;
  content: string;
  timestamp: number;
  encrypted: boolean;
  encryptedContent?: Uint8Array;
  decrypted?: string;
  condition?: string;
  delivered?: boolean;
}

const ChatInterfaceInner: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [web3Provider, setWeb3Provider] = useState<ethers.providers.Web3Provider | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [condition, setCondition] = useState<any>(() => {
    const now = Math.floor(Date.now() / 1000);
    const defaultCondition = new conditions.base.time.TimeCondition({
      returnValueTest: {
        comparator: '>=',
        value: now,
      },
      method: "blocktime",
      chain: chainIdMapping['80002'], // Polygon Amoy
    });

    // Set initial condition description
    setTimeout(() => {
      setConditionDescription(`Time: ${new Date(now * 1000).toLocaleString()}`);
    }, 0);

    return defaultCondition;
  });
  const [conditionDescription, setConditionDescription] = useState<string | null>(null);
  const [currentDomain, setCurrentDomain] = useState<Record<string, string>>(domains.TESTNET);
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
  const [wakuNode, setWakuNode] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [sentMessages, setSentMessages] = useState<Map<string, number>>(new Map());
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [decryptingMessages, setDecryptingMessages] = useState<Set<number>>(new Set());
  const [ethereumNetwork, setEthereumNetwork] = useState<string>('Unknown');
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [liveLocations, setLiveLocations] = useState<Map<string, LocationUpdate>>(new Map());
  const [activeUsers, setActiveUsers] = useState<Map<string, { nickname: string; lastSeen: number; address: string }>>(new Map());
  const [centerOnUserId, setCenterOnUserId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    // Check if we're in a browser environment and if it's a mobile device
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });

  // Add a ref to track subscription cleanup
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  // Add a ref to track if we're currently setting up subscriptions
  const isSettingUpSubscription = useRef(false);

  // Add initialization tracking refs
  const isInitializingTaco = useRef(false);
  const isInitializingWaku = useRef(false);

  // Add this near the top with other refs
  const hasAttemptedNetworkSwitch = useRef(false);

  // Add the useSwitchNetwork hook at component level
  const { switchNetwork } = useSwitchNetwork({
    chainId: 80002, // Polygon Amoy
  });

  useEffect(() => {
    const init = async () => {
      // Guard against multiple initializations
      if (isInitializingWaku.current) {
        return;
      }

      setIsInitializing(true);
      isInitializingWaku.current = true;

      try {
        const node = await createNode();
        setWakuNode(node);
        console.log('Waku node initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Waku:', error);
      } finally {
        setIsInitializing(false);
        isInitializingWaku.current = false;
      }
    };

    init();
  }, []);

  useEffect(() => {
    const initializeChat = async () => {
      // Guard against multiple initializations
      if (isInitializingTaco.current) {
        return;
      }

      try {
        isInitializingTaco.current = true;
        await initializeTaco();
        console.log('TACo initialized successfully');
        setInitializationError(null);
      } catch (error) {
        console.error('Failed to initialize TACo:', error);
        setInitializationError(`Failed to initialize TACo: ${error.message}`);
      } finally {
        isInitializingTaco.current = false;
      }
    };

    initializeChat();
  }, []);

  // Move filterMessages and setFilteredMessages up
  const filterMessages = useCallback((messages: ChatMessage[]) => {
    return messages.filter(message => 
      message.sender === account || // Keep outgoing messages
      (message.sender !== account && message.encrypted) // Keep encrypted messages from others
    );
  }, [account]);

  const setFilteredMessages = useCallback((newMessages: ChatMessage[] | ((prevMessages: ChatMessage[]) => ChatMessage[])) => {
    setMessages(prevMessages => {
      const updatedMessages = typeof newMessages === 'function' ? newMessages(prevMessages) : newMessages;
      return filterMessages(updatedMessages);
    });
  }, [filterMessages]);

  // Define setupSubscription with minimal dependencies
  const setupSubscription = useCallback(async () => {
    // Guard against multiple simultaneous setup attempts
    if (isSettingUpSubscription.current || isSubscribed) {
      console.log('Subscription setup already in progress or already subscribed');
      return;
    }

    if (!wakuNode || !currentTopic || !web3Provider) {
      console.log('Missing dependencies for subscription:', {
        hasWakuNode: !!wakuNode,
        hasTopic: !!currentTopic,
        hasWeb3Provider: !!web3Provider
      });
      return;
    }

    try {
      isSettingUpSubscription.current = true;

      // Clean up any existing subscription
      if (subscriptionRef.current) {
        console.log('Cleaning up existing subscription');
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }

      // Create the location topic by replacing "-chat" with "-location"
      const locationTopic = currentTopic.name.replace('-chat', '-location');

      // Subscribe to messages
      const messageSubscription = await subscribeToMessages(currentTopic.name, async (decodedMessage: any) => {
        setTimeout(async () => {

          // Check if this is a message we sent
          const isSentMessage = decodedMessage.sender === account;
          
          if (isSentMessage) {
            // Only update the delivery status of the existing message
            console.log('Received delivery confirmation for own message:', decodedMessage.timestamp);
            setMessages(prevMessages => 
              prevMessages.map(msg => 
                msg.id === decodedMessage.timestamp
                  ? { ...msg, delivered: true }
                  : msg
              )
            );
            return; // Exit early, don't process the message further
          }

          // Process messages from others only
          if (!web3Provider) {
            console.error('Web3Provider is not initialized. Unable to decrypt message.');
            return;
          }

          try {
            console.log('Attempting to decrypt message...');
            setDecryptingMessages(prev => new Set(prev).add(decodedMessage.timestamp));
            const messageKit = ThresholdMessageKit.fromBytes(decodedMessage.content);
            const decrypted = await decryptMessage(messageKit, web3Provider, currentDomain);
            const decryptedContent = new TextDecoder().decode(decrypted);

            setDecryptingMessages(prev => {
              const newSet = new Set(prev);
              newSet.delete(decodedMessage.timestamp);
              return newSet;
            });

            const newMessage: ChatMessage = {
              id: decodedMessage.timestamp,
              sender: decodedMessage.sender,
              senderNickname: decodedMessage.nickname,
              content: decryptedContent,
              timestamp: decodedMessage.timestamp,
              encrypted: true,
              encryptedContent: decodedMessage.content,
              decrypted: decryptedContent,
              condition: decodedMessage.condition,
              delivered: false,
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
            const newMessage: ChatMessage = {
              id: decodedMessage.timestamp,
              sender: decodedMessage.sender,
              senderNickname: decodedMessage.nickname,
              content: '[Encrypted Message]',
              timestamp: decodedMessage.timestamp,
              encrypted: true,
              encryptedContent: decodedMessage.content, // Store the original encrypted content
              decrypted: undefined,
              condition: decodedMessage.condition,
              delivered: false,
            };
            setFilteredMessages(prevMessages => {
              const updatedMessages = [...prevMessages, newMessage];
              return updatedMessages.sort((a, b) => a.timestamp - b.timestamp);
            });
          }
        }, 500);
      });
      
      // Subscribe to location updates for the current channel
      const locationSubscription = await subscribeToLocationUpdates(
        (update: LocationUpdate) => {
          setLiveLocations(prev => {
            const next = new Map(prev);
            next.set(update.sender, update);
            return next;
          });
        },
        web3Provider,
        currentDomain,
        locationTopic // Pass the channel-specific location topic
      );

      // Store subscriptions for cleanup
      subscriptionRef.current = {
        unsubscribe: () => {
          messageSubscription?.unsubscribe?.();
          locationSubscription?.unsubscribe?.();
        }
      };

      setIsSubscribed(true);
    } catch (error) {
      console.error('Error in subscription setup:', error);
      setIsSubscribed(false);
    } finally {
      isSettingUpSubscription.current = false;
    }
  }, [wakuNode, currentTopic, web3Provider, currentDomain, isSubscribed, account, setFilteredMessages]);
  // Then define initializeNewProvider
  const initializeNewProvider = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const newProvider = new ethers.providers.Web3Provider(window.ethereum);
      await newProvider.ready;
      const network = await newProvider.getNetwork();
      
      if (network.chainId === 80002) {
        setIsSubscribed(false);
        setWeb3Provider(newProvider);
        setEthereumNetwork('amoy');
        setIsCorrectNetwork(true);

        const signer = newProvider.getSigner();
        const address = await signer.getAddress();
        setAccount(address);

        if (wakuNode) {
          await setupSubscription();
        }

        return true;
      }
      return false;
    } catch (error) {
      console.error('Error initializing new provider:', error);
      return false;
    }
  }, [wakuNode, setupSubscription]);

  const handleWalletConnect = useCallback(async (provider: ethers.providers.Web3Provider, connectedAccount: string) => {
    try {
      setWeb3Provider(provider);
      setAccount(connectedAccount);
      console.log('Wallet connected:', connectedAccount);

      // Get the network information
      const network = await provider.getNetwork();
      setEthereumNetwork(network.name);
      const isAmoy = network.chainId === 80002;
      setIsCorrectNetwork(isAmoy);

      // Create a single handler for network changes
      const handleChainChange = async (chainId: string) => {
        console.log('Network changed to:', chainId);
        const newChainId = parseInt(chainId, 16);
        setIsCorrectNetwork(newChainId === 80002);
        if (newChainId === 80002) {
          setEthereumNetwork('amoy');
        }
        await initializeNewProvider();
      };

      // Remove any existing listeners first
      window.ethereum?.removeListener('chainChanged', handleChainChange);
      
      // Add the new listener
      window.ethereum?.on('chainChanged', handleChainChange);

      // Clean up function
      return () => {
        window.ethereum?.removeListener('chainChanged', handleChainChange);
      };

    } catch (error) {
      console.error('Failed to handle wallet connection:', error);
      setEthereumNetwork('Unknown');
      setIsCorrectNetwork(false);
    }
  }, [initializeNewProvider]);

  // Add cleanup effect for the chain change listener
  useEffect(() => {
    return () => {
      // Clean up any ethereum event listeners when component unmounts
      if (window.ethereum?.removeListener) {
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  const handleConditionChange = (newCondition: any) => {
    setCondition(newCondition);
    // Create a shorthand description of the condition
    let description = 'Unknown condition';
    console.log('New condition:', newCondition);
    if (newCondition) {
      if (newCondition instanceof conditions.base.time.TimeCondition) {
        const value = newCondition.value.returnValueTest?.value;
        description = value ? `Time: ${new Date(value * 1000).toLocaleString()}` : 'Time condition';
      } else if (newCondition instanceof conditions.predefined.erc20.ERC20Balance) {
        description = `ERC20: ${newCondition.value.contractAddress?.slice(0, 6) || 'Unknown'}...`;
      } else if (newCondition instanceof conditions.predefined.erc721.ERC721Ownership) {
        description = `ERC721: ${newCondition.value.contractAddress?.slice(0, 6) || 'Unknown'}...`;
      } else if (newCondition instanceof conditions.predefined.erc721.ERC721Balance) {
        description = `ERC1155: ${newCondition.value.contractAddress?.slice(0, 6) || 'Unknown'}...`;
      } else {
        console.log('Unrecognized condition type:', newCondition.constructor.name);
        description = 'Unknown condition type';
      }
    }
    setConditionDescription(description);
  };

  const handleDomainChange = (domain: typeof domains, newRitualId: string) => {
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
      console.log('Message validation failed:', {
        hasInput: !!inputText.trim(),
        hasAccount: !!account,
        hasProvider: !!web3Provider,
        isSubscribed
      });
      setError("Please ensure you're connected and the subscription is set up before sending a message.");
      return;
    }

    // Check if there's no condition set, and set the default condition if needed
    if (!condition) {
      console.log('No condition set, generating default condition');
      const defaultCondition = generateDefaultCondition();
      setCondition(defaultCondition);
      setConditionDescription(`Time: ${new Date(defaultCondition.value.returnValueTest.value * 1000).toLocaleString()}`);
    }

    // Check if the user is on the Polygon Amoy network
    if (!isCorrectNetwork) {
      console.log('Not on correct network, attempting to switch');
      const switched = await switchToPolygonAmoy();
      if (!switched) {
        setError("Please switch to the Polygon Amoy network to send messages.");
        return;
      }
    }

    try {
      console.log('Starting message encryption process...');
      console.log('Condition:', condition);
      console.log('Domain:', currentDomain);
      console.log('Ritual ID:', ritualId);
      
      const messageKit = await encryptMessage(
        inputText.trim(), 
        web3Provider, 
        condition, 
        currentDomain, 
        ritualId
      );
      console.log('Message encrypted successfully:', messageKit);

      if (wakuNode) {
        console.log('Sending encrypted message via Waku...');
        const messageKitBytes = messageKit.toBytes();
        const conditionString = JSON.stringify(condition);
        const timestamp = Date.now();
        
        await sendWakuMessage(
          currentTopic.name, 
          account, 
          messageKitBytes, 
          nickname, 
          conditionString
        );
        console.log('Encrypted message sent via Waku');
        
        const messageKey = `${account}-${timestamp}`;
        setSentMessages(prev => new Map(prev).set(messageKey, timestamp));
        console.log('Updated sentMessages:', Array.from(sentMessages.entries()));

        const newMessage: ChatMessage = {
          id: timestamp,
          sender: account,
          senderNickname: nickname,
          content: inputText.trim(),
          timestamp: timestamp,
          encrypted: true,
          decrypted: inputText.trim(),
          condition: conditionString,
          delivered: false,
        };
        
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

  const handleTopicSelect = (topic: { name: string }) => {
    setCurrentTopic(topic);
    setMessages([]);
  };

  const handleTopicCreate = async (newTopicName: string) => {
    // Ensure the base structure is maintained with the channel name in the third position
    const baseTopicPath = '/arc/1/';
    // Append -chat suffix to the channel name
    const fullNewTopic = `${baseTopicPath}${newTopicName}-chat/proto`;

    if (!topics.some(topic => topic.name === fullNewTopic)) {
      // Create both chat and location topics
      const locationTopic = `${baseTopicPath}${newTopicName}-location/proto`;
      
      setTopics(prevTopics => [
        ...prevTopics, 
        { 
          name: fullNewTopic, 
          lastMessage: "Welcome to the new topic!", 
          lastMessageTime: Date.now() 
        }
      ]);
      
      // Set the current topic
      setCurrentTopic({ name: fullNewTopic });
      
      // Clear messages for the new topic
      setMessages([]);
      
      // Reset subscription state to trigger new subscription
      setIsSubscribed(false);
      
      // Clean up existing subscription if any
      if (subscriptionRef.current) {
        console.log('Cleaning up existing subscription before creating new one');
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }

      try {
        // Wait a brief moment for state updates to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Set up new subscription for the new topic
        if (wakuNode && web3Provider) {
          console.log('Setting up subscription for new topic:', fullNewTopic);
          await setupSubscription();
        } else {
          console.warn('Cannot set up subscription: Waku node or web3Provider not available');
        }
      } catch (error) {
        console.error('Error setting up subscription for new topic:', error);
      }
    }
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
    const condition = new conditions.base.time.TimeCondition({
      returnValueTest: {
        comparator: '>=',
        value: now,
      },
      method: "blocktime",
      chain: chainIdMapping['80002'], // Polygon Amoy
    });

    // Verify the condition is properly created before using it
    if (!condition || !condition.returnValueTest || !condition.returnValueTest.value) {
      console.error('Failed to generate default condition with proper structure');
      return null;
    }

    return condition;
  };

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

    const locationMessage = `📍 Location: ${location.lat}, ${location.lng}`;
    
    try {
      const messageKit = await encryptMessage(locationMessage, web3Provider, condition, currentDomain, ritualId);
      
      if (wakuNode) {
        const messageKitBytes = messageKit.toBytes();
        const conditionString = JSON.stringify(condition);
        const timestamp = Date.now();
        await sendWakuMessage(currentTopic.name, account, messageKitBytes, nickname, conditionString);
        
        const messageKey = `${account}-${timestamp}`;
        setSentMessages(prev => new Map(prev).set(messageKey, timestamp));

        const newMessage: ChatMessage = {
          id: timestamp,
          sender: account,
          senderNickname: nickname,
          content: locationMessage,
          timestamp: timestamp,
          encrypted: true,
          decrypted: locationMessage,
          condition: conditionString,
          delivered: false,
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
  }, [account, web3Provider, condition, currentDomain, ritualId, wakuNode, nickname, currentTopic.name, isSubscribed, setFilteredMessages]);

  useEffect(() => {
    const now = Date.now();
    setActiveUsers(new Map(
      Array.from(liveLocations.entries()).map(([userId, location]) => [
        userId,
        {
          nickname: location.nickname,
          lastSeen: now,
          address: userId
        }
      ])
    ));
  }, [liveLocations]);

  const handleMemberClick = (userId: string) => {
    setCenterOnUserId(userId);
  };

  // Update condition description when condition changes
  useEffect(() => {
    if (condition?.returnValueTest?.value) {
      setConditionDescription(`Time: ${new Date(condition.returnValueTest.value * 1000).toLocaleString()}`);
    }
  }, [condition]);

  // Single effect to handle subscription setup
  useEffect(() => {
    if (!isSubscribed && wakuNode && currentTopic && web3Provider && !isSettingUpSubscription.current) {
      setupSubscription();
    }
  }, [isSubscribed, wakuNode, currentTopic, web3Provider, setupSubscription]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        console.log('Cleaning up subscriptions on unmount');
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      isSettingUpSubscription.current = false;
    };
  }, []);

  const handleSidebarToggle = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarCollapsed(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update the alert button click handler
  const handleNetworkSwitch = async () => {
    try {
      if (switchNetwork) {
        await switchNetwork();
        
        // Get fresh provider after switch
        if (web3Provider) {
          const network = await web3Provider.getNetwork();
          setIsCorrectNetwork(network.chainId === 80002);
        }
      }
    } catch (error) {
      console.error('Error switching network:', error);
    }
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
            <div className="flex items-center space-x-2">
              {!isCorrectNetwork && (
                <button 
                  onClick={handleNetworkSwitch}
                  className="h-8 w-8 flex items-center justify-center text-yellow-500 hover:text-yellow-400 transition-colors duration-200 bg-gray-800 rounded hover:bg-gray-700"
                  title="Click to switch to Polygon Amoy"
                >
                  <FaExclamationCircle size={18} />
                </button>
              )}
              <WalletConnect onConnect={handleWalletConnect} connectedAccount={account} />
              <button
                onClick={toggleAbout}
                className="h-8 px-3 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center"
              >
                About
              </button>
              <div className="w-px h-8 bg-gray-700"></div>
              <button
                onClick={toggleSettings}
                className="h-8 w-8 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center"
                title="Settings"
              >
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
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
            isSidebarCollapsed={isSidebarCollapsed}
            onSidebarToggle={handleSidebarToggle}
          />
        </div>
        
        <div className="flex flex-1 relative overflow-hidden">
          <TopicSidebar
            topics={topics}
            currentTopic={currentTopic.name}
            onTopicSelect={handleTopicSelect}
            onTopicCreate={handleTopicCreate}
            backgroundStyle={backgroundStyle}
            activeUsers={activeUsers}
            onMemberClick={handleMemberClick}
            isCollapsed={isSidebarCollapsed}
          />
          <MapView 
            messages={messages} 
            onShareLocation={handleLiveLocation}
            account={account || ''}
            nickname={nickname}
            liveLocations={liveLocations}
            centerOnUser={centerOnUserId}
            onSendMessage={handleSendMessage}
            inputText={inputText}
            onInputChange={(e) => setInputText(e.target.value)}
            isCurrentUser={(sender) => sender === account}
            canDecryptMessage={canDecryptMessage}
            decryptingMessages={decryptingMessages}
            onRetryDecryption={handleRetryDecryption}
            isSettingsOpen={isSettingsOpen}
            onCloseSettings={() => setIsSettingsOpen(false)}
            onNicknameChange={handleNicknameChange}
            onSaveNickname={saveNickname}
            isEditingNickname={isEditingNickname}
            setIsEditingNickname={setIsEditingNickname}
            settingsContent={
              <TacoConditionBuilder onConditionChange={handleConditionChange} />
            }
            handleConditionChange={handleConditionChange}
            handleDomainChange={handleDomainChange}
            currentDomain={currentDomain}
            web3Provider={web3Provider}
            condition={condition}
            ritualId={ritualId}
          />
        </div>
      </div>
      
      {initializationError && (
        <div className="p-2 bg-red-600 text-white absolute bottom-0 left-0 right-0">
          {initializationError}. Please check the console for more details and try refreshing the page.
        </div>
      )}

      {/* About popup */}
      <AboutPopup isOpen={isAboutOpen} onClose={toggleAbout} />

      {isSettingsOpen && (
        <SettingsPane
          onClose={() => setIsSettingsOpen(false)}
          nickname={nickname}
          onNicknameChange={handleNicknameChange}
          onSaveNickname={saveNickname}
          isEditingNickname={isEditingNickname}
          setIsEditingNickname={setIsEditingNickname}
          handleConditionChange={handleConditionChange}
          handleDomainChange={handleDomainChange}
          currentDomain={currentDomain}
          connectedAccount={account}
        />
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
    <WagmiConfig config={wagmiConfig}>
      <ChatInterfaceInner />
    </WagmiConfig>
  );
};

export default ChatInterface;