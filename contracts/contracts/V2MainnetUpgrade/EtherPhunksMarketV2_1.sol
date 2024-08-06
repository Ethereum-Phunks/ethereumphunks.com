// SPDX-License-Identifier: PHUNKY

pragma solidity 0.8.20;

import "./EtherPhunksMarketV2.sol";

contract EtherPhunksMarketV2_1 is EtherPhunksMarketV2 {

    /**
     * @dev Withdrawals state patch flag.
     */
    bool public _withdrawsPatched;

    event WithdrawalsPatched(uint256 count);

    /**
     * @dev Initializes the new version of the contract.
     * @param _newVersion The new version number.
     */
    function initializeV2_1(uint256 _newVersion) public reinitializer(3) {
        contractVersion = _newVersion;
        _withdrawsPatched = false;
    }

    /**
     * @dev Patch withdrawals state.
     * @param addresses The array of addresses for which withdrawals need to be patched.
     * @param amounts The array of withdrawal amounts corresponding to the addresses.
     * @notice This function can only be called by the contract owner.
     * @notice This function can only be called once.
     */
    function patchWithdrawals(address[] calldata addresses, uint256[] calldata amounts) external onlyOwner {
        require(!_withdrawsPatched, "Contract has already been seeded");
        require(addresses.length == amounts.length, "Arrays length mismatch");

        for (uint256 i = 0; i < addresses.length; i++) {
            pendingWithdrawals[addresses[i]] = amounts[i];
        }

        _withdrawsPatched = true;
        emit WithdrawalsPatched(addresses.length);
    }
}
