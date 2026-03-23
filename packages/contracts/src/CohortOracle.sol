// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {CohortRegistry} from "./CohortRegistry.sol";
import {Staking} from "./Staking.sol";

/**
 * @title CohortOracle
 * @notice Prediction requests charge LENS per CohortRegistry lens price; splits to creator, rewards pool, treasury.
 */
contract CohortOracle is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable lensToken;
    CohortRegistry public immutable registry;
    Staking public immutable staking;
    address public treasury;

    /// @notice Basis points for creator and rewards (remainder to treasury). Sum must be <= 10000.
    uint256 public creatorBps;
    uint256 public rewardsBps;

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

    mapping(uint256 => bytes32) public predictionProofHashes;

    event PredictionRequested(
        uint256 indexed requestId,
        uint256 indexed lensId,
        address indexed requester,
        bytes input,
        uint256 pricePaid,
        uint256 creatorShare,
        uint256 rewardsShare,
        uint256 treasuryShare
    );
    event PredictionFulfilled(uint256 indexed requestId, bytes result);
    event PredictionProofHashRegistered(uint256 indexed requestId, bytes32 proofHash);
    event FeeParamsUpdated(uint256 creatorBps, uint256 rewardsBps, address treasury);

    error RequestNotFulfilled(uint256 requestId);
    error LensInactive(uint256 lensId);
    error InvalidFeeParams();
    error ZeroPrice();

    constructor(
        IERC20 lensToken_,
        CohortRegistry registry_,
        Staking staking_,
        address treasury_,
        uint256 creatorBps_,
        uint256 rewardsBps_
    ) Ownable(msg.sender) {
        lensToken = lensToken_;
        registry = registry_;
        staking = staking_;
        treasury = treasury_;
        _setFeeParams(creatorBps_, rewardsBps_);
    }

    function setTreasury(address t) external onlyOwner {
        treasury = t;
        emit FeeParamsUpdated(creatorBps, rewardsBps, t);
    }

    function setFeeBps(uint256 creatorBps_, uint256 rewardsBps_) external onlyOwner {
        _setFeeParams(creatorBps_, rewardsBps_);
    }

    function _setFeeParams(uint256 creatorBps_, uint256 rewardsBps_) internal {
        if (creatorBps_ + rewardsBps_ > 10_000) revert InvalidFeeParams();
        creatorBps = creatorBps_;
        rewardsBps = rewardsBps_;
        emit FeeParamsUpdated(creatorBps_, rewardsBps_, treasury);
    }

    /**
     * @notice Pulls `pricePerQuery` in LENS from msg.sender (approve first), splits fee, records request.
     */
    function requestPrediction(uint256 lensId, bytes calldata input) external nonReentrant returns (uint256) {
        CohortRegistry.Lens memory lens = registry.getLens(lensId);
        if (!lens.active) revert LensInactive(lensId);
        uint256 price = lens.pricePerQuery;
        if (price == 0) revert ZeroPrice();

        lensToken.safeTransferFrom(msg.sender, address(this), price);

        uint256 creatorShare = (price * creatorBps) / 10_000;
        uint256 rewardsShare = (price * rewardsBps) / 10_000;
        uint256 treasuryShare = price - creatorShare - rewardsShare;

        if (creatorShare > 0) {
            lensToken.safeTransfer(lens.owner, creatorShare);
        }
        if (rewardsShare > 0) {
            lensToken.safeTransfer(address(staking), rewardsShare);
            staking.notifyRewardAmount(rewardsShare);
        }
        if (treasuryShare > 0 && treasury != address(0)) {
            lensToken.safeTransfer(treasury, treasuryShare);
        }

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

        emit PredictionRequested(
            requestId,
            lensId,
            msg.sender,
            input,
            price,
            creatorShare,
            rewardsShare,
            treasuryShare
        );
        return requestId;
    }

    function fulfillRequest(uint256 requestId, bytes calldata result) external onlyOwner {
        requests[requestId].fulfilled = true;
        requests[requestId].result = result;
        emit PredictionFulfilled(requestId, result);
    }

    function registerPredictionProofHash(uint256 requestId, bytes32 proofHash) external onlyOwner {
        predictionProofHashes[requestId] = proofHash;
        emit PredictionProofHashRegistered(requestId, proofHash);
    }

    function getResult(uint256 requestId) external view returns (bytes memory) {
        if (!requests[requestId].fulfilled) {
            revert RequestNotFulfilled(requestId);
        }
        return requests[requestId].result;
    }
}
