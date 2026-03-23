// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {LensToken} from "../src/LensToken.sol";
import {CohortTimelock} from "../src/CohortTimelock.sol";
import {CohortGovernor} from "../src/CohortGovernor.sol";
import {Staking} from "../src/Staking.sol";
import {CohortRegistry} from "../src/CohortRegistry.sol";
import {CohortOracle} from "../src/CohortOracle.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Parametrized production deploy: optional multisig as Timelock proposer; wires governance.
/// @dev Set PRIVATE_KEY, RPC_URL (or use --fork-url), GOVERNANCE_MULTISIG (Gnosis Safe), TREASURY_ADDRESS, etc.
contract DeployProduction is Script {
    function _transferLensAdminToTimelock(LensToken lens, address deployer, address timelock) internal {
        lens.grantRole(lens.DEFAULT_ADMIN_ROLE(), timelock);
        lens.grantRole(lens.MINTER_ROLE(), timelock);
        lens.renounceRole(lens.MINTER_ROLE(), deployer);
        lens.renounceRole(lens.DEFAULT_ADMIN_ROLE(), deployer);
    }

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address treasury = vm.envOr("TREASURY_ADDRESS", deployer);
        address governanceMultisig = vm.envOr("GOVERNANCE_MULTISIG", deployer);

        uint256 initialSupply = vm.envOr("LENS_INITIAL_SUPPLY", uint256(100_000_000 ether));
        uint256 minStake = vm.envOr("MIN_STAKE_TO_REGISTER", uint256(1 ether));
        uint256 creatorBps = vm.envOr("ORACLE_CREATOR_BPS", uint256(7000));
        uint256 rewardsBps = vm.envOr("ORACLE_REWARDS_BPS", uint256(2000));
        uint256 timelockDelay = vm.envOr("TIMELOCK_DELAY_SECONDS", uint256(1 days));
        uint256 votingDelayBlocks = vm.envOr("GOV_VOTING_DELAY_BLOCKS", uint256(1));
        uint256 votingPeriodBlocks = vm.envOr("GOV_VOTING_PERIOD_BLOCKS", uint256(50400));
        uint256 proposalThreshold = vm.envOr("GOV_PROPOSAL_THRESHOLD", uint256(0));
        uint256 quorumNumerator = vm.envOr("GOV_QUORUM_NUMERATOR", uint256(4));

        vm.startBroadcast(pk);

        LensToken lens = new LensToken(deployer, treasury, initialSupply);

        address[] memory proposers = new address[](1);
        proposers[0] = governanceMultisig;
        address[] memory executors = new address[](1);
        executors[0] = address(0);

        CohortTimelock timelock = new CohortTimelock(timelockDelay, proposers, executors, deployer);

        Staking staking = new Staking(lens, treasury, address(timelock));

        CohortRegistry registry = new CohortRegistry(address(staking), minStake);

        CohortOracle oracle = new CohortOracle(
            lens,
            registry,
            staking,
            treasury,
            creatorBps,
            rewardsBps
        );

        staking.grantRole(staking.REWARD_NOTIFIER_ROLE(), address(oracle));

        CohortGovernor governor = new CohortGovernor(
            lens,
            timelock,
            uint48(votingDelayBlocks),
            uint32(votingPeriodBlocks),
            proposalThreshold,
            quorumNumerator
        );

        timelock.grantRole(timelock.PROPOSER_ROLE(), address(governor));
        timelock.grantRole(timelock.EXECUTOR_ROLE(), address(0));

        Ownable(registry).transferOwnership(address(timelock));
        Ownable(oracle).transferOwnership(address(timelock));

        _transferLensAdminToTimelock(lens, deployer, address(timelock));

        vm.stopBroadcast();

    }
}
