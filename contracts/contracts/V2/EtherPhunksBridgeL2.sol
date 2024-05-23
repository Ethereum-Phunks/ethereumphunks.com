// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract EtherPhunksBridgeL2 is
    ERC721,
    ERC721Pausable,
    ERC721URIStorage,
    AccessControl,
    ReentrancyGuard
{
    bytes32 public constant BRIDGE_MANAGER_ROLE =
        keccak256("BRIDGE_MANAGER_ROLE");

    string private _contractURI;
    uint256 private _nextTokenId = 10251;

    address public relaySigner;
    address payable public relayReceiver;

    mapping(uint256 => bytes32) public tokenToHash;
    mapping(bytes32 => uint256) public hashToToken;

    event BridgedIn(
        address indexed sender,
        uint256 indexed tokenId,
        bytes32 indexed hashId
    );

    event BridgedOut(
        address indexed receiver,
        uint256 indexed tokenId,
        bytes32 indexed hashId
    );

    constructor(
        address _relaySigner,
        address payable _relayReceiver,
        string memory contractURI_
    ) ERC721("EtherPhunksTokenMagma", "EPHM") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(BRIDGE_MANAGER_ROLE, _relaySigner);

        relaySigner = _relaySigner;
        relayReceiver = _relayReceiver;
        setContractURI(contractURI_);
    }

    /**
     * @dev Mint a token and bridge it in
     * @param to The address to mint the token to
     * @param tokenId The token ID to mint
     * @param hashId The hash ID of the bridged token
     * @param metadataURI The metadata URI of the token
     */

    function mintToken(
        address to,
        uint256 tokenId,
        bytes32 hashId,
        string memory metadataURI
    ) public onlyRole(BRIDGE_MANAGER_ROLE) {

        bool nativeToken = tokenId >= 0 && tokenId <= 10250;
        uint256 newTokenId = nativeToken ? tokenId : _nextTokenId++;

        require(
            hashToToken[hashId] == 0,
            "Token already exists"
        );

        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, metadataURI);

        tokenToHash[newTokenId] = hashId;
        hashToToken[hashId] = newTokenId;

        emit BridgedIn(to, newTokenId, hashId);
    }

    /**
     * @dev Burn a token and bridge it out
     * @param tokenId The token ID to burn
     */

    function burnToken(uint256 tokenId) public {
        require(
            ownerOf(tokenId) == msg.sender &&
            tokenToHash[tokenId] != 0,
            "Invalid token"
        );
        _burn(tokenId);

        bytes32 hashId = tokenToHash[tokenId];
        delete tokenToHash[tokenId];
        delete hashToToken[hashId];

        emit BridgedOut(msg.sender, tokenId, hashId);
    }

    /**
     * @dev Update the relay signer address
     * @param _relaySigner The new relay signer address
     */

    function updateRelaySigner(address _relaySigner) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(BRIDGE_MANAGER_ROLE, relaySigner);
        _grantRole(BRIDGE_MANAGER_ROLE, _relaySigner);
        relaySigner = _relaySigner;
    }

    /**
     * @dev Update the relay receiver address
     * @param _relayReceiver The new relay receiver address
     */

    function updateRelayReceiver(
        address payable _relayReceiver
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        relayReceiver = _relayReceiver;
    }

    /**
     * @dev Get tokenURI by tokenId
     * @param tokenId The token ID to get the URI of
     */

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /**
     * @dev Get tokenURI by hashId
     * @param hashId The hash ID to get the URI of
     */

    function tokenURIByHashId(bytes32 hashId)
        public
        view
        returns (string memory)
    {
        return tokenURI(hashToToken[hashId]);
    }

    /**
     * @dev Set the contract URI
     * @param contractURI_ The contract URI to set
     */

    function setContractURI(string memory contractURI_) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _contractURI = contractURI_;
    }

    /**
     * @dev Get the contract URI
     */

    function contractURI() public view returns (string memory) {
        return _contractURI;
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Pausable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function pause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
