// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {CohortRegistry} from "../src/CohortRegistry.sol";
import {CohortOracle} from "../src/CohortOracle.sol";

contract DeployContracts is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        CohortRegistry registry = new CohortRegistry();
        CohortOracle oracle = new CohortOracle();

        console.log("CohortRegistry deployed at:", address(registry));
        console.log("CohortOracle deployed at:", address(oracle));

        vm.stopBroadcast();
    }
}
