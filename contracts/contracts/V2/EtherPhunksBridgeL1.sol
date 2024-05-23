// SPDX-License-Identifier: PHUNKY

/**** EtherPhunksBridgeMainnet.sol *
* ░░░░░░░░░░░░░░░░░░░░░░░░░ *
* ░░░░░░░░░░░░░░░░░░░░░░░░░ *
* ░░░░░▓▓▓▓░░░░░░▓▓▓▓░░░░░░ *
* ░░░░░▒▒██░░░░░░▒▒██░░░░░░ *
* ░░░░░░░░░░░░░░░░░░░░░░░░░ *
* ░░░░░░░░░░░░░░░░░░░░░░░░░ *
* ░░░░░░░░░████░░░░░░░░░░░░ *
* ░░░░░░░░░░░░░░░░░░░░░░░░░ *
* ░░░░░░░░░░░░░░░██░░░░░░░░ *
* ░░░░░░░░░██████░░░░░░░░░░ *
* ░░░░░░░░░░░░░░░░░░░░░░░░░ *
* ░░░░░░░░░░░░░░░░░░░░░░░░░ *
****************************/

pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import "./EthscriptionsEscrower.sol";

contract EtherPhunksBridgeL1 is
    Pausable,
    Ownable,
    AccessControl,
    EthscriptionsEscrower
{
    bytes32 public constant BRIDGE_MANAGER_ROLE =
        keccak256("BRIDGE_MANAGER_ROLE");

    address public relaySigner;
    address payable public relayReceiver;

    error HashNotDeposited();
    error HashAlreadyDeposited();

    struct LockedHash {
        bytes32 hashId;
        address prevOwner;
    }

    mapping(address => mapping(bytes32 => LockedHash)) public lockedHashes;
    mapping(address => uint256) public expectedNonce;

    /// @notice HashLocked event
    /// @dev This event is emitted when the hash is locked
    /// @param prevOwner The address of the prevOwner
    /// @param hashId The hashId of the Ethscription
    /// @param nonce The nonce of the address
    /// @param value The value of ether for bridge conversion

    event HashLocked(
        address indexed prevOwner,
        bytes32 indexed hashId,
        uint256 nonce,
        uint256 value
    );

    /// @notice HashUnlocked event
    /// @dev This event is emitted when the hash is unlocked
    /// @param prevOwner The address of the prevOwner
    /// @param hashId The hashId of the Ethscription

    event HashUnlocked(
        address indexed prevOwner,
        address indexed owner,
        bytes32 indexed hashId
    );

    /// @notice Constructor
    /// @param _relaySigner The address of the relay signer
    /// @param _relayReceiver The address of the relay receiver (ether)

    constructor(
        address _relaySigner,
        address payable _relayReceiver
    ) Ownable(msg.sender) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(BRIDGE_MANAGER_ROLE, _relaySigner);

        relaySigner = _relaySigner;
        relayReceiver = _relayReceiver;
    }

    /// @notice Unlocks and transfers the ethscription to the previous owner
    /// @param hashId The hashId of the ethscription
    /// @param prevOwner The address of the previous owner of the ethscription

    function unlockHash(
        bytes32 hashId,
        address prevOwner,
        address owner
    ) external onlyRole(BRIDGE_MANAGER_ROLE) whenNotPaused {
        if (userEthscriptionDefinitelyNotStored(prevOwner, hashId)) {
            revert HashNotDeposited();
        }

        _transferEthscription(prevOwner, owner, hashId);

        delete lockedHashes[prevOwner][hashId];
        emit HashUnlocked(prevOwner, owner, hashId);
    }

    /// @notice Deposits (locks) ethscription to the contract
    /// @param prevOwner The address of the previous owner of the ethscription
    /// @param hashId The hashId of the ethscription

    function _onPotentialEthscriptionDeposit(
        address prevOwner,
        bytes32 hashId
    ) internal {
        if (userEthscriptionPossiblyStored(prevOwner, hashId)) {
            revert HashAlreadyDeposited();
        }

        EthscriptionsEscrowerStorage.s().ethscriptionReceivedOnBlockNumber[
            prevOwner
        ][hashId] = block.number;

        lockedHashes[prevOwner][hashId] = LockedHash(
            hashId,
            prevOwner
        );

        uint256 nonce = expectedNonce[prevOwner];
        expectedNonce[prevOwner] += 1;

        emit HashLocked(prevOwner, hashId, expectedNonce[prevOwner], msg.value);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    /// @notice Transfers the Ether to the relay receiver

    function transferEther() internal {
        (bool success, ) = relayReceiver.call{value: msg.value}("");
        require(success, "Failed to forward Ether to the relay signer.");
    }

    /// @notice Receive function

    receive() external payable {
        transferEther();
    }

    /// @notice Fallback function (deposits)
    /// @dev This function is used to receive the signature, hashId and nonce from the calldata
    /// @dev It deposits the Ethscription to the contract
    /// @dev The calldata should be 128 bytes long
    /// @dev The ether is transferred to the relay receiver to convert to (LAVA?)

    fallback() external payable whenNotPaused {
        // TODO: Apply more checks for validity
        require(msg.data.length == 128, "Invalid data length.");

        (bytes32 hashId, bytes32 r, bytes32 s, uint8 v) = extractSignature();
        uint256 nonce = expectedNonce[msg.sender];
        require(verifySignature(hashId, nonce, r, s, v), "Invalid signature.");

        _onPotentialEthscriptionDeposit(msg.sender, hashId);
        transferEther();
    }

    /// @notice Extracts the signature from the calldata
    /// @dev This function is used to extract the signature from the calldata
    /// @param hashId The hashId of the Ethscription
    /// @param r The r value of the signature
    /// @param s The s value of the signature
    /// @param v The v value of the signature

    function extractSignature()
        private
        pure
        returns (bytes32 hashId, bytes32 r, bytes32 s, uint8 v)
    {
        assembly {
            hashId := calldataload(0)
            r := calldataload(32)
            s := calldataload(64)
            v := calldataload(96)
        }

        uint8 vUint = uint8(uint256(v));
        return (hashId, r, s, vUint);
    }

    /// @notice Verifies the signature of the calldata
    /// @dev This function is used to verify the signature of the calldata
    /// @param hashId The hashId of the Ethscription
    /// @param nonce The nonce of the Ethscription
    /// @param r The r value of the signature
    /// @param s The s value of the signature
    /// @param v The v value of the signature
    /// @return A boolean value indicating the validity of the signature

    function verifySignature(
        bytes32 hashId,
        uint256 nonce,
        bytes32 r,
        bytes32 s,
        uint8 v
    ) private view returns (bool) {
        bytes32 prefixedHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked(hashId, nonce))
            )
        );
        address signer = ecrecover(prefixedHash, v, r, s);
        return (signer == relaySigner);
    }
}
