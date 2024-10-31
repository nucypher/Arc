import { createLightNode, waitForRemotePeer, Protocols, createEncoder, createDecoder } from '@waku/sdk';
import protobuf from 'protobufjs';
import { ThresholdMessageKit } from '@nucypher/taco';
import { encryptMessage } from './taco';

export const defaultContentTopic = '/taco-chat/1/messages/proto';
export const locationContentTopic = '/taco-chat/1/messages/data';

let wakuNode: any = null;

// Define message structure
export const Message = new protobuf.Type('Message')
  .add(new protobuf.Field('timestamp', 1, 'uint64'))
  .add(new protobuf.Field('sender', 2, 'string'))
  .add(new protobuf.Field('nickname', 3, 'string'))
  .add(new protobuf.Field('content', 4, 'bytes'))
  .add(new protobuf.Field('condition', 5, 'string'));

// Define location update message structure
export const LocationUpdate = new protobuf.Type('LocationUpdate')
  .add(new protobuf.Field('timestamp', 1, 'uint64'))
  .add(new protobuf.Field('sender', 2, 'string'))
  .add(new protobuf.Field('nickname', 3, 'string'))
  .add(new protobuf.Field('content', 4, 'bytes'))
  .add(new protobuf.Field('condition', 5, 'string'));

export const createNode = async () => {
  console.log('Creating Waku node...');
  wakuNode = await createLightNode({ defaultBootstrap: true });
  console.log('Waku node created, starting...');
  await wakuNode.start();
  console.log('Waku node started, waiting for remote peer...');
  await waitForRemotePeer(wakuNode, [Protocols.LightPush, Protocols.Filter]);
  console.log('Waku node fully initialized and connected to remote peer');
  return wakuNode;
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

  console.log(`Attempting to subscribe to messages on topic: ${topic}`);
  
  try {
    const subscription = await wakuNode.filter.subscribe([createDecoder(topic)], (wakuMessage: any) => {
      if (!wakuMessage.payload) return;
      const decodedMessage = Message.decode(wakuMessage.payload);
      console.log('Received message:', decodedMessage);
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

  const protoMessage = Message.create({
    timestamp: Date.now(),
    sender,
    nickname,
    content: messageKit,
    condition,
  });

  const serializedMessage = Message.encode(protoMessage).finish();

  await wakuNode.lightPush.send(createEncoder({ contentTopic: topic }), {
    payload: serializedMessage,
  });
};

interface LocationUpdate {
  sender: string;
  nickname: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  isLive: boolean;
  timestamp: number;
}

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

  // Create location data object
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

    // Create location update message
    const locationUpdate = LocationUpdate.create({
      timestamp: Date.now(),
      sender,
      nickname,
      content: encryptedContent,
      condition: JSON.stringify(condition)
    });

    console.log('[Location] Encoding location update');
    const serializedMessage = LocationUpdate.encode(locationUpdate).finish();
    console.log('[Location] Location update encoded, payload size:', serializedMessage.length);

    console.log('[Location] Sending encrypted location update to Waku');
    await wakuNode.lightPush.send(createEncoder({ contentTopic: locationContentTopic }), {
      payload: serializedMessage,
    });
    console.log('[Location] Encrypted location update sent successfully');
  } catch (error) {
    console.error('[Location] Error sending location update:', error);
    throw error;
  }
};

export const subscribeToLocationUpdates = async (
  callback: (update: LocationUpdate) => void,
  web3Provider: any,
  currentDomain: any
) => {
  if (!wakuNode) {
    console.error('[Location] Waku node not initialized for location updates');
    throw new Error('Waku node not initialized');
  }

  console.log(`[Location] Attempting to subscribe to location updates on topic: ${locationContentTopic}`);
  
  try {
    const subscription = await wakuNode.filter.subscribe([createDecoder(locationContentTopic)], async (wakuMessage: any) => {
      if (!wakuMessage.payload) {
        console.log('[Location] Received empty payload, skipping');
        return;
      }

      try {
        console.log('[Location] Received raw location update');
        const decodedMessage = LocationUpdate.decode(wakuMessage.payload);
        
        // Decrypt the location data
        const messageKit = ThresholdMessageKit.fromBytes(decodedMessage.content);
        const decrypted = await decryptMessage(messageKit, web3Provider, currentDomain);
        const locationData = JSON.parse(new TextDecoder().decode(decrypted));

        const update: LocationUpdate = {
          sender: decodedMessage.sender,
          nickname: decodedMessage.nickname,
          ...locationData
        };

        console.log('[Location] Decrypted location update:', update);
        callback(update);
      } catch (error) {
        console.error('[Location] Error processing location update:', error);
      }
    });

    console.log(`[Location] Successfully subscribed to location updates topic: ${locationContentTopic}`);
    return subscription;
  } catch (error) {
    console.error('[Location] Error setting up location subscription:', error);
    throw error;
  }
};
