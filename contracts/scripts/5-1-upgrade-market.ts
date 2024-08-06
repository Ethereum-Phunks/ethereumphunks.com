// https://forum.openzeppelin.com/t/openzeppelin-upgrades-step-by-step-tutorial-for-hardhat/3580

import hre, { upgrades } from 'hardhat';
import { EtherPhunksMarketV2_1 } from '../typechain-types';

const contractName = 'EtherPhunksMarketV2_1';
const _proxyAddress = '0xd3418772623be1a3cc6b6d45cb46420cedd9154a';

const _version = 3;
const seed = [["0x685d5f86d4f4d8cc1797d666052573a477567277","0x78d3aaf8e3cd4b350635c79b7021bd76144c582c","0x6466c91c32a6ee95c7d0660659cdfbcd2eee475d","0x32f12843e7dba0e9452f5223713bb9a332313d2e","0xf1aa941d56041d47a9a18e99609a047707fe96c7","0x3c475c1fc2b9d7022863734ef17c1823c6504746","0xfe84e7c7cd5b01f270217cdd7f69927caf2d0e2f","0x66fc46e39f11762eb1372f51fff003ca450acc2e","0x436196ab0550e73aeedd1a494c2420daca7fe0ca","0x477ea7a022e51b6eb0dcb6d802fb5f0cfc3b4a81","0xa2f52aff3b31f8decfe50404442d040e71920cb6","0x6744d79392eb4d47c49a92f03bce87885fa0f3c7","0x64698f3223c010ccf1a28486969a669f3c4ed748","0x37ea53fa97a03f1f0a9c46fe653a04a9c658e282","0x1fe28a09deb49d07a4c88a5c4107b49c62cfc837","0x8addcbb41d8eb2bd77fe64e49ba269bf88c072a5"],["50000000000000000","0","165800000000000000","0","0","142213280000000000","21694206900000000","35000000000000004","437900400000000032","16660000000000002","0","33900000000000000","0","15000000000000000","10000000000000000","25000000000000000"]];

export async function upgradeMarket() {
  const [signer] = await hre.ethers.getSigners();

  // Get the contract factory
  const ContractFactory = await hre.ethers.getContractFactory(contractName);

  // Upgrade the contract
  const contract = await upgrades.upgradeProxy(
    _proxyAddress,
    ContractFactory,
    { call: { fn: 'initializeV2_1', args: [_version] } }
  );
  await contract.waitForDeployment();

  const upgraded = await contract.getAddress();

  console.log('\n\n=====================================================================');
  console.log(`${contractName} Upgraded`, upgraded);
  console.log('=====================================================================');

  console.log('\n\n=====================================================================');
  console.log(`Verify with: npx hardhat verify --network sepolia ${upgraded}`);
  console.log('=====================================================================');

  console.log('\n\n=====================================================================');
  console.log('Seeding data...');

  const contractInstance = ContractFactory.attach(_proxyAddress) as EtherPhunksMarketV2_1;

  console.log('Patching withdrawals...');
  try {
    const tx = await contractInstance.connect(signer).patchWithdrawals(seed[0], seed[1]);
    console.log('patchWithdrawals() Transaction hash:', tx.hash);
    await tx.wait();
    console.log('Data seeded');
  } catch (error: any) {
    console.error('Error patching withdrawals:', error);
    if (error.error && error.error.message) {
      console.error('Error message:', error.error.message);
    }
  }

  let passed = true;
  for (let i = 0; i < seed[0].length; i++) {
    const address = seed[0][i];
    const value = seed[1][i];
    const res = await contractInstance.pendingWithdrawals(address);
    if (res.toString() !== value) {
      console.error(`Error with ${address}: expected ${value}, got ${res.toString()}`);
      passed = false;
    }
  }
  console.log(`Seed data test ${passed ? 'passed' : 'failed'}`);
}

upgradeMarket().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error({error});
  process.exit(1);
});

// const _signerAddress = '0xe285d2135fAA48F871907C51Fa783d6c0a15DEC9';

// await hre.network.provider.request({
//   method: "hardhat_impersonateAccount",
//   params: [_signerAddress],
// });

// // Set balance for the impersonated account
// await hre.network.provider.send("hardhat_setBalance", [
//   _signerAddress,
//   "0x56BC75E2D63100000", // 100 ETH
// ]);

// const signer = await hre.ethers.getSigner(_signerAddress);

// console.log('\n\n=====================================================================');
// console.log(`Upgrading to ${contractName} with account:`, signer.address);
// console.log('=====================================================================');

// await contractInstance.pause();
