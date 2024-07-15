import { ethers } from 'hardhat';
import hre from 'hardhat';

const contractName = 'EtherPhunksBridgeL2';

const metadata = {
  name: 'Ethereum Phunks Market',
  description: '',
  image: '',
  banner_image: '',
  featured_image: '',
  external_link: 'https://etherphunks.eth.limo',
};

const _relaySigner = '0x735dC42DEBC5474F51d3a4fdCA19b02462fA984e';
const _relayReceiver = '0x735dC42DEBC5474F51d3a4fdCA19b02462fA984e';
const _contractUri = `data:application/json,base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`;

async function deployBridgeL2() {
  const [signer] = await hre.ethers.getSigners();

  console.log(_contractUri);

  console.log('\n\n=====================================================================');
  console.log(`Deploying ${contractName} contract with the account:`, signer.address);

  // Get the ContractFactory
  const ContractFactory = await hre.ethers.getContractFactory(contractName);

  // Simulate deployment to estimate gas
  const deploymentTransaction = await ContractFactory.getDeployTransaction(_relaySigner, _relayReceiver, _contractUri);
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
  const contract = await ContractFactory.deploy(_relaySigner, _relayReceiver, _contractUri);
  const contractAddress = await contract.getAddress();

  // Wait for the contract to be deployed
  await contract.waitForDeployment();

  console.log(`${contractName} deployed to:`, contractAddress);
  console.log('\nVerify with:');
  console.log(`npx hardhat verify --network sepolia ${contractAddress} ${_relaySigner} ${_relayReceiver} ${_contractUri}`);
  console.log('=====================================================================');
  console.log(`\n`);

  return contractAddress;
}

deployBridgeL2()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}


// =====================================================================
// Deploying EtherPhunksBridgeL2 contract with the account: 0x051281d626b327638B916E1a52aF1495855016c1

// =====================================================================
// EtherPhunksBridgeL2 deployed to: 0x2A953aA14e986b0595A0c5201dD267391BF7d39d

// Verify with:
// npx hardhat verify --network sepolia 0x2A953aA14e986b0595A0c5201dD267391BF7d39d 0x42069ff109FA2022Ae03532939c2a17B130ffe69 0x42069ff109FA2022Ae03532939c2a17B130ffe69
// =====================================================================
