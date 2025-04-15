# Ethereum Phunks Indexer

A specialized blockchain indexer built with NestJS that primarily indexes ethscriptions curated by the Ethereum Phunks marketplace. The indexer strictly follows all rules and specifications set by the [Ethscriptions Protocol](https://ethscriptions.com), ensuring accurate and compliant ethscription processing. It processes and tracks marketplace-specific events including transfers, contract events, points, comments, and other marketplace activities. It supports both Ethereum Mainnet and Sepolia testnet.

## Protocol Compliance

The indexer implements the complete Ethscriptions Protocol specification, including:

- **Data Format Validation**: Ensures all ethscriptions follow the protocol's data format rules
- **Content Type Handling**: Proper processing of supported content types as per protocol specifications
- **Transfer Rules**: Implements the protocol's transfer mechanism and validation
- **State Management**: Maintains accurate state tracking in accordance with protocol rules
- **Event Processing**: Handles all protocol-defined events and their implications

## Primary Features

- **Ethscription Indexing**: Core functionality for tracking and indexing ethscriptions curated by the marketplace
- **Marketplace Event Processing**:
  - Transfer tracking
  - Contract event monitoring
  - Points system events
  - Comment system events
  - Other marketplace-specific activities
- **Real-time Block Processing**: Watches and processes new blocks as they are added to the chain
- **Backfill Capability**: Can process historical blocks to catch up with the chain

## Additional Features

- **Bridge Operations**: Support for Layer 1 and Layer 2 bridge operations
- **Transaction Pool Monitoring**: Optional module for tracking transactions in the mempool
- **Queue-based Processing**: Uses Bull queues for reliable block and event processing
- **WebSocket Support**: Real-time updates via Socket.IO
- **API Security**: Protected endpoints with API key middleware
- **Modular Architecture**: Separated into distinct modules for different functionalities

## Core Modules

1. **Ethscriptions Module**: Primary module for processing and tracking ethscriptions
2. **Marketplace Modules**:
   - Transfer tracking
   - Contract event processing
   - Points system
   - Comments system
3. **Bridge Modules**:
   - BridgeL1Module: Manages Layer 1 bridge operations
   - BridgeL2Module: Handles Layer 2 bridge operations
4. **Queue Module**: Manages background processing queues
5. **Storage Module**: Handles data persistence
6. **Notifications Module**: Manages system notifications
7. **Transaction Pool Module**: Optional module for transaction pool monitoring
8. **Mint Module**: Optional module for minting operations

## Prerequisites

- Node.js (v16 or higher)
- Yarn package manager
- Redis (for queue management)
- Supabase (for data storage)
- Environment variables configured (see `.env.example`)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   yarn install
   ```
3. Copy `.env.example` to `.env` and configure your environment variables
4. Build the project:
   ```bash
   yarn build
   ```

## Configuration

The indexer can be configured through environment variables. Key configurations include:

- `CHAIN_ID`: The Ethereum chain ID to index
- `INDEXER`: Enable/disable the indexer
- `TX_POOL`: Enable/disable transaction pool monitoring
- `MINT`: Enable/disable minting operations
- Database and API credentials
- Redis configuration

## Running the Indexer

### Development Mode
```bash
yarn start:dev
```

### Production Mode
```bash
yarn engage
```

This will:
1. Build the project
2. Start the PM2 process manager
3. Show logs

## API Endpoints

The indexer provides several protected API endpoints:

- `/admin/*`: Administrative operations
- `/ethscriptions/*`: Ethscription-related operations
- `/notifications/*`: Notification management
- `/bridge-l1/*`: Layer 1 bridge operations

All POST endpoints are protected with API key middleware.

## Architecture

The indexer follows a modular architecture with the following key components:

1. **App Service**: Core service that manages the indexer lifecycle
2. **Block Processing Queue**: Handles block processing in the background
3. **Ethscription Processing**: Primary service for handling ethscription events
4. **Marketplace Event Processing**: Handles marketplace-specific events
5. **Bridge Processing Queue**: Manages bridge-related operations
6. **Web3 Service**: Interacts with the Ethereum blockchain
7. **Storage Service**: Manages data persistence
8. **Utility Service**: Provides common utilities

## Error Handling

The indexer includes robust error handling:
- Automatic restart on errors
- Queue clearing on startup
- Error logging and monitoring
- Graceful shutdown handling

## Dependencies

Key dependencies include:
- NestJS framework
- Bull for queue management
- Viem for Ethereum interaction
- Socket.IO for real-time updates
- Supabase for data storage
- Redis for caching and queues

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
