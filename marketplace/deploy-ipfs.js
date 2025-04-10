const { create } = require('ipfs-http-client');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
require('dotenv').config();

// IPFS configuration
const localNode = process.env.IPFS_LOCAL_NODE || 'http://localhost:5001';
const cloudNode = process.env.IPFS_CLOUD_NODE;

// Get the current timestamp for the build directory
const timestamp = moment().format('MMMD').toLowerCase();

// Common IPFS options for consistent hashing
const ipfsOptions = {
  cidVersion: 1,
  hashAlg: 'sha2-256',
  wrapWithDirectory: true
};

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryOperation(operation, retries = MAX_RETRIES) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${i + 1} failed, retrying in ${RETRY_DELAY/1000} seconds...`);
      await sleep(RETRY_DELAY);
    }
  }
  throw lastError;
}

async function deployToIPFS() {
  try {
    // Create IPFS clients with timeout configuration
    const localClient = create({
      url: localNode,
      timeout: '2m'
    });

    const cloudClient = create({
      url: cloudNode,
      timeout: '2m'
    });

    // Deploy both sepolia and mainnet builds
    const configs = ['sepolia', 'mainnet'];

    for (const config of configs) {
      const buildDir = path.join(__dirname, 'dist', `etherphunks-market-${config}_${timestamp}`, 'browser');

      if (!fs.existsSync(buildDir)) {
        console.log(`Build directory for ${config} not found: ${buildDir}`);
        continue;
      }

      console.log(`\nDeploying ${config} build...`);
      console.log(`Build directory: ${buildDir}`);

      // Read all files in the build directory recursively and sort them
      const files = [];
      function readDir(dir, relativePath = '') {
        const items = fs.readdirSync(dir).sort(); // Sort files for consistent order
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const relPath = path.join(relativePath, item);
          if (fs.statSync(fullPath).isDirectory()) {
            readDir(fullPath, relPath);
          } else {
            files.push({
              path: relPath,
              content: fs.createReadStream(fullPath)
            });
          }
        }
      }
      readDir(buildDir);

      // Add files to local IPFS node
      console.log(`Uploading ${config} build to local IPFS node...`);
      const localAddResult = await localClient.addAll(files, ipfsOptions);

      let rootHash;
      let rootCid;
      for await (const result of localAddResult) {
        if (result.path === '') {
          rootHash = result.cid.toString();
          rootCid = result.cid;
          console.log(`${config} IPFS Hash:`, rootHash);
        }
      }

      // Pin to local node
      await localClient.pin.add(rootCid);
      console.log(`Pinned to local node`);

      // Pin to cloud node using remote pinning
      console.log(`Pinning to Digital Ocean IPFS node...`);
      try {
        await retryOperation(async () => {
          await cloudClient.pin.remote.add(rootCid, {
            service: 'ipfs',
            name: `etherphunks-market-${config}_${timestamp}`,
            background: true
          });
        });
        console.log(`Pinned to Digital Ocean node`);
      } catch (error) {
        console.error('Failed to pin to Digital Ocean node after retries:', error);
        console.log('The content is still available on your local node and IPFS network.');
        console.log('You may need to check your Digital Ocean IPFS node configuration.');
        continue;
      }

      console.log(`\n${config} deployment complete!`);
      console.log('IPFS Hash:', rootHash);
      console.log('You can access your site at:');
      console.log(`https://ipfs.io/ipfs/${rootHash}`);
      console.log(`https://cloudflare-ipfs.com/ipfs/${rootHash}`);
      console.log(`https://gateway.pinata.cloud/ipfs/${rootHash}`);
      console.log(`https://dweb.link/ipfs/${rootHash}`);
      console.log(`http://192.81.213.80:8080/ipfs/${rootHash}`);
    }

  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

deployToIPFS();
