// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IStaking} from "../../src/interfaces/IStaking.sol";

contract MockStaking is IStaking {
    mapping(address => uint256) public stakedBalance;

    function setStaked(address account, uint256 amount) external {
        stakedBalance[account] = amount;
    }

    function balanceOfStaked(address account) external view returns (uint256) {
        return stakedBalance[account];
    }
}
