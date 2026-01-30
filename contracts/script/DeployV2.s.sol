// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../SwordEvolutionV2.sol";

/**
 * @title DeployScriptV2
 * @notice Secure deployment script for SwordEvolutionV2
 * @dev Reads PRIVATE_KEY from environment - NEVER hardcode keys!
 * 
 * Usage:
 *   source .env.local && forge script script/DeployV2.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify
 * 
 * Or with cast wallet (Hardware Wallet support):
 *   forge script script/DeployV2.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify --account myledger
 */
contract DeployScriptV2 is Script {
    error MissingPrivateKey();
    error InvalidPrivateKey();
    
    function run() external returns (SwordEvolutionV2) {
        // Check if PRIVATE_KEY is set
        try vm.envUint("PRIVATE_KEY") returns (uint256 deployerPrivateKey) {
            if (deployerPrivateKey == 0) revert InvalidPrivateKey();
            
            address deployer = vm.addr(deployerPrivateKey);
            
            console.log("============================================");
            console.log("  GR1FTSWORD V2 Deployment");
            console.log("============================================");
            console.log("Deployer:", deployer);
            console.log("Chain ID:", block.chainid);
            console.log("Contract: SwordEvolutionV2");
            console.log("Features:");
            console.log("  - 60 days, 3 rounds");
            console.log("  - Sequential aspects: FORGE->CHARGE->GLITCH");
            console.log("  - Max 1 step per day");
            console.log("  - 100 EDGE per claim");
            console.log("");
            
            vm.startBroadcast(deployerPrivateKey);
            
            // Deploy V2 contract
            SwordEvolutionV2 sword = new SwordEvolutionV2();
            
            vm.stopBroadcast();
            
            console.log("SUCCESS! V2 Contract deployed at:");
            console.log(address(sword));
            console.log("");
            console.log("Next steps:");
            console.log("1. Add CONTRACT_ADDRESS_V2 to .env.local");
            console.log("2. Add first track:");
            console.log("   cast send <ADDRESS> \"addTrack(string,uint256)\" \"GR1FTSWORD\" 139880");
            console.log("   --rpc-url $BASE_SEPOLIA_RPC_URL --private-key $PRIVATE_KEY");
            console.log("3. Update frontend with new address");
            console.log("4. Update API with new address");
            console.log("============================================");
            
            return sword;
            
        } catch {
            console.log("ERROR: PRIVATE_KEY not set in environment");
            console.log("");
            console.log("Please set your private key:");
            console.log("  export PRIVATE_KEY=0x...");
            console.log("");
            console.log("Or use a hardware wallet:");
            console.log("  forge script script/DeployV2.s.sol --account <ledger_account>");
            revert MissingPrivateKey();
        }
    }
}
