// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {CohortRegistry} from "../src/CohortRegistry.sol";

contract CohortRegistryTest is Test {
    CohortRegistry public registry;

    address public owner;
    address public alice;
    address public bob;

    function setUp() public {
        owner = address(this);
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        registry = new CohortRegistry();
    }

    function test_RegisterLens() public {
        vm.prank(alice);
        uint256 id = registry.registerLens(
            "Test Lens",
            "A test lens",
            "QmHash123",
            1 ether
        );

        assertEq(id, 1);
        assertEq(registry.lensCount(), 1);

        CohortRegistry.Lens memory lens = registry.getLens(1);
        assertEq(lens.id, 1);
        assertEq(lens.owner, alice);
        assertEq(lens.name, "Test Lens");
        assertEq(lens.description, "A test lens");
        assertEq(lens.modelHash, "QmHash123");
        assertEq(lens.pricePerQuery, 1 ether);
        assertTrue(lens.active);
        assertGt(lens.createdAt, 0);

        uint256[] memory ids = registry.getLensesByOwner(alice);
        assertEq(ids.length, 1);
        assertEq(ids[0], 1);
    }

    function test_RegisterLens_EmitsEvent() public {
        vm.prank(alice);
        vm.recordLogs();
        registry.registerLens("My Lens", "Desc", "hash", 0);
        Vm.Log[] memory entries = vm.getRecordedLogs();
        assertEq(entries.length, 1);
        assertEq(entries[0].topics[0], keccak256("LensRegistered(uint256,address,string)"));
    }

    function test_UpdateLens() public {
        vm.prank(alice);
        registry.registerLens("Original", "Original desc", "hash", 1 ether);

        vm.prank(alice);
        registry.updateLens(1, "Updated Name", "Updated description", 2 ether);

        CohortRegistry.Lens memory lens = registry.getLens(1);
        assertEq(lens.name, "Updated Name");
        assertEq(lens.description, "Updated description");
        assertEq(lens.pricePerQuery, 2 ether);
    }

    function test_SetLensActive() public {
        vm.prank(alice);
        registry.registerLens("Lens", "Desc", "hash", 0);

        vm.prank(alice);
        registry.setLensActive(1, false);

        CohortRegistry.Lens memory lens = registry.getLens(1);
        assertFalse(lens.active);

        vm.prank(alice);
        registry.setLensActive(1, true);
        lens = registry.getLens(1);
        assertTrue(lens.active);
    }

    function test_UpdateLens_RevertsWhenNotOwner() public {
        vm.prank(alice);
        registry.registerLens("Alice Lens", "Desc", "hash", 0);

        vm.prank(bob);
        vm.expectRevert(CohortRegistry.NotLensOwner.selector);
        registry.updateLens(1, "Hacked", "Hacked", 0);
    }

    function test_SetLensActive_RevertsWhenNotOwner() public {
        vm.prank(alice);
        registry.registerLens("Alice Lens", "Desc", "hash", 0);

        vm.prank(bob);
        vm.expectRevert(CohortRegistry.NotLensOwner.selector);
        registry.setLensActive(1, false);
    }
}
