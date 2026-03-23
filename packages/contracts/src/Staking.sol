// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Staking
 * @notice Stake LENS, receive oracle fee rewards, slash via governance (Timelock).
 * @dev `notifyRewardAmount` updates accounting only; CohortOracle must `transfer` LENS to this contract first.
 */
contract Staking is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable stakingToken;
    bytes32 public constant REWARD_NOTIFIER_ROLE = keccak256("REWARD_NOTIFIER_ROLE");

    address public immutable treasury;

    mapping(address => uint256) private _staked;
    uint256 public totalStaked;

    uint256 public rewardPerTokenStored;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event RewardNotified(uint256 amount);
    event Slashed(address indexed account, uint256 amount, bytes32 reason, address indexed to);

    error InsufficientStake();
    error ZeroAddress();

    constructor(IERC20 _stakingToken, address _treasury, address admin) {
        if (address(_stakingToken) == address(0) || _treasury == address(0) || admin == address(0)) revert ZeroAddress();
        stakingToken = _stakingToken;
        treasury = _treasury;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function balanceOfStaked(address account) external view returns (uint256) {
        return _staked[account];
    }

    function earned(address account) public view returns (uint256) {
        uint256 st = _staked[account];
        return rewards[account] + (st * (rewardPerTokenStored - userRewardPerTokenPaid[account])) / 1e18;
    }

    function _updateReward(address account) internal {
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
    }

    /// @notice Call after LENS has been transferred to this contract (from CohortOracle).
    function notifyRewardAmount(uint256 amount) external nonReentrant onlyRole(REWARD_NOTIFIER_ROLE) {
        _updateReward(address(0));
        if (totalStaked > 0 && amount > 0) {
            rewardPerTokenStored += (amount * 1e18) / totalStaked;
        }
        emit RewardNotified(amount);
    }

    function stake(uint256 amount) external nonReentrant {
        if (amount == 0) return;
        _updateReward(msg.sender);
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        _staked[msg.sender] += amount;
        totalStaked += amount;
        _updateReward(msg.sender);
        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) return;
        _updateReward(msg.sender);
        if (_staked[msg.sender] < amount) revert InsufficientStake();
        _staked[msg.sender] -= amount;
        totalStaked -= amount;
        stakingToken.safeTransfer(msg.sender, amount);
        _updateReward(msg.sender);
        emit Withdrawn(msg.sender, amount);
    }

    function getReward() external nonReentrant {
        _updateReward(msg.sender);
        uint256 r = rewards[msg.sender];
        if (r > 0) {
            rewards[msg.sender] = 0;
            stakingToken.safeTransfer(msg.sender, r);
            emit RewardPaid(msg.sender, r);
        }
    }

    function slash(address account, uint256 amount, bytes32 reason) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        _updateReward(account);
        uint256 st = _staked[account];
        uint256 take = amount > st ? st : amount;
        if (take == 0) return;
        _staked[account] -= take;
        totalStaked -= take;
        _updateReward(account);
        stakingToken.safeTransfer(treasury, take);
        emit Slashed(account, take, reason, treasury);
    }
}
