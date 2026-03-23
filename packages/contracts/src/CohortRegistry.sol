// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CohortRegistry
 * @author CohortLens
 * @notice Registry for AI model lenses (Lenses). Allows users to register, update, and manage lens metadata.
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

    mapping(uint256 => Lens) public lenses;
    uint256 public lensCount;

    event LensRegistered(
        uint256 indexed id,
        address indexed owner,
        string name
    );
    event LensUpdated(
        uint256 indexed id,
        string name,
        uint256 pricePerQuery
    );
    event LensStatusChanged(uint256 indexed id, bool active);

    error NotLensOwner();

    modifier onlyLensOwner(uint256 id) {
        if (msg.sender != lenses[id].owner) revert NotLensOwner();
        _;
    }

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Register a new lens (AI model).
     * @param name Display name for the lens
     * @param description Human-readable description
     * @param modelHash IPFS hash or other identifier for the model
     * @param pricePerQuery Price in wei per prediction query
     * @return The ID of the newly registered lens
     */
    function registerLens(
        string calldata name,
        string calldata description,
        string calldata modelHash,
        uint256 pricePerQuery
    ) external returns (uint256) {
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

    /**
     * @notice Update lens metadata. Callable only by the lens owner.
     * @param id Lens ID
     * @param name New display name
     * @param description New description
     * @param pricePerQuery New price per query in wei
     */
    function updateLens(
        uint256 id,
        string calldata name,
        string calldata description,
        uint256 pricePerQuery
    ) external onlyLensOwner(id) {
        lenses[id].name = name;
        lenses[id].description = description;
        lenses[id].pricePerQuery = pricePerQuery;
        emit LensUpdated(id, name, pricePerQuery);
    }

    /**
     * @notice Enable or disable a lens. Callable only by the lens owner.
     * @param id Lens ID
     * @param active New active status
     */
    function setLensActive(uint256 id, bool active) external onlyLensOwner(id) {
        lenses[id].active = active;
        emit LensStatusChanged(id, active);
    }

    /**
     * @notice Get full lens data by ID.
     * @param id Lens ID
     * @return The lens struct
     */
    function getLens(uint256 id) external view returns (Lens memory) {
        return lenses[id];
    }

    /**
     * @notice Get all lens IDs owned by an address.
     * @param owner Address to query
     * @return Array of lens IDs owned by the address
     */
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
