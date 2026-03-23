// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {CohortOracle} from "../src/CohortOracle.sol";
import {CohortRegistry} from "../src/CohortRegistry.sol";
import {LensToken} from "../src/LensToken.sol";
import {Staking} from "../src/Staking.sol";
import {MockStaking} from "./mocks/MockStaking.sol";

contract CohortOracleTest is Test {
    LensToken public token;
    MockStaking public regStake;
    CohortRegistry public registry;
    Staking public staking;
    CohortOracle public oracle;

    address public owner;
    address public alice;
    address public treasury = makeAddr("treasury");

    function setUp() public {
        owner = address(this);
        alice = makeAddr("alice");
        token = new LensToken(owner, treasury, 1_000_000 ether);
        regStake = new MockStaking();
        regStake.setStaked(alice, 10 ether);
        registry = new CohortRegistry(address(regStake), 1 ether);
        vm.prank(alice);
        registry.registerLens("L", "D", "h", 1 ether);

        staking = new Staking(token, treasury, owner);
        oracle = new CohortOracle(
            token,
            registry,
            staking,
            treasury,
            7000,
            2000
        );
        staking.grantRole(staking.REWARD_NOTIFIER_ROLE(), address(oracle));

        vm.prank(treasury);
        token.transfer(alice, 1000 ether);
        vm.prank(alice);
        token.approve(address(oracle), type(uint256).max);
    }

    function test_RequestPrediction_PaysAndSplits() public {
        uint256 beforeTreasury = token.balanceOf(treasury);
        vm.prank(alice);
        uint256 requestId = oracle.requestPrediction(1, hex"1234");

        assertEq(requestId, 1);
        assertEq(oracle.requestCount(), 1);

        (uint256 lensId, address requester, bytes memory input, bool fulfilled, , uint256 createdAt) = oracle
            .requests(1);

        assertEq(lensId, 1);
        assertEq(requester, alice);
        assertEq(input, hex"1234");
        assertFalse(fulfilled);
        assertGt(createdAt, 0);

        assertEq(token.balanceOf(treasury), beforeTreasury + (1 ether * 1000) / 10_000);
    }

    function test_RequestPrediction_EmitsEvent() public {
        vm.prank(alice);
        vm.recordLogs();
        oracle.requestPrediction(1, hex"1234");
        Vm.Log[] memory entries = vm.getRecordedLogs();
        bytes32 expected = keccak256(
            "PredictionRequested(uint256,uint256,address,bytes,uint256,uint256,uint256,uint256)"
        );
        bool found;
        for (uint256 i = 0; i < entries.length; i++) {
            if (entries[i].topics[0] == expected) {
                found = true;
                break;
            }
        }
        assertTrue(found);
    }

    function test_FulfillRequest() public {
        vm.prank(alice);
        oracle.requestPrediction(1, hex"696e707574");

        bytes memory result = hex"deadbeef";
        oracle.fulfillRequest(1, result);

        assertEq(oracle.getResult(1), result);

        (, , , bool fulfilled, , ) = oracle.requests(1);
        assertTrue(fulfilled);
    }

    function test_GetResult_RevertsWhenNotFulfilled() public {
        vm.prank(alice);
        oracle.requestPrediction(1, hex"696e");

        vm.expectRevert(abi.encodeWithSelector(CohortOracle.RequestNotFulfilled.selector, 1));
        oracle.getResult(1);
    }

    function test_FulfillRequest_RevertsWhenNotOwner() public {
        vm.prank(alice);
        oracle.requestPrediction(1, hex"696e");

        vm.prank(alice);
        vm.expectRevert();
        oracle.fulfillRequest(1, hex"726573756c74");
    }

    function test_RegisterPredictionProofHash() public {
        vm.prank(alice);
        oracle.requestPrediction(1, hex"ab");
        oracle.fulfillRequest(1, hex"01");

        bytes32 h = keccak256("zk-proof");
        oracle.registerPredictionProofHash(1, h);
        assertEq(oracle.predictionProofHashes(1), h);
    }

    function test_FulfillRequest_RevertsForInvalidRequest() public {
        vm.expectRevert(abi.encodeWithSelector(CohortOracle.InvalidRequest.selector, 1));
        oracle.fulfillRequest(1, hex"01");
    }

    function test_FulfillRequest_RevertsWhenAlreadyFulfilled() public {
        vm.prank(alice);
        oracle.requestPrediction(1, hex"ab");
        oracle.fulfillRequest(1, hex"01");
        vm.expectRevert(abi.encodeWithSelector(CohortOracle.RequestAlreadyFulfilled.selector, 1));
        oracle.fulfillRequest(1, hex"02");
    }

    function test_RegisterPredictionProofHash_RevertsWhenNotFulfilled() public {
        vm.prank(alice);
        oracle.requestPrediction(1, hex"ab");
        vm.expectRevert(abi.encodeWithSelector(CohortOracle.RequestNotFulfilled.selector, 1));
        oracle.registerPredictionProofHash(1, keccak256("p"));
    }

    function test_RegisterPredictionProofHash_RevertsOnOverwrite() public {
        vm.prank(alice);
        oracle.requestPrediction(1, hex"ab");
        oracle.fulfillRequest(1, hex"01");
        bytes32 first = keccak256("first");
        oracle.registerPredictionProofHash(1, first);
        vm.expectRevert(abi.encodeWithSelector(CohortOracle.ProofAlreadyRegistered.selector, 1));
        oracle.registerPredictionProofHash(1, keccak256("second"));
    }
}
