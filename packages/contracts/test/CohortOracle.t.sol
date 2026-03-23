// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {CohortOracle} from "../src/CohortOracle.sol";

contract CohortOracleTest is Test {
    CohortOracle public oracle;

    address public owner;
    address public alice;

    function setUp() public {
        owner = address(this);
        alice = makeAddr("alice");
        oracle = new CohortOracle();
    }

    function test_RequestPrediction() public {
        vm.prank(alice);
        uint256 requestId = oracle.requestPrediction(1, hex"1234");

        assertEq(requestId, 1);
        assertEq(oracle.requestCount(), 1);

        (
            uint256 lensId,
            address requester,
            bytes memory input,
            bool fulfilled,
            ,
            uint256 createdAt
        ) = oracle.requests(1);

        assertEq(lensId, 1);
        assertEq(requester, alice);
        assertEq(input, hex"1234");
        assertFalse(fulfilled);
        assertGt(createdAt, 0);
    }

    function test_RequestPrediction_EmitsEvent() public {
        vm.prank(alice);
        vm.recordLogs();
        oracle.requestPrediction(1, hex"1234");
        Vm.Log[] memory entries = vm.getRecordedLogs();
        assertEq(entries.length, 1);
        assertEq(entries[0].topics[0], keccak256("PredictionRequested(uint256,uint256,address,bytes)"));
    }

    function test_FulfillRequest() public {
        vm.prank(alice);
        oracle.requestPrediction(1, hex"696e707574"); // "input" in hex

        bytes memory result = hex"deadbeef";
        oracle.fulfillRequest(1, result);

        assertEq(oracle.getResult(1), result);

        (, , , bool fulfilled, , ) = oracle.requests(1);
        assertTrue(fulfilled);
    }

    function test_FulfillRequest_EmitsEvent() public {
        vm.prank(alice);
        oracle.requestPrediction(1, hex"696e"); // "in"

        bytes memory result = hex"6f7574"; // "out"
        vm.recordLogs();
        oracle.fulfillRequest(1, result);
        Vm.Log[] memory entries = vm.getRecordedLogs();
        assertEq(entries.length, 1);
        assertEq(entries[0].topics[0], keccak256("PredictionFulfilled(uint256,bytes)"));
    }

    function test_GetResult_RevertsWhenNotFulfilled() public {
        vm.prank(alice);
        oracle.requestPrediction(1, hex"696e");

        vm.expectRevert(
            abi.encodeWithSelector(CohortOracle.RequestNotFulfilled.selector, 1)
        );
        oracle.getResult(1);
    }

    function test_FulfillRequest_RevertsWhenNotOwner() public {
        vm.prank(alice);
        oracle.requestPrediction(1, hex"696e");

        vm.prank(alice);
        vm.expectRevert();
        oracle.fulfillRequest(1, hex"726573756c74"); // "result"
    }

    function test_RegisterPredictionProofHash() public {
        vm.prank(alice);
        oracle.requestPrediction(1, hex"ab");

        bytes32 h = keccak256("zk-proof");
        oracle.registerPredictionProofHash(1, h);
        assertEq(oracle.predictionProofHashes(1), h);
    }

    function test_RegisterPredictionProofHash_RevertsWhenNotOwner() public {
        vm.prank(alice);
        oracle.requestPrediction(1, hex"ab");

        vm.prank(alice);
        vm.expectRevert();
        oracle.registerPredictionProofHash(1, bytes32(uint256(1)));
    }
}
