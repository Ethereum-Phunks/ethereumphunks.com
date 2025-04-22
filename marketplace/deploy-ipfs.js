import { create } from 'ipfs-http-client';
import { fileURLToPath } from 'url';
import moment from 'moment';

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

import dotenv from 'dotenv';
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// IPFS configuration
const cloudNode = process.env.IPFS_CLOUD_NODE;
const cloudToken = process.env.IPFS_CLOUD_TOKEN;

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
      console.log(chalk.yellow(`Attempt ${i + 1} failed, retrying in ${RETRY_DELAY/1000} seconds...`));
      await sleep(RETRY_DELAY);
    }
  }
  throw lastError;
}

function logSection(title) {
  console.log(chalk.blue('\n' + '='.repeat(50)));
  console.log(chalk.blue.bold(` ${title} `));
  console.log(chalk.blue('='.repeat(50) + '\n'));
}

function logSuccess(message) {
  console.log(chalk.green('✓ ' + message));
}

function logError(message) {
  console.log(chalk.red('✗ ' + message));
}

function logInfo(message) {
  console.log(chalk.cyan('ℹ ' + message));
}

function logUrl(url) {
  console.log(chalk.hex('#00BFFF').underline(url));
}

async function deployToIPFS() {
  try {
    // Create IPFS client with timeout configuration
    const cloudClient = create({
      url: cloudNode,
      timeout: '5m',
      headers: {
        Authorization: `Bearer ${cloudToken}`
      }
    });

    // Deploy mainnet build
    const configs = ['mainnet'];

    for (const config of configs) {
      logSection(`Deploying ${config.toUpperCase()} Build`);

      const buildDir = path.join(__dirname, 'dist', `etherphunks-market-${config}_${timestamp}`, 'browser');

      if (!fs.existsSync(buildDir)) {
        logError(`Build directory not found: ${buildDir}`);
        continue;
      }

      logInfo(`Build directory: ${buildDir}`);

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

      let rootHash;
      let rootCid;

      // Upload to remote node
      try {
        logInfo(`Uploading to remote IPFS node...`);
        const remoteAddResult = cloudClient.addAll(files, ipfsOptions);
        for await (const result of remoteAddResult) {
          if (result.path === '') {
            rootHash = result.cid.toString();
            rootCid = result.cid;
            logSuccess(`IPFS Hash: ${rootHash}`);
          }
        }
        logSuccess(`Pinned to remote node`);
      } catch (error) {
        logError(`Failed to upload to remote node: ${error.message}`);
        throw error;
      }

      logSection(`${config.toUpperCase()} Deployment Complete`);
      logSuccess(`IPFS Hash: ${rootHash}`);
      logInfo('You can access your site at:');
      logUrl(`https://${rootHash}.ipfs.dweb.link`);
    }

  } catch (error) {
    logError(`Deployment failed: ${error.message}`);
    process.exit(1);
  }
}

deployToIPFS();
