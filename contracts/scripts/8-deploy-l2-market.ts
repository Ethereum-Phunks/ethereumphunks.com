// https://forum.openzeppelin.com/t/openzeppelin-upgrades-step-by-step-tutorial-for-hardhat/3580
import { ethers } from 'hardhat';
import hre, { upgrades } from 'hardhat';

const contractName = 'EtherPhunksNftMarket';

const _initialBridgeAddress = '';

export async function deployMarket() {
  const [signer] = await hre.ethers.getSigners();

  console.log('\n\n=====================================================================');
  console.log(`Deploying ${contractName} contract with the account:`, signer.address);
  console.log('=====================================================================');

  const ContractFactory = await hre.ethers.getContractFactory(contractName);
  const args = [ _initialBridgeAddress ];

  // Deploy upgradeable contract
  const contract = await upgrades.deployProxy(
    ContractFactory,
    args,
    { initializer: 'initialize' }
  );

  await contract.waitForDeployment();
  const proxyAddress = await contract.getAddress();

  console.log('\n\n=====================================================================');
  console.log(`${contractName} Proxy deployed to:`, proxyAddress);
  console.log('=====================================================================');

  console.log('\n\n=====================================================================');
  console.log(`Verify with: npx hardhat verify --network sepolia ${proxyAddress}`);
  console.log('=====================================================================');

  // Get implementation address
  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log('\n\n=====================================================================');
  console.log(`${contractName} Implementation deployed to:`, implAddress);
  console.log('=====================================================================');

  // Get admin address
  const adminAddress = await upgrades.erc1967.getAdminAddress(proxyAddress);
  console.log('\n\n=====================================================================');
  console.log(`${contractName} Admin deployed to:`, adminAddress);
  console.log('=====================================================================');
  console.log(`\n`);
}

deployMarket().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});


// Magma Deployment

// =====================================================================
// Deploying EtherPhunksNftMarket contract with the account: 0x051281d626b327638B916E1a52aF1495855016c1
// =====================================================================

// =====================================================================
// EtherPhunksNftMarket Proxy deployed to: 0x3Dfbc8C62d3cE0059BDaf21787EC24d5d116fe1e
// =====================================================================

// =====================================================================
// EtherPhunksNftMarket Implementation deployed to: 0x005918E10Ed039807a62c564C72D527BaB15c987
// =====================================================================

// =====================================================================
// EtherPhunksNftMarket Admin deployed to: 0x8fBA6796B55e5D58dca452C9188428909e382ff3
// =====================================================================

// =====================================================================



// Jul 6 2024

// =====================================================================
// Deploying EtherPhunksNftMarket contract with the account: 0x051281d626b327638B916E1a52aF1495855016c1
// =====================================================================


// =====================================================================
// EtherPhunksNftMarket Proxy deployed to: 0x005918E10Ed039807a62c564C72D527BaB15c987
// =====================================================================


// =====================================================================
// Verify with: npx hardhat verify --network sepolia 0x005918E10Ed039807a62c564C72D527BaB15c987
// =====================================================================


// =====================================================================
// EtherPhunksNftMarket Implementation deployed to: 0x26e8fD77346b4B006C5Df61f9706581933560F12
// =====================================================================


// =====================================================================
// EtherPhunksNftMarket Admin deployed to: 0xAdcccc370f09503ef3343bABC9e771e49Bb7366C
// =====================================================================
