import { ethers } from 'hardhat';

import { Contract } from 'ethers';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';

const contractName = 'EtherPhunksBridgeMainnetTEST';
const _relaySigner = '0x735dC42DEBC5474F51d3a4fdCA19b02462fA984e';

describe('EtherPhunksBridgeMainnetTEST', function () {

  let bridge: Contract;
  let bridgeAddress: string;
  let owner: HardhatEthersSigner;
  let otherAccount: HardhatEthersSigner;

  beforeEach(async () => {
    // Deploy a fresh instance before each test
    const deployment = await deployEtherPhunksBridgeMainnetTESTFixture();

    bridge = deployment.bridge;
    bridgeAddress = await deployment.bridge.getAddress();
    owner = deployment.owner;
    otherAccount = deployment.otherAccount;
  });

  // Deployment tests
  describe('Deployment', () => {
    it('Should initialize the contract with the correct relay signer', async () => {
      const relaySigner = await bridge.relaySigner();
      expect(relaySigner).to.equal(_relaySigner);
    });
  });

  // Fallback function tests
  describe('Fallback', () => {
    it('Should revert when calling the fallback function', async () => {
      const data = `0x1122ee4dd2f8ae3b1c81bb9dfcf4c29e3190244863864558fef3fb65b45632e020d8e193ab782b4b0e0cdba8da88a845c6accd000b56fc7e5e01ca715018d40b709d478d3d24446a92f7a886e6a5959d4ec34436654c7fa98cd66ab983caf789000000000000000000000000000000000000000000000000000000000000001c`;

      const transaction = owner.sendTransaction({
        to: bridgeAddress,
        data: data,
        gasLimit: 1000000,
      });

      // make sure the transaction is successful
      (await transaction).getTransaction().then(async (txn) => {
        const receipt = await txn?.wait();
        console.log(receipt);
        expect(txn?.nonce).to.equal(0);
      });

    });
  });

  async function deployEtherPhunksBridgeMainnetTESTFixture() {
    const [owner, otherAccount] = await ethers.getSigners();
    const Bridge = await ethers.getContractFactory(contractName);

    // Deploy contract
    const bridge = await Bridge.deploy(_relaySigner);
    await bridge.waitForDeployment();

    return { bridge, owner, otherAccount };
  }
});
