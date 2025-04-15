# Ethereum Phunks Monorepo

![Static Badge](https://img.shields.io/badge/100%25-PHUNKY-green) [![X (formerly Twitter) Follow](https://img.shields.io/twitter/follow/etherphunks?style=social)](https://twitter.com/etherphunks)

Ethereum Phunks Market is an open source platform for trading ethscriptions on the Ethereum blockchain. The project consists of three main components: a marketplace frontend, smart contracts, and an indexer service.

## Project Structure

The repository is organized into three main directories:

### 1. Marketplace (`/marketplace`)
An Angular-based frontend application that provides an interface for:

- **Marketplace Features**:
  - Buy, sell & trade curated ethscription collections
  - Advanced filtering and search capabilities
  - Real-time price tracking and market data

- **Social Features**:
  - In-app chat system
  - Comments and discussions
  - User activity tracking
  - Leaderboard system
  - Notifications system

- **Technical Features**:
  - IPFS integration for content storage
  - Progressive Web App (PWA) support
  - GraphQL integration
  - State management system
  - Custom pipes and directives

### 2. Contracts (`/contracts`)
Smart contracts written in Solidity that power the Ethereum Phunks ecosystem:
- Core marketplace functionality
- Bridge contracts for cross-chain operations
- Utility contracts for points and rewards
- Governance and administration features

Built with:
- Hardhat development environment
- OpenZeppelin contracts
- Comprehensive test suite
- Deployment scripts

### 3. Indexer (`/indexer`)
A NestJS-based backend service that:
- Indexes and processes ethscriptions following the [Ethscriptions Protocol](https://ethscriptions.com)
- Tracks marketplace events and activities
- Manages real-time data synchronization
- Provides API endpoints for the marketplace

Key features:
- Protocol-compliant ethscription processing
- Real-time block processing
- Queue-based event handling
- Bridge operation support
- WebSocket notifications

## Getting Started

### Prerequisites
- Node.js (v20 or higher)
- Yarn package manager
- Redis (for indexer)
- Supabase (for data storage)
- IPFS (for content storage)

### Development Setup

1. Clone the repository
2. Install dependencies for each component:
   ```bash
   # Marketplace
   cd marketplace
   yarn install

   # Contracts
   cd ../contracts
   yarn install

   # Indexer
   cd ../indexer
   yarn install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env` in each directory
   - Update with your specific configuration

4. Start development servers:
   ```bash
   # Marketplace
   cd marketplace
   yarn start:mainnet # or yarn start:sepolia

   # Indexer
   cd ../indexer
   yarn start:dev
   ```

## Deployment

Each component has its own deployment process:

### Marketplace
```bash
cd marketplace
yarn build
# Deploy to your hosting service
```

### Contracts
```bash
cd contracts
yarn hardhat deploy --network <network>
```

### Indexer
```bash
cd indexer
yarn build
yarn engage
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) license - see the LICENSE file for details.

## Resources

- [Ethscriptions Protocol](https://ethscriptions.com)
- [Twitter](https://twitter.com/etherphunks)
