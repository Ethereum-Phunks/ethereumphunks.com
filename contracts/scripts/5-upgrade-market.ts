// https://forum.openzeppelin.com/t/openzeppelin-upgrades-step-by-step-tutorial-for-hardhat/3580

import hre, { upgrades } from 'hardhat';

const contractName = 'EtherPhunksMarketV2';
const _proxyAddress = '0xD3418772623Be1a3cc6B6D45CB46420CEdD9154a';

const _version = 2;

export async function upgradeMarket() {
  const [signer] = await hre.ethers.getSigners();

  console.log('\n\n=====================================================================');
  console.log(`Upgrading to ${contractName} with account:`, signer.address);
  console.log('=====================================================================');

  // Get the contract factory
  const ContractFactory = await hre.ethers.getContractFactory(contractName);

  // Upgrade the contract
  const contract = await upgrades.upgradeProxy(
    _proxyAddress,
    ContractFactory,
    { call: { fn: 'initializeV2', args: [_version] } }
  );
  await contract.waitForDeployment();

  const upgraded = await contract.getAddress();

  console.log('\n\n=====================================================================');
  console.log(`${contractName} Upgraded`, upgraded);
  console.log('=====================================================================');

  console.log('\n\n=====================================================================');
  console.log(`Verify with: npx hardhat verify --network sepolia ${upgraded}`);
  console.log('=====================================================================');
}

upgradeMarket().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error({error});
  process.exit(1);
});
