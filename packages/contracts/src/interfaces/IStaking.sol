// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @notice Minimal staking interface for CohortRegistry gate.
 */
interface IStaking {
    function balanceOfStaked(address account) external view returns (uint256);
}
