import { ethers } from 'hardhat';
import hre from 'hardhat';

const contractName = 'EtherPhunksBridgeL1';
const _relaySigner = '0x735dC42DEBC5474F51d3a4fdCA19b02462fA984e';
const _relayReceiver = '0x735dC42DEBC5474F51d3a4fdCA19b02462fA984e';

async function deployBridgeMainnet() {
  const [signer] = await hre.ethers.getSigners();

  console.log('\n\n=====================================================================');
  console.log(`Deploying ${contractName} contract with the account:`, signer.address);

  // Get the ContractFactory
  const ContractFactory = await hre.ethers.getContractFactory(contractName);

  // Simulate deployment to estimate gas
  const deploymentTransaction = await ContractFactory.getDeployTransaction(_relaySigner, _relayReceiver);
  const estimatedGas = await ethers.provider.estimateGas(deploymentTransaction);
  const feeData = await ethers.provider.getFeeData();

  console.log('\nDeployment costs:');
  console.log({
    estimatedGas: Number(estimatedGas),
    gasPrice: Number(feeData.gasPrice),
    total: Number(estimatedGas) * Number(feeData.gasPrice),
    eth: ethers.formatEther(BigInt(`${Number(estimatedGas) * Number(feeData.gasPrice)}`)),
  });
  console.log('=====================================================================');

  // Wait 10 seconds in case we want to cancel the deployment
  await delay(10000);

  // Deploy the contract
  const contract = await ContractFactory.deploy(_relaySigner, _relayReceiver);
  const contractAddress = await contract.getAddress();

  // Wait for the contract to be deployed
  await contract.waitForDeployment();

  console.log(`${contractName} deployed to:`, contractAddress);
  console.log('\nVerify with:');
  console.log(`npx hardhat verify --network sepolia ${contractAddress} ${_relaySigner} ${_relayReceiver}`);
  console.log('=====================================================================');
  console.log(`\n`);

  return contractAddress;
}

deployBridgeMainnet()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}
