let isNetworkSwitchPending = false;

export const switchToPolygonAmoy = async (): Promise<boolean> => {
  if (isNetworkSwitchPending) {
    console.log('Network switch already in progress');
    return false;
  }

  if (window.ethereum) {
    try {
      isNetworkSwitchPending = true;
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x13882' }], // 80002 in hexadecimal
      });
      return true;
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x13882',
              chainName: 'Polygon Amoy',
              nativeCurrency: {
                name: 'MATIC',
                symbol: 'MATIC',
                decimals: 18
              },
              rpcUrls: ['https://rpc-amoy.polygon.technology'],
              blockExplorerUrls: ['https://www.oklink.com/amoy']
            }],
          });
          return true;
        } catch (addError) {
          console.error('Failed to add Polygon Amoy network:', addError);
        }
      } else if (switchError.code === -32002) {
        console.log('Network switch already pending in MetaMask');
        return false;
      } else {
        console.error('Failed to switch to Polygon Amoy network:', switchError);
      }
    } finally {
      isNetworkSwitchPending = false;
    }
  }
  return false;
};
