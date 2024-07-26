import { HardhatUserConfig } from 'hardhat/config';

import '@nomicfoundation/hardhat-toolbox';
import '@openzeppelin/hardhat-upgrades';
// import 'hardhat-log-remover';

import dotenv from 'dotenv';
dotenv.config();

const config: HardhatUserConfig = {
  defaultNetwork: 'mainnet',
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: './contracts/V1',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  networks: {
    // hardhat: {
    //   chainId: 1337,
    //   // forking: {
    //   //   enabled: true,
    //   //   url: 'http://geth.dappnode:8545',
    //   // },
    //   accounts: {
    //     count: 10,
    //     initialIndex: 0,
    //   },
    // },
    mainnet: {
      url: 'http://nethermind.public.dappnode:8545',
      chainId: 1,
      from: process.env.MAINNET_ADDRESS as string,
      accounts: [`0x${process.env.MAINNET_PK}`],
    },
    // sepolia: {
    //   url: 'http://geth.sepolia-geth.dappnode:8545',
    //   chainId: 11155111,
    //   from: process.env.SEPOLIA_ADDRESS as string,
    //   accounts: [`0x${process.env.SEPOLIA_PK}`],
    // },
    // magma: {
    //   url: 'https://turbo.magma-rpc.com',
    //   chainId: 6969696969,
    //   from: process.env.SEPOLIA_ADDRESS as string,
    //   accounts: [`0x${process.env.SEPOLIA_PK}`],
    // },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
    customChains: [
      {
        network: 'magma',
        chainId: 6969696969,
        urls: {
          apiURL: 'https://magmascan.org/api/',
          browserURL: "https://magmascan.org",
        }
      }
    ]
  },
};

export default config;
