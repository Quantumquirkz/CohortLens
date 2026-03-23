// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {LensToken} from "../src/LensToken.sol";
import {Staking} from "../src/Staking.sol";

contract StakingTest is Test {
    LensToken public token;
    Staking public staking;
    address public admin = address(0xA11);
    address public treasury = address(0xB22);
    address public alice = address(0xA1);

    function setUp() public {
        token = new LensToken(admin, treasury, 10_000 ether);
        staking = new Staking(token, treasury, admin);
        vm.startPrank(admin);
        staking.grantRole(staking.REWARD_NOTIFIER_ROLE(), address(this));
        vm.stopPrank();

        vm.prank(treasury);
        token.transfer(alice, 1000 ether);
        vm.prank(alice);
        token.approve(address(staking), type(uint256).max);
    }

    function test_StakeWithdraw() public {
        vm.prank(alice);
        staking.stake(100 ether);
        assertEq(staking.balanceOfStaked(alice), 100 ether);

        vm.prank(alice);
        staking.withdraw(40 ether);
        assertEq(staking.balanceOfStaked(alice), 60 ether);
    }

    function test_NotifyRewards() public {
        vm.prank(alice);
        staking.stake(100 ether);

        vm.prank(treasury);
        token.transfer(address(this), 50 ether);
        token.approve(address(staking), type(uint256).max);
        token.transfer(address(staking), 10 ether);
        staking.notifyRewardAmount(10 ether);

        vm.prank(alice);
        staking.getReward();
        assertGt(token.balanceOf(alice), 1000 ether - 100 ether);
    }

    function test_Slash() public {
        vm.prank(alice);
        staking.stake(100 ether);

        vm.prank(admin);
        staking.slash(alice, 30 ether, keccak256("bad"));
        assertEq(staking.balanceOfStaked(alice), 70 ether);
        assertEq(token.balanceOf(treasury), 9030 ether);
    }
}
