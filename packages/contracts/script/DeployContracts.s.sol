// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DeployTokenomics} from "./DeployTokenomics.s.sol";

/// @dev Alias for `DeployTokenomics` — full Phase 7 stack (LENS, timelock, governor, staking, registry, oracle).
contract DeployContracts is DeployTokenomics {}
