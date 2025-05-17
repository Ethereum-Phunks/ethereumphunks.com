# Ethereum Phunks Indexer

An EVM inscriptions indexer that indexes collections curated by the Ethereum Phunks marketplace. The indexer strictly follows all rules and specifications set by the [Ethscriptions Protocol](https://ethscriptions.com), ensuring accurate and compliant ethscription processing. It processes and tracks marketplace-specific events including transfers, contract events, points, comments, and other marketplace activities. It supports both Ethereum Mainnet and Sepolia testnet.

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
- **API**: Protected endpoints with API key middleware for admin tasks and other operations
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
9. **Config Module**: Manages configuration settings

## Prerequisites

- Node.js (v20 or higher)
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

## Configuration

The indexer uses a structured environment configuration system that requires specific `.env` files for different networks and services:

### Environment Files
- `.env.mainnet`: Mainnet-specific configuration
- `.env.sepolia`: Sepolia testnet configuration
- `.env.supabase`: Supabase database configuration

### Required Environment Variables

#### Network Configuration (in .env.mainnet and .env.sepolia)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins
- `CHAIN_ID_L1`: Ethereum chain ID (1 for mainnet, 11155111 for Sepolia)
- `CHAIN_ID_L2`: Layer 2 chain ID
- `PORT`: Service port (default: 3002 for mainnet, 3003 for Sepolia)

#### Feature Flags
- `QUEUE`: Enable/disable queue processing (0/1)
- `TX_POOL`: Enable/disable transaction pool monitoring (0/1)
- `MINT`: Enable/disable minting operations (0/1)
- `DISCORD`: Enable/disable Discord integration (0/1)
- `TWITTER`: Enable/disable Twitter integration (0/1)
- `TELEGRAM`: Enable/disable Telegram integration (0/1)

#### Supabase Configuration (in .env.supabase)
- `SUPABASE_URL`: Development/Local Supabase project URL
- `SUPABASE_SERVICE_ROLE`: Development/Local Supabase service role key
- `SUPABASE_URL_PROD`: Production Supabase URL
- `SUPABASE_SERVICE_ROLE_PROD`: Production service role key

### Running the Indexer

#### Development Mode (Local)
```bash
# For mainnet
yarn start:dev:mainnet

# For Sepolia
yarn start:dev:sepolia
```

#### Production Mode (PM2)

Run all networks with PM2:
```bash
yarn engage
```

Run individual networks:
```bash
# Mainnet only
yarn build:mainnet && pm2 start pm2.config.js --only mainnet

# Sepolia only
yarn build:sepolia && pm2 start pm2.config.js --only sepolia
```

For more PM2 commands and configuration options, refer to the [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/).

## API Endpoints

The indexer provides several protected API endpoints:

- `/admin/*`: Administrative operations
- `/ethscriptions/*`: Ethscription-related operations
- `/notifications/*`: Notification management
- `/bridge-l1/*`: Layer 1 bridge operations

All POST endpoints are protected with API key middleware.

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

Contributions are welcome. Please follow these steps:
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
