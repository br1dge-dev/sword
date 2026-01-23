// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title SWORD - Fair Launch ERC-20 Token for GR1FTSWORD
/// @notice 100% community-minted through upgrades. No pre-mine, no team allocation.
/// @dev Hard cap of 10M tokens. Only the SwordUpgradeController can mint.
contract SWORD is ERC20, Ownable {
    
    /// @notice Maximum supply: 10,000,000 SWORD (with 18 decimals)
    uint256 public constant MAX_SUPPLY = 10_000_000 ether;
    
    /// @notice Address authorized to mint tokens
    address public minter;

    /// @notice Emitted when minting would exceed max supply
    error MaxSupplyExceeded(uint256 requested, uint256 available);
    
    /// @notice Emitted when non-minter tries to mint
    error OnlyMinter();

    /// @notice Constructor sets up the token with initial owner
    /// @param initialOwner The address that will control the minter role
    constructor(address initialOwner) ERC20("SWORD", "SWORD") Ownable(initialOwner) {
        // No pre-mine. All tokens minted through upgrades.
    }

    /// @notice Sets the minter address (can only be called by owner, once)
    /// @param newMinter The address authorized to mint tokens
    function setMinter(address newMinter) external onlyOwner {
        require(minter == address(0), "SWORD: Minter already set");
        minter = newMinter;
    }

    /// @notice Mints new tokens (only callable by authorized minter)
    /// @param to The address to receive the minted tokens
    /// @param amount The amount of tokens to mint
    /// @return actualMinted The amount actually minted (may be less if hitting cap)
    function mint(address to, uint256 amount) external returns (uint256 actualMinted) {
        if (msg.sender != minter) revert OnlyMinter();
        
        uint256 currentSupply = totalSupply();
        uint256 available = MAX_SUPPLY - currentSupply;
        
        if (available == 0) {
            return 0; // Cap reached, no more minting
        }
        
        // Mint up to available amount
        actualMinted = amount > available ? available : amount;
        _mint(to, actualMinted);
        
        return actualMinted;
    }

    /// @notice Returns remaining mintable supply
    /// @return The amount of tokens that can still be minted
    function remainingSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }
    
    /// @notice Returns whether max supply has been reached
    /// @return True if no more tokens can be minted
    function isMaxSupplyReached() external view returns (bool) {
        return totalSupply() >= MAX_SUPPLY;
    }
}
