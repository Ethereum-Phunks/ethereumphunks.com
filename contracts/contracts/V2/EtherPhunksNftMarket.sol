// SPDX-License-Identifier: MIT License
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Context.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

contract EtherPhunksNftMarket is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{

    IERC721 etherPhunksBridgeL2;

    struct Offer {
        bool isForSale;
        uint phunkIndex;
        address seller;
        uint minValue;
        address onlySellTo;
    }

    struct Bid {
        bool hasBid;
        uint phunkIndex;
        address bidder;
        uint value;
    }

    // A record of phunks that are offered for sale at a specific minimum value, and perhaps to a specific person
    mapping (uint => Offer) public phunksOfferedForSale;

    // A record of the highest phunk bid
    mapping (uint => Bid) public phunkBids;

    // A record of pending ETH withdrawls by address
    mapping (address => uint) public pendingWithdrawals;

    event PhunkOffered(uint indexed phunkIndex, uint minValue, address indexed toAddress);
    event PhunkBidEntered(uint indexed phunkIndex, uint value, address indexed fromAddress);
    event PhunkBidWithdrawn(uint indexed phunkIndex, uint value, address indexed fromAddress);
    event PhunkBought(uint indexed phunkIndex, uint value, address indexed fromAddress, address indexed toAddress);
    event PhunkNoLongerForSale(uint indexed phunkIndex);

    function initialize(
        address _initialBridgeAddress
    ) public initializer {
        __Ownable_init(msg.sender);
        __Pausable_init();
        __ReentrancyGuard_init();

        IERC721(_initialBridgeAddress).balanceOf(address(this));
        etherPhunksBridgeL2 = IERC721(_initialBridgeAddress);
    }

    function tokenAddress() public view returns (address) {
        return address(etherPhunksBridgeL2);
    }

    function setContract(address newAddress) public onlyOwner {
        etherPhunksBridgeL2 = IERC721(newAddress);
    }

    function phunkNoLongerForSale(uint phunkIndex) public nonReentrant() {
        if (etherPhunksBridgeL2.ownerOf(phunkIndex) != msg.sender)
            revert('you are not the owner of this token');

        delete phunksOfferedForSale[phunkIndex];
        emit PhunkNoLongerForSale(phunkIndex);
    }

    function offerPhunkForSale(
        uint phunkIndex,
        uint minSalePriceInWei
    ) public whenNotPaused nonReentrant()  {
        if (etherPhunksBridgeL2.ownerOf(phunkIndex) != msg.sender)
            revert('you are not the owner of this token');

        phunksOfferedForSale[phunkIndex] = Offer(true, phunkIndex, msg.sender, minSalePriceInWei, address(0x0));
        emit PhunkOffered(phunkIndex, minSalePriceInWei, address(0x0));
    }

    function offerPhunkForSaleToAddress(
        uint phunkIndex,
        uint minSalePriceInWei,
        address toAddress
    ) public whenNotPaused nonReentrant() {
        if (etherPhunksBridgeL2.ownerOf(phunkIndex) != msg.sender)
            revert('you are not the owner of this token');

        phunksOfferedForSale[phunkIndex] = Offer(true, phunkIndex, msg.sender, minSalePriceInWei, toAddress);
        emit PhunkOffered(phunkIndex, minSalePriceInWei, toAddress);
    }

    function buyPhunk(uint phunkIndex) payable public whenNotPaused nonReentrant() {
        Offer memory offer = phunksOfferedForSale[phunkIndex];

        if (!offer.isForSale)
            revert('phunk is not for sale');

        if (offer.onlySellTo != address(0x0) && offer.onlySellTo != msg.sender) revert();
        if (msg.value != offer.minValue) revert('not enough ether');

        address seller = offer.seller;

        if (seller == msg.sender)
            revert('seller == msg.sender');

        if (seller != etherPhunksBridgeL2.ownerOf(phunkIndex))
            revert('seller no longer owner of phunk');

        delete phunksOfferedForSale[phunkIndex];
        etherPhunksBridgeL2.safeTransferFrom(seller, msg.sender, phunkIndex);
        pendingWithdrawals[seller] += msg.value;

        emit PhunkBought(phunkIndex, msg.value, seller, msg.sender);

        // Check for the case where there is a bid from the new owner and refund it.
        // Any other bid can stay in place.
        Bid memory bid = phunkBids[phunkIndex];
        if (bid.bidder == msg.sender) {
            // Kill bid and refund value
            pendingWithdrawals[msg.sender] += bid.value;
            delete phunkBids[phunkIndex];
        }
    }

    function withdraw() public nonReentrant() {
        uint amount = pendingWithdrawals[msg.sender];
        // Remember to zero the pending refund before
        // sending to prevent re-entrancy attacks
        pendingWithdrawals[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    function enterBidForPhunk(uint phunkIndex) payable public whenNotPaused nonReentrant() {
        if (etherPhunksBridgeL2.ownerOf(phunkIndex) == msg.sender)
            revert('you already own this phunk');

        if (msg.value == 0)
            revert('cannot enter bid of zero');

        Bid memory existing = phunkBids[phunkIndex];
        if (msg.value <= existing.value)
            revert('your bid is too low');

        if (existing.value > 0) {
            // Refund the failing bid
            pendingWithdrawals[existing.bidder] += existing.value;
        }
        phunkBids[phunkIndex] = Bid(true, phunkIndex, msg.sender, msg.value);
        emit PhunkBidEntered(phunkIndex, msg.value, msg.sender);
    }

    function acceptBidForPhunk(uint phunkIndex, uint minPrice) public whenNotPaused nonReentrant() {
        if (etherPhunksBridgeL2.ownerOf(phunkIndex) != msg.sender)
            revert('you do not own this token');

        address seller = msg.sender;
        Bid memory bid = phunkBids[phunkIndex];

        if (bid.value == 0) revert('cannot enter bid of zero');
        if (bid.value < minPrice) revert('your bid is too low');

        address bidder = bid.bidder;
        if (seller == bidder) revert('you already own this token');

        delete phunksOfferedForSale[phunkIndex];

        uint amount = bid.value;
        delete phunkBids[phunkIndex];

        etherPhunksBridgeL2.safeTransferFrom(msg.sender, bidder, phunkIndex);
        pendingWithdrawals[seller] += amount;
        emit PhunkBought(phunkIndex, bid.value, seller, bidder);
    }

    /* Allows bidders to withdraw their bids */
    function withdrawBidForPhunk(uint phunkIndex) public nonReentrant() {
        Bid memory bid = phunkBids[phunkIndex];
        if (bid.bidder != msg.sender) revert('the bidder is not message sender');
        emit PhunkBidWithdrawn(phunkIndex, bid.value, msg.sender);
        uint amount = bid.value;
        delete phunkBids[phunkIndex];
        payable(msg.sender).transfer(amount);
    }

    /**
     * @dev Pauses all contract functions. Only the contract owner can call this function.
     */
    function pause() public onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses all contract functions. Only the contract owner can call this function.
     */
    function unpause() public onlyOwner {
        _unpause();
    }

}
