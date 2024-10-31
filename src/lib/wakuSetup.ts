import { createLightNode, waitForRemotePeer, Protocols, createEncoder, createDecoder } from '@waku/sdk';
import { LightNodeProvider } from '@waku/react';
import protobuf from 'protobufjs';

export const defaultContentTopic = '/taco-chat/1/messages/proto';

let wakuNode: any = null;

// Define message structure
const Message = new protobuf.Type('Message')
  .add(new protobuf.Field('timestamp', 1, 'uint64'))
  .add(new protobuf.Field('sender', 2, 'string'))
  .add(new protobuf.Field('nickname', 3, 'string'))
  .add(new protobuf.Field('content', 4, 'bytes'));

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

export const sendWakuMessage = async (topic: string, sender: string, messageKit: Uint8Array, nickname: string) => {
  if (!wakuNode) throw new Error('Waku node not initialized');

  const protoMessage = Message.create({
    timestamp: Date.now(),
    sender,
    nickname,
    content: messageKit,
  });

  const serializedMessage = Message.encode(protoMessage).finish();

  await wakuNode.lightPush.send(createEncoder({ contentTopic: topic }), {
    payload: serializedMessage,
  });
};

export { LightNodeProvider };
