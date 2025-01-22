import { ethers } from 'ethers';
import { initialize, encrypt, decrypt, domains, ThresholdMessageKit } from '@nucypher/taco';
import { SelfDelegateProvider } from '@nucypher/taco-auth';

let isTacoInitialized = false;
let initializationPromise: Promise<void> | null = null;
let selfDelegateProvider: SelfDelegateProvider | null = null;
let delegatedSigner: any = null; // Will store the delegated app-side signer

export const initializeTaco = async () => {
  if (isTacoInitialized) {
    console.log('🌮 TACo already initialized, skipping...');
    return;
  }

  if (initializationPromise) {
    console.log('🌮 TACo initialization in progress, waiting...');
    return initializationPromise;
  }

  console.log('🌮 Initializing TACo...');
  initializationPromise = initialize().then(() => {
    isTacoInitialized = true;
    console.log('✅ TACo initialized successfully');
  }).catch((error) => {
    console.error('❌ Failed to initialize TACo:', error);
    throw error;
  });

  return initializationPromise;
};

export const initializeEncryptorSigner = async (web3Provider: ethers.providers.Web3Provider) => {
  try {
    console.log('🔑 Initializing encryptor signer...');
    
    if (delegatedSigner) {
      console.log('♻️ Reusing existing delegated signer');
      return delegatedSigner;
    }

    const encryptorSigner = web3Provider.getSigner();
    const address = await encryptorSigner.getAddress();
    console.log('👤 Using signer address:', address);

    console.log('🤝 Creating SelfDelegateProvider...');
    selfDelegateProvider = new SelfDelegateProvider(encryptorSigner);
    
    // Create an ephemeral private key for the app-side signer
    const ephemeralPrivateKey = ethers.Wallet.createRandom().privateKey;
    console.log('🔐 Created ephemeral key for app-side signer');
    
    console.log('📝 Requesting signature for self-delegation...');
    delegatedSigner = await selfDelegateProvider.createSelfDelegatedAppSideSigner(ephemeralPrivateKey);
    console.log('✅ Delegated signer created successfully');
    
    return delegatedSigner;
  } catch (error) {
    console.error('❌ Error initializing encryptor signer:', error);
    throw new Error(`Failed to initialize encryptor signer: ${error.message}`);
  }
};

export const encryptMessage = async (
  message: string,
  web3Provider: ethers.providers.Web3Provider,
  condition: any,
  domain: typeof domains,
  ritualId: string
) => {
  try {
    console.log('🔒 Starting message encryption...');
    
    // Initialize the delegated signer if not already done
    if (!delegatedSigner) {
      console.log('🔄 No delegated signer found, initializing...');
      await initializeEncryptorSigner(web3Provider);
    } else {
      console.log('✅ Using existing delegated signer');
    }

    console.log('📝 Encrypting message with conditions:', {
      domain: domain.toString(),
      ritualId,
      conditionLogic: condition?.toString() || 'No condition'
    });

    // Use the delegated signer for encryption
    const messageKit = await encrypt(
      web3Provider,
      domain,
      message,
      condition,
      parseInt(ritualId),
      delegatedSigner // Use delegated signer instead of direct web3Provider.getSigner()
    );

    console.log('✅ Message encrypted successfully');
    return messageKit;
  } catch (error) {
    console.error('❌ Error in encryptMessage:', error);
    throw new Error(`Failed to encrypt message: ${error.message}`);
  }
};

export const decryptMessage = async (
  messageKit: ThresholdMessageKit, 
  web3Provider: ethers.providers.Web3Provider,
  domain: typeof domains
) => {
  try {
    if (!web3Provider) {
      throw new Error('Web3Provider is not initialized');
    }

    console.log('🔓 Attempting to decrypt message...');
    const decrypted = await decrypt(
      web3Provider,
      domain,
      messageKit
    );
    console.log('✅ Message decrypted successfully');
    return decrypted;
  } catch (error) {
    console.error('❌ Detailed error in decryptMessage:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to decrypt message: ${error.message}`);
    } else {
      throw new Error('Failed to decrypt message: Unknown error');
    }
  }
};

// Add a cleanup function to reset the delegated signer
export const resetEncryptorSigner = () => {
  console.log('🧹 Cleaning up encryptor signer...');
  selfDelegateProvider = null;
  delegatedSigner = null;
  console.log('✅ Encryptor signer reset complete');
};
