// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CohortOracle
 * @author CohortLens
 * @notice Receives prediction requests and allows an authorized backend to fulfill them.
 */
contract CohortOracle is Ownable {
    struct Request {
        uint256 lensId;
        address requester;
        bytes input;
        bool fulfilled;
        bytes result;
        uint256 createdAt;
    }

    mapping(uint256 => Request) public requests;
    uint256 public requestCount;

    event PredictionRequested(
        uint256 indexed requestId,
        uint256 indexed lensId,
        address indexed requester,
        bytes input
    );
    event PredictionFulfilled(uint256 indexed requestId, bytes result);

    error RequestNotFulfilled(uint256 requestId);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Submit a prediction request.
     * @param lensId ID of the lens (from CohortRegistry) to use
     * @param input Encoded input data (ABI, JSON, etc.)
     * @return The ID of the created request
     */
    function requestPrediction(
        uint256 lensId,
        bytes calldata input
    ) external returns (uint256) {
        ++requestCount;
        uint256 requestId = requestCount;

        requests[requestId] = Request({
            lensId: lensId,
            requester: msg.sender,
            input: input,
            fulfilled: false,
            result: "",
            createdAt: block.timestamp
        });

        emit PredictionRequested(requestId, lensId, msg.sender, input);
        return requestId;
    }

    /**
     * @notice Fulfill a prediction request with the result. Callable only by the contract owner (backend).
     * @param requestId ID of the request to fulfill
     * @param result Encoded result data
     */
    function fulfillRequest(
        uint256 requestId,
        bytes calldata result
    ) external onlyOwner {
        requests[requestId].fulfilled = true;
        requests[requestId].result = result;
        emit PredictionFulfilled(requestId, result);
    }

    /**
     * @notice Get the result of a fulfilled request.
     * @param requestId ID of the request
     * @return The result bytes
     * @dev Reverts if the request has not been fulfilled
     */
    function getResult(uint256 requestId) external view returns (bytes memory) {
        if (!requests[requestId].fulfilled) {
            revert RequestNotFulfilled(requestId);
        }
        return requests[requestId].result;
    }
}
