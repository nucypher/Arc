import { createLightNode, Protocols, createEncoder, createDecoder } from '@waku/sdk';
import protobuf from 'protobufjs';
import { ThresholdMessageKit } from '@nucypher/taco';
import { encryptMessage, decryptMessage } from './taco';
import { LocationUpdate } from '../components/MapView';

export const domainUUID = '876c3672-d8ca-4778-88e7-954f35cb2bbd';
export const defaultContentTopic = `/arc/1/global-chat/proto`;
export const locationContentTopic = `/arc/1/global-location/proto`;

export const messageEncoder = createEncoder({ contentTopic: defaultContentTopic, ephemeral: true });
export const locationEncoder = createEncoder({ contentTopic: locationContentTopic, ephemeral: true });

let wakuNode: any = null;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000; // 2 seconds

export const DataPacket = new protobuf.Type('DataPacket')
  .add(new protobuf.Field('timestamp', 1, 'uint64'))
  .add(new protobuf.Field('sender', 2, 'string'))
  .add(new protobuf.Field('nickname', 3, 'string'))
  .add(new protobuf.Field('content', 4, 'bytes'))
  .add(new protobuf.Field('condition', 5, 'string'));

export const createNode = async () => {
  console.log('Creating Waku node...');
  
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      if (!wakuNode) {
        wakuNode = await createLightNode({ defaultBootstrap: true });
      }
      
      console.log('Waku node created, starting...');
      await wakuNode.start();
      console.log('Waku node started, waiting for remote peer...');
      
      try {
        await Promise.race([
          wakuNode.waitForPeers([Protocols.LightPush, Protocols.Filter]),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Peer connection timeout')), 10000)
          )
        ]);
        console.log('Waku node fully initialized and connected to remote peer');
        return wakuNode;
      } catch (peerError) {
        console.warn(`Attempt ${attempt}: Failed to connect to remote peer:`, peerError);
        if (attempt === MAX_RETRY_ATTEMPTS) {
          throw peerError;
        }
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        continue;
      }
    } catch (error) {
      console.error(`Attempt ${attempt}: Failed to create/start Waku node:`, error);
      if (attempt === MAX_RETRY_ATTEMPTS) {
        throw error;
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      
      // Clean up failed node
      if (wakuNode) {
        try {
          await wakuNode.stop();
        } catch (stopError) {
          console.warn('Error stopping failed Waku node:', stopError);
        }
        wakuNode = null;
      }
    }
  }
  
  throw new Error('Failed to initialize Waku node after all retry attempts');
};

export const getWakuNodeStatus = () => {
  if (!wakuNode) return { isAvailable: false, peerCount: 0, localPeerId: '', subscribedTopics: [] };
  
  return {
    isAvailable: true,
    peerCount: wakuNode.libp2p.getPeers().length,
    localPeerId: wakuNode.libp2p.peerId.toString(),
    subscribedTopics: [defaultContentTopic],
  };
};

export const subscribeToMessages = async (topic: string, callback: (message: any) => void) => {
  if (!wakuNode) {
    console.error('Waku node not initialized');
    throw new Error('Waku node not initialized');
  }
  
  try {
    const subscription = await wakuNode.filter.subscribe([createDecoder(topic)], (wakuMessage: any) => {
      if (!wakuMessage.payload) return;
      const decodedMessage = DataPacket.decode(wakuMessage.payload);
      callback(decodedMessage);
    });
    console.log(`Successfully subscribed to topic: ${topic}`);
    return subscription;
  } catch (error) {
    console.error('Error setting up subscription:', error);
    throw error;
  }
};

export const sendWakuMessage = async (topic: string, sender: string, messageKit: Uint8Array, nickname: string, condition: string) => {
  if (!wakuNode) throw new Error('Waku node not initialized');

  const protoMessage = DataPacket.create({
    timestamp: Date.now(),
    sender,
    nickname,
    content: messageKit,
    condition,
  });

  const serializedMessage = DataPacket.encode(protoMessage).finish();

  await wakuNode.lightPush.send(messageEncoder, {
    payload: serializedMessage,
  });
};

export const sendLocationUpdate = async (
  sender: string,
  nickname: string,
  latitude: number,
  longitude: number,
  accuracy: number,
  isLive: boolean,
  web3Provider: any,
  condition: any,
  currentDomain: any,
  ritualId: string
) => {
  if (!wakuNode) throw new Error('Waku node not initialized');

  // Create location data object (sensitive data that needs encryption)
  const locationData = {
    latitude,
    longitude,
    accuracy,
    isLive,
    timestamp: Date.now()
  };

  try {
    // Encrypt location data with Taco
    console.log('[Location] Encrypting location data');
    const messageKit = await encryptMessage(
      JSON.stringify(locationData),
      web3Provider,
      condition,
      currentDomain,
      ritualId
    );
    const encryptedContent = messageKit.toBytes();

    // Create location update message with encrypted content
    const locationUpdate = DataPacket.create({
      timestamp: Date.now(),
      sender,
      nickname,
      content: encryptedContent,
      condition: JSON.stringify(condition)
    });

    console.log('[Location] Sending encrypted location update');
    const serializedMessage = DataPacket.encode(locationUpdate).finish();
    await wakuNode.lightPush.send(locationEncoder, {
      payload: serializedMessage,
    });
    console.log('[Location] Encrypted location update sent');
  } catch (error) {
    console.error('[Location] Error sending location update:', error);
    throw error;
  }
};

export const subscribeToLocationUpdates = async (
  callback: (update: LocationUpdate) => void,
  web3Provider: any,
  currentDomain: any,
  topic: string = locationContentTopic
) => {
  if (!wakuNode) {
    console.error('[Location] Waku node not initialized');
    throw new Error('Waku node not initialized');
  }

  try {
    const subscription = await wakuNode.filter.subscribe([createDecoder(topic)], async (wakuMessage: any) => {
      if (!wakuMessage.payload) return;

      try {
        // Decode the protobuf message
        const decodedMessage = DataPacket.decode(wakuMessage.payload);
        
        if (!web3Provider) {
          console.error('[Location] Web3Provider not available for decryption');
          return;
        }

        try {
          // Decrypt the location data
          const messageKit = ThresholdMessageKit.fromBytes(decodedMessage.content);
          const decrypted = await decryptMessage(messageKit, web3Provider, currentDomain);
          
          // Parse the decrypted data
          const locationData = JSON.parse(new TextDecoder().decode(decrypted));

          // Create the location update with decrypted data
          const update: LocationUpdate = {
            sender: decodedMessage.sender,
            nickname: decodedMessage.nickname,
            ...locationData
          };

          // Only log that we received an update, not its contents
          console.log('[Location] Successfully decrypted location update from:', update.sender);
          
          // Pass the decrypted update to the callback
          callback(update);
        } catch (decryptError) {
          console.error('[Location] Failed to decrypt location update:', decryptError);
        }
      } catch (error) {
        console.error('[Location] Error processing location update:', error);
      }
    });

    console.log(`Successfully subscribed to topic: ${topic}`);
    return subscription;
  } catch (error) {
    console.error('[Location] Error setting up location subscription:', error);
    throw error;
  }
};
