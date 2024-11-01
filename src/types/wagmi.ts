import { type Config } from 'wagmi';
import { type ThresholdMessageKit } from '@nucypher/taco';

export interface ChatMessage {
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

export interface LocationUpdate {
  sender: string;
  nickname: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  isLive: boolean;
  timestamp: number;
}

export interface WakuMessage<T = any> {
  payload: Uint8Array;
  timestamp: number;
  sender?: string;
  nickname?: string;
  content?: T;
  condition?: string;
}

export interface Web3Config extends Config {
  _internal?: unknown;
} 