// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {LensToken} from "../src/LensToken.sol";

contract LensTokenTest is Test {
    LensToken public token;
    address public admin = address(0xA11);
    address public treasury = address(0xB22);

    function setUp() public {
        token = new LensToken(admin, treasury, 1_000_000 ether);
    }

    function test_MintToTreasury() public view {
        assertEq(token.balanceOf(treasury), 1_000_000 ether);
    }

    function test_Burn() public {
        vm.prank(treasury);
        token.transfer(address(this), 100 ether);
        token.burn(10 ether);
        assertEq(token.balanceOf(address(this)), 90 ether);
    }

    function test_MintByMinter() public {
        vm.prank(admin);
        token.mint(address(0xC33), 1 ether);
        assertEq(token.balanceOf(address(0xC33)), 1 ether);
    }
}
