// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {CohortRegistry} from "../src/CohortRegistry.sol";
import {MockStaking} from "./mocks/MockStaking.sol";

contract CohortRegistryTest is Test {
    CohortRegistry public registry;
    MockStaking public staking;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    function setUp() public {
        staking = new MockStaking();
        registry = new CohortRegistry(address(staking), 1 ether);
    }

    function test_RegisterLens_RevertsWithoutStake() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(CohortRegistry.InsufficientStake.selector, uint256(0), uint256(1 ether))
        );
        registry.registerLens("Test Lens", "A test lens", "QmHash123", 1 ether);
    }

    function test_RegisterLens() public {
        staking.setStaked(alice, 2 ether);
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
        staking.setStaked(alice, 2 ether);
        vm.prank(alice);
        vm.recordLogs();
        registry.registerLens("My Lens", "Desc", "hash", 1 ether);
        Vm.Log[] memory entries = vm.getRecordedLogs();
        assertEq(entries.length, 1);
        assertEq(entries[0].topics[0], keccak256("LensRegistered(uint256,address,string)"));
    }

    function test_UpdateLens() public {
        staking.setStaked(alice, 2 ether);
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
        staking.setStaked(alice, 2 ether);
        vm.prank(alice);
        registry.registerLens("Lens", "Desc", "hash", 1 ether);

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
        staking.setStaked(alice, 2 ether);
        vm.prank(alice);
        registry.registerLens("Alice Lens", "Desc", "hash", 1 ether);

        vm.prank(bob);
        vm.expectRevert(CohortRegistry.NotLensOwner.selector);
        registry.updateLens(1, "Hacked", "Hacked", 1 ether);
    }

    function test_SetLensActive_RevertsWhenNotOwner() public {
        staking.setStaked(alice, 2 ether);
        vm.prank(alice);
        registry.registerLens("Alice Lens", "Desc", "hash", 1 ether);

        vm.prank(bob);
        vm.expectRevert(CohortRegistry.NotLensOwner.selector);
        registry.setLensActive(1, false);
    }

    function test_RegisterLens_RevertsOnZeroPrice() public {
        staking.setStaked(alice, 2 ether);
        vm.prank(alice);
        vm.expectRevert(CohortRegistry.ZeroPrice.selector);
        registry.registerLens("Zero", "Desc", "hash", 0);
    }

    function test_UpdateLens_RevertsOnZeroPrice() public {
        staking.setStaked(alice, 2 ether);
        vm.prank(alice);
        registry.registerLens("Lens", "Desc", "hash", 1 ether);

        vm.prank(alice);
        vm.expectRevert(CohortRegistry.ZeroPrice.selector);
        registry.updateLens(1, "Lens", "Desc", 0);
    }
}
