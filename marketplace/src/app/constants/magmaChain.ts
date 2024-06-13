import { defineChain } from 'viem'

export const magma = defineChain({
  id: 6969696969,
  name: 'Magma:Onyx',
  nativeCurrency: { name: 'Lava', symbol: 'LAVA', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://turbo.magma-rpc.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Magmascan',
      url: 'https://magmascan.org',
    },
  },
  testnet: true,
});
