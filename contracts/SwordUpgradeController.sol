// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./SWORD.sol";

/// @title SwordUpgradeController - On-chain sword upgrade mechanism
/// @notice Handles upgrades (Forge, Charge, Glitch) with bonding curve rewards
/// @dev Users pay ETH to upgrade, receive $SWORD tokens based on current tier
/// @dev Fair launch: 100% of tokens distributed through upgrades
contract SwordUpgradeController is Ownable {
    
    /// @notice Upgrade types available in the system
    enum UpgradeType { FORGE, CHARGE, GLITCH }

    /// @notice Event emitted when an upgrade is performed
    event Upgraded(
        address indexed user,
        UpgradeType indexed upgradeType,
        uint256 amount,
        uint256 newGlobalTotal,
        uint256 rewardAmount,
        uint256 newTotalUpgrades
    );

    /// @notice Event emitted when max supply is reached
    event MaxSupplyReached(uint256 totalUpgrades);

    /// @notice Event emitted when contract fees are withdrawn
    event Withdraw(address indexed recipient, uint256 amount);

    // ============ Constants ============
    
    /// @notice Price per single upgrade step in wei (0.001 ETH)
    uint256 public constant PRICE_PER_UPGRADE = 0.001 ether;

    /// @notice Bonding curve tier thresholds (total upgrades)
    uint256 public constant TIER_1_THRESHOLD = 1000;   // 100 $SWORD per upgrade
    uint256 public constant TIER_2_THRESHOLD = 5000;   // 75 $SWORD per upgrade
    uint256 public constant TIER_3_THRESHOLD = 15000;  // 50 $SWORD per upgrade
    // Above TIER_3_THRESHOLD: 25 $SWORD per upgrade

    // ============ State Variables ============

    /// @notice Total number of upgrades performed across all types
    uint256 public totalUpgrades;

    /// @notice Global upgrade counts for each type
    mapping(UpgradeType => uint256) public globalUpgrades;

    /// @notice User contribution mappings: userContributions[user][upgradeType] = amount
    mapping(address => mapping(UpgradeType => uint256)) public userContributions;

    /// @notice Total contributions per user across all upgrade types
    mapping(address => uint256) public userTotalContributions;

    /// @notice The $SWORD token contract
    SWORD public immutable swordToken;

    // ============ Constructor ============

    /// @notice Constructor sets up the controller with token reference
    /// @param _swordToken The address of the SWORD token contract
    /// @param initialOwner The address that will own this contract
    constructor(SWORD _swordToken, address initialOwner) Ownable(initialOwner) {
        swordToken = _swordToken;
    }

    // ============ External Functions ============

    /// @notice Performs an upgrade on the sword (Forge, Charge, or Glitch)
    /// @param _type The type of upgrade to perform
    /// @param _amount The number of upgrade steps to perform (batched for gas efficiency)
    /// @return actualReward The actual amount of $SWORD minted (may be less if hitting cap)
    function upgrade(UpgradeType _type, uint256 _amount) external payable returns (uint256 actualReward) {
        require(_amount > 0, "SwordUpgrade: amount must be > 0");
        require(
            msg.value == _amount * PRICE_PER_UPGRADE,
            "SwordUpgrade: incorrect ETH amount"
        );

        // Check if rewards are still available
        require(!swordToken.isMaxSupplyReached(), "SwordUpgrade: max supply reached");

        uint256 rewardPerUpgrade = getRewardAmount();
        uint256 totalReward = _amount * rewardPerUpgrade;

        // Update global state
        totalUpgrades += _amount;
        globalUpgrades[_type] += _amount;

        // Update user state
        userContributions[msg.sender][_type] += _amount;
        userTotalContributions[msg.sender] += _amount;

        // Mint $SWORD tokens to user (may be partial if hitting cap)
        actualReward = swordToken.mint(msg.sender, totalReward);
        
        // Check if we just hit max supply
        if (swordToken.isMaxSupplyReached()) {
            emit MaxSupplyReached(totalUpgrades);
        }

        emit Upgraded(
            msg.sender,
            _type,
            _amount,
            globalUpgrades[_type],
            actualReward,
            totalUpgrades
        );

        return actualReward;
    }

    /// @notice Withdraws accumulated ETH to the owner's address
    /// @dev Only callable by owner
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "SwordUpgrade: no funds");

        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "SwordUpgrade: withdraw failed");

        emit Withdraw(owner(), balance);
    }

    // ============ View Functions ============

    /// @notice Calculates the reward amount based on current total upgrades (bonding curve)
    /// @return The amount of $SWORD tokens awarded per upgrade step (in wei, 18 decimals)
    function getRewardAmount() public view returns (uint256) {
        if (totalUpgrades < TIER_1_THRESHOLD) {
            return 100 ether; // 100 $SWORD
        } else if (totalUpgrades < TIER_2_THRESHOLD) {
            return 75 ether;  // 75 $SWORD
        } else if (totalUpgrades < TIER_3_THRESHOLD) {
            return 50 ether;  // 50 $SWORD
        } else {
            return 25 ether;  // 25 $SWORD
        }
    }

    /// @notice Gets the current global state for all upgrade types
    /// @return forge Current total forge upgrades
    /// @return charge Current total charge upgrades
    /// @return glitch Current total glitch upgrades
    function getGlobalState()
        external
        view
        returns (uint256 forge, uint256 charge, uint256 glitch)
    {
        return (
            globalUpgrades[UpgradeType.FORGE],
            globalUpgrades[UpgradeType.CHARGE],
            globalUpgrades[UpgradeType.GLITCH]
        );
    }

    /// @notice Gets the contributions of a specific user
    /// @param user The address to query
    /// @return forge User's forge upgrade count
    /// @return charge User's charge upgrade count
    /// @return glitch User's glitch upgrade count
    function getUserContributions(address user)
        external
        view
        returns (uint256 forge, uint256 charge, uint256 glitch)
    {
        return (
            userContributions[user][UpgradeType.FORGE],
            userContributions[user][UpgradeType.CHARGE],
            userContributions[user][UpgradeType.GLITCH]
        );
    }

    /// @notice Gets the current tier based on total upgrades
    /// @return The current tier number (1-4)
    function getCurrentTier() external view returns (uint256) {
        if (totalUpgrades < TIER_1_THRESHOLD) return 1;
        if (totalUpgrades < TIER_2_THRESHOLD) return 2;
        if (totalUpgrades < TIER_3_THRESHOLD) return 3;
        return 4;
    }

    /// @notice Check if rewards are still available
    /// @return True if more $SWORD can be earned
    function rewardsAvailable() external view returns (bool) {
        return !swordToken.isMaxSupplyReached();
    }

    /// @notice Get remaining $SWORD that can be earned
    /// @return Remaining mintable $SWORD
    function remainingRewards() external view returns (uint256) {
        return swordToken.remainingSupply();
    }

    /// @notice Fallback to receive ETH
    receive() external payable {}
}
