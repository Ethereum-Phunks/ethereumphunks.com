// https://forum.openzeppelin.com/t/openzeppelin-upgrades-step-by-step-tutorial-for-hardhat/3580

import { ethers } from 'hardhat';
import hre, { upgrades } from 'hardhat';

const contractName = 'EtherPhunksMarketV2';

const _proxyAddress = '0x3dfbc8c62d3ce0059bdaf21787ec24d5d116fe1e';

export async function upgradeMarket() {
  const [signer] = await hre.ethers.getSigners();

  console.log('\n\n=====================================================================');
  console.log(`forceImport ${contractName} with account:`, signer.address);
  console.log('=====================================================================');

  const ContractFactory = await hre.ethers.getContractFactory(contractName);

  const proxy = await upgrades.forceImport(_proxyAddress, ContractFactory);
  const proxyAddress = await proxy.getAddress();

  console.log('\n\n=====================================================================');
  console.log(`Proxy Imported`, proxyAddress);
  console.log('=====================================================================');
}

upgradeMarket().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error({error});
  process.exit(1);
});
