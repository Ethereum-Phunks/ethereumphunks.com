import { ethers, upgrades } from 'hardhat';
import hre from 'hardhat';

import { expect } from 'chai';
import { Contract, ZeroAddress, encodeBytes32String, keccak256 } from 'ethers';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { numberToHex, stringToBytes } from 'viem';

const contractName = 'EtherPhunksMarketV2_1';
const _version = 3;

describe('EtherPhunksMarket', function () {

  let _pointsAddress: string;

  let market: Contract;
  let owner: HardhatEthersSigner;
  let otherAccount: HardhatEthersSigner;

  beforeEach(async () => {
    // Deploy a fresh instance before each test
    const deployment = await deployEtherPhunksMarketFixture();
    market = deployment.market;
    owner = deployment.owner;
    otherAccount = deployment.otherAccount;
  });

  describe('Deployment', () => {
    it("Should set the right owner", async () => {
      expect(await market.owner()).to.equal(owner.address);
    });

    it("Should set the right version", async () => {
      // console.log('version', await market.contractVersion());
      expect(await market.contractVersion()).to.equal(_version);
    });

    it("Should set the right points address", async () => {
      expect(await market.pointsAddress()).to.equal(_pointsAddress);
    });
  });

  describe('Escrow', () => {
    it('Should allow a user to escrow a phunk', async () => {
      const marketAddress = await market.getAddress();
      const phunkId = '0xb73019848d725c4502ed3b4f0d29f7481b54699409e5589dcda22d22829c8dee';
      await escrowPhunk(marketAddress, owner, phunkId);

      const escrowedPhunk = await market.userEthscriptionPossiblyStored(owner, phunkId);
      expect(escrowedPhunk).to.equal(true);
    });

    it('should allow user to escrow & list with fallback function', async () => {
      const marketAddress = await market.getAddress();

      const randomPercentage = Math.floor(Math.random() * 100);

      const phunkId = '0xb73019848d725c4502ed3b4f0d29f7481b54699409e5589dcda52d21829c8dee';
      const depositAndListSignature = keccak256(stringToBytes('DEPOSIT_AND_LIST_SIGNATURE'));
      const priceInHex32 = hre.ethers.toBigInt('1000000000000000000').toString(16).padStart(64, '0');
      // const toAddress = otherAccount.address.replace('0x', '').padStart(64, '0');
      const toAddress = ZeroAddress.replace('0x', '').padStart(64, '0');
      const revShare = numberToHex(randomPercentage * 1000).replace('0x', '').padStart(64, '0');

      // console.log({ phunkId, depositAndListSignature, priceInHex32, toAddress, revShare });

      const data = phunkId + depositAndListSignature.slice(2) + priceInHex32 + toAddress + revShare;

      await escrowPhunk(marketAddress, owner, data);

      const escrowedPhunk = await market.userEthscriptionPossiblyStored(owner, phunkId);
      const listing = await market.phunksOfferedForSale(phunkId);

      expect(escrowedPhunk).to.equal(true);
      expect(listing.isForSale).to.equal(true);
      expect(listing.minValue).to.equal('1000000000000000000');
      expect(listing.onlySellTo).to.equal(ZeroAddress);
      expect(listing.revSharePercentage).to.equal(randomPercentage * 1000);
    });
  });

  describe('Offer', () => {
    it('Should allow a user to offer a phunk for sale', async () => {

      const marketAddress = await market.getAddress();
      const phunkId = '0xb73019848d725c4302ed3b4f0d29f7481b54699409e5589dcda52d22829c8dee';
      const minSalePriceInWei = hre.ethers.formatUnits('1000000000000000000', 'wei');

      await escrowPhunk(marketAddress, owner, phunkId);

      await market.offerPhunkForSale(phunkId, minSalePriceInWei, 0);
      const offer = await market.phunksOfferedForSale(phunkId);

      expect(offer.isForSale).to.be.true;
      expect(offer.minValue).to.equal(minSalePriceInWei);
    });

    it('Should revert when user tries to offer phunk that is not escrowed', async () => {

      const phunkId = '0xb73019848d725d4502ed3b4f0d29f7481b54699409e5589dcda52d22829c8dee';
      const minSalePriceInWei = hre.ethers.formatUnits('1000000000000000000', 'wei');

      market.connect(owner);

      await expect(
        market.offerPhunkForSale(phunkId, minSalePriceInWei, 0)
      ).to.be.revertedWithCustomError(market, 'EthscriptionNotDeposited');
    });

    it('Should allow a user to offer a phunk for sale to another address', async () => {
      const marketAddress = await market.getAddress();

      const phunkId = '0xb73019848e725c4502ed3b4f0d29f7481b54699409e5589dcda52d22829c8dee';
      const minSalePriceInWei = hre.ethers.formatUnits('1000000000000000000', 'wei');

      await escrowPhunk(marketAddress, owner, phunkId);

      await market.offerPhunkForSaleToAddress(phunkId, minSalePriceInWei, otherAccount.address);
      const offer = await market.phunksOfferedForSale(phunkId);

      expect(offer.isForSale).to.be.true;
      expect(offer.minValue).to.equal(minSalePriceInWei);
      expect(offer.onlySellTo).to.equal(otherAccount.address);
    });

    it('Should revert when user offers phunk for sale to another address that is not escrowed.', async () => {

      const phunkId = '0xb23019848d725c4502ed3b4f0d29f7481b54699409e5589dcda52d22829c8dee';
      const minSalePriceInWei = hre.ethers.formatUnits('1000000000000000000', 'wei');

      market.connect(owner);

      await expect(
        market.offerPhunkForSaleToAddress(phunkId, minSalePriceInWei, otherAccount.address)
      ).to.be.revertedWithCustomError(market, 'EthscriptionNotDeposited');
    });
  });

  describe('hack', () => {

    it('Should revert when bad actor tries to withdraw phunk they do not own', async () => {
      const phunkId = '0xb23019848d725c4502ed3b4f0d29f7481b54699409e5589dcda52d22829c8dee';


    });

  });

  async function deployEtherPhunksMarketFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const { points } = await deployPointsFixture();

    const EtherPhunksMarket = await ethers.getContractFactory(contractName);

    // Deploy as upgradeable proxy
    const market = await upgrades.deployProxy(
      EtherPhunksMarket,
      [_version, await points.getAddress()],
      { initializer: 'initialize' }
    );

    // await market.initializeV2_1(3, ZeroAddress);
    // console.log('version', await market.contractVersion());

    await market.waitForDeployment();

    return { market, owner, otherAccount };
  }

  async function deployPointsFixture() {
    const [owner] = await ethers.getSigners();
    const Points = await ethers.getContractFactory('Points');

    // Deploy as upgradeable proxy
    const points = await Points.deploy();
    await points.waitForDeployment();

    _pointsAddress = await points.getAddress();

    return { points };
  }

  async function escrowPhunk(
    marketAddress: string,
    owner: HardhatEthersSigner,
    phunkId: string
  ) {
    await owner.sendTransaction({
        to: marketAddress,
        value: 0,
        data: phunkId,
    });
  }
});
