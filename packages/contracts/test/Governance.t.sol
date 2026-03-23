// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {LensToken} from "../src/LensToken.sol";
import {CohortTimelock} from "../src/CohortTimelock.sol";
import {CohortGovernor} from "../src/CohortGovernor.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

/// @notice Smoke test: governor + timelock deploy and roles.
contract GovernanceTest is Test {
    function test_DeployGovernorAndTimelock() public {
        address deployer = address(this);
        address treasury = makeAddr("treasury");

        LensToken token = new LensToken(deployer, treasury, 10_000_000 ether);

        address[] memory proposers = new address[](1);
        proposers[0] = deployer;
        address[] memory executors = new address[](1);
        executors[0] = address(0);

        CohortTimelock timelock = new CohortTimelock(1 days, proposers, executors, deployer);

        CohortGovernor governor = new CohortGovernor(
            token,
            timelock,
            1,
            100,
            0,
            4
        );

        timelock.grantRole(timelock.PROPOSER_ROLE(), address(governor));
        timelock.grantRole(timelock.EXECUTOR_ROLE(), address(0));

        assertTrue(timelock.hasRole(timelock.PROPOSER_ROLE(), address(governor)));
    }
}
