export const OrdexMarketABI = [
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'from',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'to',
            type: 'address',
          },
          {
            internalType: 'uint256[]',
            name: 'ids',
            type: 'uint256[]',
          },
        ],
        internalType: 'struct LibMarket.TransferConfirmation',
        name: 'confirmation',
        type: 'tuple',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'expiryTimestamp',
            type: 'uint256',
          },
          {
            internalType: 'uint8',
            name: 'v',
            type: 'uint8',
          },
          {
            internalType: 'bytes32',
            name: 'r',
            type: 'bytes32',
          },
          {
            internalType: 'bytes32',
            name: 's',
            type: 'bytes32',
          },
        ],
        internalType: 'struct LibMarket.Signature',
        name: 'sig',
        type: 'tuple',
      },
    ],
    name: 'bulkWithdrawItems',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
