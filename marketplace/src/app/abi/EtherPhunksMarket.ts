export const EtherPhunksMarketABI = [
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'additionalBlocksNeeded',
        type: 'uint256',
      },
    ],
    name: 'AdditionalCooldownRequired',
    type: 'error',
  },
  {
    inputs: [],
    name: 'EnforcedPause',
    type: 'error',
  },
  {
    inputs: [],
    name: 'EthscriptionAlreadyReceivedFromSender',
    type: 'error',
  },
  {
    inputs: [],
    name: 'EthscriptionNotDeposited',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ExpectedPause',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidEthscriptionLength',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidInitialization',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NotInitializing',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
    ],
    name: 'OwnableInvalidOwner',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'OwnableUnauthorizedAccount',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ReentrancyGuardReentrantCall',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint64',
        name: 'version',
        type: 'uint64',
      },
    ],
    name: 'Initialized',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'Paused',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'phunkId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'fromAddress',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'toAddress',
        type: 'address',
      },
    ],
    name: 'PhunkBought',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'phunkId',
        type: 'bytes32',
      },
    ],
    name: 'PhunkNoLongerForSale',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'phunkId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'minValue',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'toAddress',
        type: 'address',
      },
    ],
    name: 'PhunkOffered',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'oldPointsAddress',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newPointsAddress',
        type: 'address',
      },
    ],
    name: 'PointsAddressChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'potentialEthscriptionId',
        type: 'bytes32',
      },
    ],
    name: 'PotentialEthscriptionDeposited',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'potentialEthscriptionId',
        type: 'bytes32',
      },
    ],
    name: 'PotentialEthscriptionWithdrawn',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'Unpaused',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'id',
        type: 'bytes32',
      },
    ],
    name: 'ethscriptions_protocol_TransferEthscriptionForPreviousOwner',
    type: 'event',
  },
  {
    stateMutability: 'nonpayable',
    type: 'fallback',
  },
  {
    inputs: [],
    name: 'ETHSCRIPTION_TRANSFER_COOLDOWN_BLOCKS',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32[]',
        name: 'phunkIds',
        type: 'bytes32[]',
      },
      {
        internalType: 'uint256[]',
        name: 'minSalePricesInWei',
        type: 'uint256[]',
      },
    ],
    name: 'batchBuyPhunk',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32[]',
        name: 'phunkIds',
        type: 'bytes32[]',
      },
      {
        internalType: 'uint256[]',
        name: 'minSalePricesInWei',
        type: 'uint256[]',
      },
    ],
    name: 'batchOfferPhunkForSale',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'previousOwner',
        type: 'address',
      },
      {
        internalType: 'bytes32',
        name: 'ethscriptionId',
        type: 'bytes32',
      },
    ],
    name: 'blocksRemainingUntilValidTransfer',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'contractVersion',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_contractVersion',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '_initialPointsAddress',
        type: 'address',
      },
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_contractVersion',
        type: 'uint256',
      },
    ],
    name: 'initializeV2',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'phunkId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'minSalePriceInWei',
        type: 'uint256',
      },
    ],
    name: 'offerPhunkForSale',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'phunkId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'minSalePriceInWei',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'toAddress',
        type: 'address',
      },
    ],
    name: 'offerPhunkForSaleToAddress',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'paused',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'pendingWithdrawals',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'pendingWithdrawalsV2',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    name: 'phunkBids',
    outputs: [
      {
        internalType: 'bool',
        name: 'hasBid',
        type: 'bool',
      },
      {
        internalType: 'bytes32',
        name: 'phunkId',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'bidder',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'phunkId',
        type: 'bytes32',
      },
    ],
    name: 'phunkNoLongerForSale',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    name: 'phunksOfferedForSale',
    outputs: [
      {
        internalType: 'bool',
        name: 'isForSale',
        type: 'bool',
      },
      {
        internalType: 'bytes32',
        name: 'phunkId',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'seller',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'minValue',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'onlySellTo',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'pointsAddress',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_pointsAddress',
        type: 'address',
      },
    ],
    name: 'setPointsAddress',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        internalType: 'bytes32',
        name: 'ethscriptionId',
        type: 'bytes32',
      },
    ],
    name: 'userEthscriptionDefinitelyNotStored',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        internalType: 'bytes32',
        name: 'ethscriptionId',
        type: 'bytes32',
      },
    ],
    name: 'userEthscriptionPossiblyStored',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32[]',
        name: 'phunkIds',
        type: 'bytes32[]',
      },
    ],
    name: 'withdrawBatchPhunks',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'phunkId',
        type: 'bytes32',
      },
    ],
    name: 'withdrawPhunk',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    stateMutability: 'payable',
    type: 'receive',
  },
] as const;
