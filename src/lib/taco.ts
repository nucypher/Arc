import { ethers } from 'ethers';
import { initialize, encrypt, decrypt, domains, ThresholdMessageKit } from '@nucypher/taco';

let isTacoInitialized = false;
let initializationPromise: Promise<void> | null = null;

export const initializeTaco = async () => {
  if (isTacoInitialized) {
    return;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = initialize().then(() => {
    isTacoInitialized = true;
    console.log('TACo initialized');
  }).catch((error) => {
    console.error('Failed to initialize TACo:', error);
    throw error;
  });

  return initializationPromise;
};

export const encryptMessage = async (
  message: string,
  web3Provider: ethers.providers.Web3Provider,
  condition: any,
  domain: domains,
  ritualId: string
) => {

  try {
    const signer = web3Provider.getSigner();

    // Encrypt the message
    const messageKit = await encrypt(
      web3Provider,
      domain,
      message,
      condition,
      ritualId,
      signer
    );

    console.log('Message encrypted successfully');
    return messageKit;
  } catch (error) {
    console.error('Error in encryptMessage:', error);
    throw new Error(`Failed to encrypt message: ${error.message}`);
  }
};

export const decryptMessage = async (
  messageKit: ThresholdMessageKit, 
  web3Provider: ethers.providers.Web3Provider,
  domain: domains
) => {

  try {
    if (!web3Provider) {
      throw new Error('Web3Provider is not initialized');
    }

    const decrypted = await decrypt(
      web3Provider,
      domain,
      messageKit
    );

    return decrypted;
  } catch (error) {
    console.error('Detailed error in decryptMessage:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to decrypt message: ${error.message}`);
    } else {
      throw new Error('Failed to decrypt message: Unknown error');
    }
  }
};
