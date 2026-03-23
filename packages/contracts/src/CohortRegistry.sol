// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IStaking} from "./interfaces/IStaking.sol";

/**
 * @title CohortRegistry
 * @author CohortLens
 * @notice Registry for AI model lenses; registration requires minimum LENS stake (via Staking).
 */
contract CohortRegistry is Ownable {
    struct Lens {
        uint256 id;
        address owner;
        string name;
        string description;
        string modelHash;
        uint256 pricePerQuery;
        bool active;
        uint256 createdAt;
    }

    IStaking public immutable staking;
    uint256 public minStakeToRegister;

    mapping(uint256 => Lens) public lenses;
    uint256 public lensCount;

    event LensRegistered(uint256 indexed id, address indexed owner, string name);
    event LensUpdated(uint256 indexed id, string name, uint256 pricePerQuery);
    event LensStatusChanged(uint256 indexed id, bool active);
    event MinStakeToRegisterSet(uint256 minStake);

    error NotLensOwner();
    error InsufficientStake(uint256 staked, uint256 required);
    error ZeroPrice();

    modifier onlyLensOwner(uint256 id) {
        if (msg.sender != lenses[id].owner) revert NotLensOwner();
        _;
    }

    constructor(address staking_, uint256 minStakeToRegister_) Ownable(msg.sender) {
        staking = IStaking(staking_);
        minStakeToRegister = minStakeToRegister_;
    }

    function setMinStakeToRegister(uint256 minStake) external onlyOwner {
        minStakeToRegister = minStake;
        emit MinStakeToRegisterSet(minStake);
    }

    /**
     * @param pricePerQuery Price in LENS smallest units (wei) per prediction query.
     */
    function registerLens(
        string calldata name,
        string calldata description,
        string calldata modelHash,
        uint256 pricePerQuery
    ) external returns (uint256) {
        uint256 st = staking.balanceOfStaked(msg.sender);
        if (st < minStakeToRegister) revert InsufficientStake(st, minStakeToRegister);
        if (pricePerQuery == 0) revert ZeroPrice();

        ++lensCount;
        uint256 id = lensCount;

        lenses[id] = Lens({
            id: id,
            owner: msg.sender,
            name: name,
            description: description,
            modelHash: modelHash,
            pricePerQuery: pricePerQuery,
            active: true,
            createdAt: block.timestamp
        });

        emit LensRegistered(id, msg.sender, name);
        return id;
    }

    function updateLens(
        uint256 id,
        string calldata name,
        string calldata description,
        uint256 pricePerQuery
    ) external onlyLensOwner(id) {
        if (pricePerQuery == 0) revert ZeroPrice();
        lenses[id].name = name;
        lenses[id].description = description;
        lenses[id].pricePerQuery = pricePerQuery;
        emit LensUpdated(id, name, pricePerQuery);
    }

    function setLensActive(uint256 id, bool active) external onlyLensOwner(id) {
        lenses[id].active = active;
        emit LensStatusChanged(id, active);
    }

    function getLens(uint256 id) external view returns (Lens memory) {
        return lenses[id];
    }

    function getLensesByOwner(address owner) external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i <= lensCount; i++) {
            if (lenses[i].owner == owner) count++;
        }
        uint256[] memory ids = new uint256[](count);
        uint256 j = 0;
        for (uint256 i = 1; i <= lensCount; i++) {
            if (lenses[i].owner == owner) {
                ids[j++] = i;
            }
        }
        return ids;
    }
}
