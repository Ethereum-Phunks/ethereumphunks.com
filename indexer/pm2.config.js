const dotenv = require('dotenv');

// Load the Supabase env
dotenv.config({ path: '.env.supabase' });

// Load environment files
const loadEnvFile = (filename) => {
  const result = dotenv.config({ path: filename });
  return result.error ? {} : result.parsed;
};

const supabaseConfig = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE,
  SUPABASE_URL_PROD: process.env.SUPABASE_URL_PROD,
  SUPABASE_SERVICE_ROLE_PROD: process.env.SUPABASE_SERVICE_ROLE_PROD,
};

module.exports = {
  apps: [
    {
      name: "mainnet",
      script: "dist/mainnet/main.js",
      env: {
        ...supabaseConfig,
        ...loadEnvFile('.env.mainnet'),
        NODE_ENV: "development",
        PORT: 3002,
        CHAIN_ID_L1: 1,
        CHAIN_ID_L2: 6969696969,
        QUEUE: 1,
        DISCORD: 0,
        TWITTER: 0,
        TELEGRAM: 0,
        TX_POOL: 0,
        MINT: 0,
      },
    },
    {
      name: "sepolia",
      script: "dist/sepolia/main.js",
      env: {
        ...supabaseConfig,
        ...loadEnvFile('.env.sepolia'),
        NODE_ENV: "development",
        PORT: 3003,
        CHAIN_ID_L1: 11155111,
        CHAIN_ID_L2: 6969696969,
        QUEUE: 1,
        DISCORD: 0,
        TWITTER: 0,
        TELEGRAM: 0,
        TX_POOL: 0,
        MINT: 0,
      },
    },
  ],
};
