// https://forum.openzeppelin.com/t/openzeppelin-upgrades-step-by-step-tutorial-for-hardhat/3580

import hre, { upgrades } from 'hardhat';

const contractName = 'EtherPhunksMarketV2_1';
const _proxyAddress = '0x3dfbc8c62d3ce0059bdaf21787ec24d5d116fe1e';

const _version = 2;
const _revShareAddress = '0x051281d626b327638B916E1a52aF1495855016c1';

export async function upgradeMarket() {
  const [signer] = await hre.ethers.getSigners();

  console.log('\n\n=====================================================================');
  console.log(`Upgrading to ${contractName} with account:`, signer.address);
  console.log('=====================================================================');

  const ContractFactory = await hre.ethers.getContractFactory(contractName);

  // Upgrade the contract
  const contract = await upgrades.upgradeProxy(
    _proxyAddress,
    ContractFactory,
    // { call: { fn: 'initializeV3', args: [_version, _revShareAddress] } }
  );

  // console.log({contract});

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
