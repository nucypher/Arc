import { ethers } from 'ethers';
import { initialize, encrypt, decrypt, domains, ThresholdMessageKit } from '@nucypher/taco';
import { SelfDelegateProvider } from '@nucypher/taco-auth';

let isTacoInitialized = false;
let initializationPromise: Promise<void> | null = null;
let selfDelegateProvider: SelfDelegateProvider | null = null;
let delegatedSigner: any = null; // Will store the delegated app-side signer
let delegationTimestamp: number | null = null; // Track when the delegation was created

const DELEGATION_EXPIRY = 1000 * 60 * 60; // 1 hour in milliseconds

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

const isDelegationExpired = (): boolean => {
  if (!delegationTimestamp) return true;
  const now = Date.now();
  const expired = now - delegationTimestamp > DELEGATION_EXPIRY;
  if (expired) {
    console.log('⏰ Delegation has expired');
  }
  return expired;
};

export const revokeDelegation = () => {
  console.log('🔄 Revoking current delegation...');
  selfDelegateProvider = null;
  delegatedSigner = null;
  delegationTimestamp = null;
  console.log('✅ Delegation revoked successfully');
};

export const initializeEncryptorSigner = async (
  web3Provider: ethers.providers.Web3Provider,
  forceNew: boolean = false
) => {
  try {
    console.log('🔑 Initializing encryptor signer...');
    
    // Check if we can reuse existing signer
    if (delegatedSigner && !forceNew && !isDelegationExpired()) {
      console.log('♻️ Reusing existing delegated signer');
      return delegatedSigner;
    }

    // If we're forcing new or delegation expired, clean up old one
    if (delegatedSigner) {
      if (forceNew) {
        console.log('🔄 Forcing new delegation as requested');
      }
      revokeDelegation();
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
    delegationTimestamp = Date.now();
    console.log('✅ Delegated signer created successfully');
    
    return delegatedSigner;
  } catch (error) {
    console.error('❌ Error initializing encryptor signer:', error);
    // Clean up on error
    revokeDelegation();
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
    
    // Initialize the delegated signer if not already done or if expired
    if (!delegatedSigner || isDelegationExpired()) {
      console.log('🔄 No valid delegated signer found, initializing...');
      await initializeEncryptorSigner(web3Provider);
    } else {
      console.log('✅ Using existing delegated signer');
    }

    console.log('📝 Encrypting message with conditions:', {
      domain: domain.toString(),
      ritualId,
      conditionLogic: condition?.toString() || 'No condition',
      delegationAge: delegationTimestamp ? `${(Date.now() - delegationTimestamp) / 1000}s` : 'unknown'
    });

    // Use the delegated signer for encryption
    const messageKit = await encrypt(
      web3Provider,
      domain,
      message,
      condition,
      parseInt(ritualId),
      delegatedSigner
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
  revokeDelegation();
  console.log('✅ Encryptor signer reset complete');
};

export const getDelegationStatus = () => ({
  isActive: !!delegatedSigner,
  timestamp: delegationTimestamp,
  timeRemaining: delegationTimestamp 
    ? Math.max(0, (delegationTimestamp + DELEGATION_EXPIRY) - Date.now())
    : 0
});
