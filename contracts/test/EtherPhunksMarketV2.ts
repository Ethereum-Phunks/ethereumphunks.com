import { ethers, upgrades } from 'hardhat';
import hre from 'hardhat';

import { expect } from 'chai';
import { ZeroAddress, keccak256 } from 'ethers';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { EtherPhunksMarketV2, EtherPhunksMarketV2__factory, Points } from '../typechain-types';
import { stringToBytes } from 'viem';

const contractName = 'EtherPhunksMarketV2';
const _version = 2;

const DEPOSIT_AND_LIST_SIGNATURE = keccak256(stringToBytes("DEPOSIT_AND_LIST_SIGNATURE"));

describe('EtherPhunksMarketV2', function () {

  let market: EtherPhunksMarketV2;
  let pointsContract: Points;

  let owner: HardhatEthersSigner;
  let seller: HardhatEthersSigner;
  let buyer: HardhatEthersSigner;

  beforeEach(async () => {
    [owner, seller, buyer] = await ethers.getSigners();

    // Deploy Points contract
    const Points = await ethers.getContractFactory('Points');
    pointsContract = await Points.deploy() as Points;
    await pointsContract.waitForDeployment();

    // Deploy EtherPhunksMarketV2
    const MarketFactory = await ethers.getContractFactory(contractName) as EtherPhunksMarketV2__factory;
    const marketProxy = await upgrades.deployProxy(MarketFactory, [_version, await pointsContract.getAddress()], { initializer: 'initialize' });
    market = MarketFactory.attach(await marketProxy.getAddress()) as EtherPhunksMarketV2;
    await market.waitForDeployment();

    // Grant POINTS_MANAGER_ROLE to the market contract
    const POINTS_MANAGER_ROLE = await pointsContract.POINTS_MANAGER_ROLE();
    await pointsContract.grantRole(POINTS_MANAGER_ROLE, await market.getAddress());
  });

  describe('Initialization', () => {
    it("Should set the correct initial values", async () => {
      expect(await market.owner()).to.equal(owner.address);
      expect(await market.contractVersion()).to.equal(_version);
      expect(await market.pointsAddress()).to.equal(await pointsContract.getAddress());
    });
  });

  describe('Depositing and Offering Phunks', () => {

    const phunkId = keccak256(stringToBytes("Phunk1060"));
    const price = ethers.parseEther("1");

    it("Should deposit and list using fallback function", async () => {
      const data = phunkId + DEPOSIT_AND_LIST_SIGNATURE.slice(2) + price.toString(16).padStart(64, '0');

      await seller.sendTransaction({
        to: await market.getAddress(),
        data,
      });

      const offer = await market.phunksOfferedForSale(phunkId);
      expect(offer.isForSale).to.be.true;
      expect(offer.phunkId).to.equal(phunkId);
      expect(offer.seller).to.equal(seller.address);
      expect(offer.minValue).to.equal(price);
    });

    it("Should deposit and list privately using fallback function", async () => {
      const data = phunkId + DEPOSIT_AND_LIST_SIGNATURE.slice(2) + price.toString(16).padStart(64, '0') + buyer.address.slice(2).padStart(64, '0');

      await seller.sendTransaction({
        to: await market.getAddress(),
        data,
      });

      const offer = await market.phunksOfferedForSale(phunkId);
      expect(offer.isForSale).to.be.true;
      expect(offer.phunkId).to.equal(phunkId);
      expect(offer.seller).to.equal(seller.address);
      expect(offer.minValue).to.equal(price);
      expect(offer.onlySellTo).to.equal(buyer.address);
    });
  })

  describe('Offering Phunks', () => {

    const phunkId = keccak256(stringToBytes("Phunk1060"));
    const price = ethers.parseEther("1");

    beforeEach(async () => {
      // Simulate depositing a Phunk
      await seller.sendTransaction({
        to: await market.getAddress(),
        data: phunkId,
      });
    });

    it("Should allow offering a Phunk for sale", async () => {
      await expect(market.connect(seller).offerPhunkForSale(phunkId, price))
        .to.emit(market, "PhunkOffered")
        .withArgs(phunkId, price, ZeroAddress);

      const offer = await market.phunksOfferedForSale(phunkId);
      expect(offer.isForSale).to.be.true;
      expect(offer.phunkId).to.equal(phunkId);
      expect(offer.seller).to.equal(seller.address);
      expect(offer.minValue).to.equal(price);
    });

    it("Should allow offering a Phunk to a specific address", async () => {
      await expect(market.connect(seller).offerPhunkForSaleToAddress(phunkId, price, buyer.address))
        .to.emit(market, "PhunkOffered")
        .withArgs(phunkId, price, buyer.address);

      const offer = await market.phunksOfferedForSale(phunkId);
      expect(offer.isForSale).to.be.true;
      expect(offer.onlySellTo).to.equal(buyer.address);
    });
  });

  describe('Buying Phunks', () => {
    const phunkId = keccak256(stringToBytes("Phunk1060"));
    const nonListedPhunkId = keccak256(stringToBytes("Phunk1061"));

    const price = ethers.parseEther("1");

    beforeEach(async () => {
      await seller.sendTransaction({
        to: await market.getAddress(),
        data: phunkId,
      });

      await seller.sendTransaction({
        to: await market.getAddress(),
        data: nonListedPhunkId,
      });

      await market.connect(seller).offerPhunkForSale(phunkId, price);
      // Mine 5 blocks to pass the cooldown period
      await mineBlocks(5);
    });

    it("Should allow buying a Phunk", async () => {
      await expect(market.connect(buyer).batchBuyPhunk([phunkId], [price], { value: price }))
        .to.emit(market, "PhunkBought")
        .withArgs(phunkId, price, seller.address, buyer.address);

      const offer = await market.phunksOfferedForSale(phunkId);
      expect(offer.isForSale).to.be.false;
    });

    it("Should NOT allow buying a Phunk with insufficient funds", async () => {
      await expect(market.connect(buyer).batchBuyPhunk([phunkId], [price], { value: 0 }))
        .to.be.revertedWith("Invalid sale conditions");
    });

    it("Should NOT allow buying a Phunk that is not for sale", async () => {
      await expect(market.connect(buyer).batchBuyPhunk([nonListedPhunkId], [price], { value: price }))
        .to.be.revertedWith("Invalid sale conditions");
    });

    it("Should NOT allow buying a Phunk with a different price", async () => {
      await expect(market.connect(buyer).batchBuyPhunk([phunkId], [price + 1n], { value: price + 1n }))
        .to.be.revertedWith("Invalid sale conditions");
    });
  });

  describe('Buy Private Listing', () => {
    it("Should only allow the specified buyer to purchase a Phunk offered to a specific address", async () => {
      const phunkId = keccak256(stringToBytes("SpecificBuyerPhunk"));
      const price = ethers.parseEther("1");

      await seller.sendTransaction({
        to: await market.getAddress(),
        data: phunkId,
      });
      await market.connect(seller).offerPhunkForSaleToAddress(phunkId, price, buyer.address);
      await mineBlocks(5);

      // Attempt to buy with a different address
      await expect(market.connect(owner).batchBuyPhunk([phunkId], [price], { value: price }))
        .to.be.revertedWith("Invalid sale conditions");

      // Buy with the correct address
      await expect(market.connect(buyer).batchBuyPhunk([phunkId], [price], { value: price }))
        .to.emit(market, "PhunkBought")
        .withArgs(phunkId, price, seller.address, buyer.address);
    });
  })

  describe('Batch Operations', () => {
    const phunkIds = [
      keccak256(stringToBytes("Phunk1")),
      keccak256(stringToBytes("Phunk2")),
      keccak256(stringToBytes("Phunk3"))
    ];
    const prices = [
      ethers.parseEther("1"),
      ethers.parseEther("2"),
      ethers.parseEther("3")
    ];

    beforeEach(async () => {
      for (const phunkId of phunkIds) {
        await seller.sendTransaction({
          to: await market.getAddress(),
          data: phunkId,
        });
      }
      await mineBlocks(5);
    });

    it("Should allow batch offering of Phunks for sale", async () => {
      await expect(market.connect(seller).batchOfferPhunkForSale(phunkIds, prices))
        .to.emit(market, "PhunkOffered")
        .withArgs(phunkIds[0], prices[0], ZeroAddress)
        .to.emit(market, "PhunkOffered")
        .withArgs(phunkIds[1], prices[1], ZeroAddress)
        .to.emit(market, "PhunkOffered")
        .withArgs(phunkIds[2], prices[2], ZeroAddress);

      for (let i = 0; i < phunkIds.length; i++) {
        const offer = await market.phunksOfferedForSale(phunkIds[i]);
        expect(offer.isForSale).to.be.true;
        expect(offer.phunkId).to.equal(phunkIds[i]);
        expect(offer.seller).to.equal(seller.address);
        expect(offer.minValue).to.equal(prices[i]);
      }
    });

    it("Should allow batch buying of Phunks", async () => {
      await market.connect(seller).batchOfferPhunkForSale(phunkIds, prices);
      const totalPrice = prices.reduce((a, b) => a + b);

      await expect(market.connect(buyer).batchBuyPhunk(phunkIds, prices, { value: totalPrice }))
        .to.emit(market, "PhunkBought")
        .withArgs(phunkIds[0], prices[0], seller.address, buyer.address)
        .to.emit(market, "PhunkBought")
        .withArgs(phunkIds[1], prices[1], seller.address, buyer.address)
        .to.emit(market, "PhunkBought")
        .withArgs(phunkIds[2], prices[2], seller.address, buyer.address)
        .to.emit(market, "ethscriptions_protocol_TransferEthscriptionForPreviousOwner")
        .withArgs(seller.address, buyer.address, phunkIds[0])
        .to.emit(market, "ethscriptions_protocol_TransferEthscriptionForPreviousOwner")
        .withArgs(seller.address, buyer.address, phunkIds[1])
        .to.emit(market, "ethscriptions_protocol_TransferEthscriptionForPreviousOwner")
        .withArgs(seller.address, buyer.address, phunkIds[2])
        .to.emit(pointsContract, "PointsAdded")
        .withArgs(seller.address, 100)
        .to.emit(pointsContract, "PointsAdded")
        .withArgs(seller.address, 100)
        .to.emit(pointsContract, "PointsAdded")
        .withArgs(seller.address, 100);

      for (const phunkId of phunkIds) {
        const offer = await market.phunksOfferedForSale(phunkId);
        expect(offer.isForSale).to.be.false;
      }
    });

    it("Should allow batch withdrawing of Phunks", async () => {
      const tx = await market.connect(seller).withdrawBatchPhunks(phunkIds);
      const receipt = await tx.wait();
      if (!receipt) throw new Error("No receipt");

      const marketInterface = market.interface;

      for (const phunkId of phunkIds) {
        const eventLog = receipt.logs.find(log => {
          try {
            const parsedLog = marketInterface.parseLog(log);
            return parsedLog?.name === "ethscriptions_protocol_TransferEthscriptionForPreviousOwner" &&
                   parsedLog?.args.id === phunkId;
          } catch {
            return false;
          }
        });

        expect(eventLog).to.not.be.undefined;

        if (eventLog) {
          const parsedLog = marketInterface.parseLog(eventLog);
          expect(parsedLog?.name).to.equal("ethscriptions_protocol_TransferEthscriptionForPreviousOwner");
          expect(parsedLog?.args.previousOwner).to.equal(seller.address);
          expect(parsedLog?.args.recipient).to.equal(seller.address);
          expect(parsedLog?.args.id).to.equal(phunkId);
        }

        // Verify that the Phunk is no longer in the contract
        expect(await market.userEthscriptionPossiblyStored(seller.address, phunkId)).to.be.false;

        // Check that any existing offer is no longer active
        const offer = await market.phunksOfferedForSale(phunkId);
        expect(offer.isForSale).to.be.false;
      }
    });
  });

  describe('Withdrawals', () => {
    const phunkId = keccak256(stringToBytes("testPhunk"));
    const price = ethers.parseEther("1");

    beforeEach(async () => {
      await seller.sendTransaction({
        to: await market.getAddress(),
        data: phunkId,
      });
      await market.connect(seller).offerPhunkForSale(phunkId, price);
      // Mine 5 blocks to pass the cooldown period
      await mineBlocks(5);
    });

    it("Should allow withdrawing pending funds", async () => {
      await market.connect(buyer).batchBuyPhunk([phunkId], [price], { value: price });

      const initialBalance = await ethers.provider.getBalance(seller.address);
      await market.connect(seller).withdraw();
      const finalBalance = await ethers.provider.getBalance(seller.address);

      expect(finalBalance - initialBalance).to.be.closeTo(price, ethers.parseEther("0.01"));
    });

    it("Should fail if no pending withdrawals", async () => {
      await expect(market.connect(seller).withdraw())
        .to.be.revertedWith("No pending withdrawals");
    });
  });

  describe('Withdraw Phunk', () => {
    const phunkId = keccak256(stringToBytes("testPhunk"));
    const price = ethers.parseEther("1");

    beforeEach(async () => {
      await seller.sendTransaction({
        to: await market.getAddress(),
        data: phunkId,
      });
      await market.connect(seller).offerPhunkForSale(phunkId, price);
      // Mine 5 blocks to pass the cooldown period
      await mineBlocks(5);
    });

    it("Should allow withdrawing a Phunk", async () => {
      const tx = await market.connect(seller).withdrawPhunk(phunkId);
      const receipt = await tx.wait();
      if (!receipt) throw new Error("No receipt");

      // Get the contract interface
      const marketInterface = market.interface;

      // Find the relevant log
      const eventLog = receipt.logs.find(log => {
        try {
          const parsedLog = marketInterface.parseLog(log);
          return parsedLog?.name === "ethscriptions_protocol_TransferEthscriptionForPreviousOwner";
        } catch {
          return false;
        }
      });

      // Assert that we found the correct event
      expect(eventLog).to.not.be.undefined;

      if (eventLog) {
        const parsedLog = marketInterface.parseLog(eventLog);
        expect(parsedLog?.name).to.equal("ethscriptions_protocol_TransferEthscriptionForPreviousOwner");
        expect(parsedLog?.args.previousOwner).to.equal(seller.address);
        expect(parsedLog?.args.recipient).to.equal(seller.address);
        expect(parsedLog?.args.id).to.equal(phunkId);
      }

      // Check that the offer is no longer active
      const offer = await market.phunksOfferedForSale(phunkId);
      expect(offer.isForSale).to.be.false;

      // Verify that the Phunk is no longer in the contract
      expect(await market.userEthscriptionPossiblyStored(seller.address, phunkId)).to.be.false;
    });
  });

  describe('Points Integration', () => {
    const phunkId = keccak256(stringToBytes("PointsTestPhunk"));
    const price = ethers.parseEther("1");

    beforeEach(async () => {
      await seller.sendTransaction({
        to: await market.getAddress(),
        data: phunkId,
      });
      await market.connect(seller).offerPhunkForSale(phunkId, price);
      await mineBlocks(5);
    });

    it("Should add points to the seller when a Phunk is bought", async () => {
      const initialPoints = await pointsContract.points(seller.address);
      await market.connect(buyer).batchBuyPhunk([phunkId], [price], { value: price });
      const finalPoints = await pointsContract.points(seller.address);

      // Assuming 100 points are added for each sale
      expect(finalPoints - initialPoints).to.equal(100);
    });
  });

  describe('Paused State Behavior', () => {
    const phunkId = keccak256(stringToBytes("PausedTestPhunk"));
    const price = ethers.parseEther("1");

    beforeEach(async () => {
      await seller.sendTransaction({
        to: await market.getAddress(),
        data: phunkId,
      });
      await market.connect(seller).offerPhunkForSale(phunkId, price);
      await mineBlocks(5);
      await market.connect(owner).pause();
    });

    it("Should NOT allow buying when paused", async () => {
      await expect(market.connect(buyer).batchBuyPhunk([phunkId], [price], { value: price }))
        .to.be.revertedWithCustomError(market, "EnforcedPause");
    });

    it("Should allow withdrawing funds when paused", async () => {
      // First, unpause to allow a purchase
      await market.connect(owner).unpause();
      await market.connect(buyer).batchBuyPhunk([phunkId], [price], { value: price });
      await market.connect(owner).pause();

      // Now try to withdraw while paused
      await expect(market.connect(seller).withdraw()).to.not.be.reverted;
    });
  });

  describe('Admin functions', () => {
    it("Should allow the owner to pause and unpause the contract", async () => {
      await market.connect(owner).pause();
      expect(await market.paused()).to.be.true;

      await market.connect(owner).unpause();
      expect(await market.paused()).to.be.false;
    });

    it("Should NOT allow non-owners to pause and unpause the contract", async () => {
      await expect(market.connect(seller).pause())
        .to.be.revertedWithCustomError(market, "OwnableUnauthorizedAccount");

      await expect(market.connect(seller).unpause())
        .to.be.revertedWithCustomError(market, "OwnableUnauthorizedAccount");
    });

    it("Should allow the owner to set a new points address", async () => {
      const newPointsAddress = ethers.Wallet.createRandom().address;
      await expect(market.connect(owner).setPointsAddress(newPointsAddress))
        .to.emit(market, "PointsAddressChanged")
        .withArgs(await pointsContract.getAddress(), newPointsAddress);

      expect(await market.pointsAddress()).to.equal(newPointsAddress);
    });

    it("Should NOT allow non-owners to set a new points address", async () => {
      const newPointsAddress = ethers.Wallet.createRandom().address;
      await expect(market.connect(seller).setPointsAddress(newPointsAddress))
        .to.be.revertedWithCustomError(market, "OwnableUnauthorizedAccount");
    });
  });

  describe('Edge Cases and Error Handling', () => {
    const phunkId = keccak256(stringToBytes("TestPhunk"));
    const price = ethers.parseEther("1");

    beforeEach(async () => {
      await seller.sendTransaction({
        to: await market.getAddress(),
        data: phunkId,
      });
      await mineBlocks(5);
    });

    it("Should NOT allow offering a Phunk that the user doesn't own", async () => {
      await expect(market.connect(buyer).offerPhunkForSale(phunkId, price))
        .to.be.revertedWithCustomError(market, "EthscriptionNotDeposited");
    });

    it("Should NOT allow buying a Phunk that's not for sale", async () => {
      await expect(market.connect(buyer).batchBuyPhunk([phunkId], [price], { value: price }))
        .to.be.revertedWith("Invalid sale conditions");
    });

    it("Should NOT allow withdrawing a Phunk that the user doesn't own", async () => {
      await expect(market.connect(buyer).withdrawPhunk(phunkId))
        .to.be.revertedWithCustomError(market, "EthscriptionNotDeposited");
    });

    it("Should allow cancelling a sale", async () => {
      await market.connect(seller).offerPhunkForSale(phunkId, price);
      await expect(market.connect(seller).phunkNoLongerForSale(phunkId))
        .to.emit(market, "PhunkNoLongerForSale")
        .withArgs(phunkId);

      const offer = await market.phunksOfferedForSale(phunkId);
      expect(offer.isForSale).to.be.false;
    });
  });

  describe('Additional Edge Cases and Scenarios', () => {
    it("Should accept Ether when not paused", async () => {
      await expect(owner.sendTransaction({
        to: await market.getAddress(),
        value: ethers.parseEther("1")
      })).to.not.be.reverted;
    });

    it("Should not accept Ether when paused", async () => {
      await market.connect(owner).pause();
      await expect(owner.sendTransaction({
        to: await market.getAddress(),
        value: ethers.parseEther("1")
      })).to.be.revertedWith("Contract is paused");
    });

    it("Should not allow fallback function when paused", async () => {
      await market.connect(owner).pause();
      const phunkId = keccak256(stringToBytes("TestPhunk"));
      const price = ethers.parseEther("1");
      const data = phunkId + DEPOSIT_AND_LIST_SIGNATURE.slice(2) + price.toString(16).padStart(64, '0');

      await expect(seller.sendTransaction({
        to: await market.getAddress(),
        data,
      })).to.be.revertedWith("Contract is paused");
    });

    it("Should remove listing when withdrawing a listed Phunk", async () => {
      const phunkId = keccak256(stringToBytes("ListedPhunk"));
      const price = ethers.parseEther("1");

      await seller.sendTransaction({
        to: await market.getAddress(),
        data: phunkId,
      });
      await market.connect(seller).offerPhunkForSale(phunkId, price);

      await mineBlocks(5);

      await expect(market.connect(seller).withdrawPhunk(phunkId))
        .to.emit(market, "PhunkNoLongerForSale")
        .withArgs(phunkId);

      const offer = await market.phunksOfferedForSale(phunkId);
      expect(offer.isForSale).to.be.false;
    });

    it("Should increase contract balance after purchases", async () => {
      const phunkId = keccak256(stringToBytes("BalanceTestPhunk"));
      const price = ethers.parseEther("1");

      await seller.sendTransaction({
        to: await market.getAddress(),
        data: phunkId,
      });
      await market.connect(seller).offerPhunkForSale(phunkId, price);
      await mineBlocks(5);

      const initialBalance = await ethers.provider.getBalance(await market.getAddress());
      await market.connect(buyer).batchBuyPhunk([phunkId], [price], { value: price });
      const finalBalance = await ethers.provider.getBalance(await market.getAddress());

      expect(finalBalance - initialBalance).to.equal(price);
    });

    it("Should not allow withdrawing more than pending amount", async () => {
      const phunkId = keccak256(stringToBytes("WithdrawTestPhunk"));
      const price = ethers.parseEther("1");

      await seller.sendTransaction({
        to: await market.getAddress(),
        data: phunkId,
      });
      await market.connect(seller).offerPhunkForSale(phunkId, price);
      await mineBlocks(5);
      await market.connect(buyer).batchBuyPhunk([phunkId], [price], { value: price });

      await market.connect(seller).withdraw();

      // Try to withdraw again
      await expect(market.connect(seller).withdraw())
        .to.be.revertedWith("No pending withdrawals");
    });
  });

  describe('Patch Withdrawals', () => {
    const addresses = [
      '0x1000000000000000000000000000000000000000',
      '0x2000000000000000000000000000000000000000',
      '0x3000000000000000000000000000000000000000'
    ];
    const amounts = [
      ethers.parseEther('1'),
      ethers.parseEther('2'),
      ethers.parseEther('3')
    ];

    it("Should allow the owner to patch withdrawals", async () => {
      await expect(market.connect(owner).patchWithdrawals(addresses, amounts))
        .to.not.be.reverted;

      for (let i = 0; i < addresses.length; i++) {
        const pendingWithdrawal = await market.pendingWithdrawals(addresses[i]);
        expect(pendingWithdrawal).to.equal(amounts[i]);
      }
    });

    it("Should not allow non-owners to patch withdrawals", async () => {
      await expect(market.connect(buyer).patchWithdrawals(addresses, amounts))
        .to.be.revertedWithCustomError(market, "OwnableUnauthorizedAccount");
    });

    it("Should not allow patching withdrawals more than once", async () => {
      await market.connect(owner).patchWithdrawals(addresses, amounts);

      await expect(market.connect(owner).patchWithdrawals(addresses, amounts))
        .to.be.revertedWith("Contract has already been seeded");
    });

    it("Should revert if addresses and amounts arrays have different lengths", async () => {
      const invalidAmounts = [ethers.parseEther('1'), ethers.parseEther('2')];

      await expect(market.connect(owner).patchWithdrawals(addresses, invalidAmounts))
        .to.be.revertedWith("Arrays length mismatch");
    });

    it("Should allow withdrawing patched amounts", async () => {
      await owner.sendTransaction({
        to: await market.getAddress(),
        value: ethers.parseEther("10"), // Send 10 ETH to the contract
      });

      await market.connect(owner).patchWithdrawals(addresses, amounts);

      const withdrawalAddress = addresses[0];
      const withdrawalAmount = amounts[0];

      // Fund the impersonated account
      await owner.sendTransaction({
        to: withdrawalAddress,
        value: ethers.parseEther("1"), // Send 1 ETH for gas
      });

      const initialBalance = await ethers.provider.getBalance(withdrawalAddress);

      // Impersonate the address to withdraw from
      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [withdrawalAddress],
      });

      const signer = await ethers.getSigner(withdrawalAddress);

      await market.connect(signer).withdraw();

      const finalBalance = await ethers.provider.getBalance(withdrawalAddress);

      // Stop impersonating the address
      await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [withdrawalAddress],
      });

      // Check that the balance has increased by approximately the withdrawal amount
      // We use closeTo because some ETH will be spent on gas
      expect(finalBalance - initialBalance).to.be.closeTo(withdrawalAmount, ethers.parseEther('0.01'));
    });

    it("Should update existing pending withdrawals", async () => {
      // First, create a pending withdrawal through a sale
      const phunkId = keccak256(stringToBytes("TestPhunk"));
      const price = ethers.parseEther("1");

      await seller.sendTransaction({
        to: await market.getAddress(),
        data: phunkId,
      });
      await market.connect(seller).offerPhunkForSale(phunkId, price);
      await mineBlocks(5);
      await market.connect(buyer).batchBuyPhunk([phunkId], [price], { value: price });

      const initialPendingWithdrawal = await market.pendingWithdrawals(seller.address);

      // Now patch the withdrawals
      const newAmount = ethers.parseEther("2");
      await market.connect(owner).patchWithdrawals([seller.address], [newAmount]);

      const finalPendingWithdrawal = await market.pendingWithdrawals(seller.address);

      expect(finalPendingWithdrawal).to.equal(newAmount);
      expect(finalPendingWithdrawal).to.not.equal(initialPendingWithdrawal);
    });
  });

  async function mineBlocks(numBlocks: number) {
    for (let i = 0; i < numBlocks; i++) {
      await hre.network.provider.send("evm_mine");
    }
  }
});
