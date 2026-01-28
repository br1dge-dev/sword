// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../SwordEvolution.sol";

/**
 * @title DeployScript
 * @notice Secure deployment script for SwordEvolution
 * @dev Reads PRIVATE_KEY from environment - NEVER hardcode keys!
 * 
 * Usage:
 *   source .env.local && forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify
 * 
 * Or with cast wallet (Hardware Wallet support):
 *   forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify --account myledger
 */
contract DeployScript is Script {
    error MissingPrivateKey();
    error InvalidPrivateKey();
    
    function run() external returns (SwordEvolution) {
        // Check if PRIVATE_KEY is set
        try vm.envUint("PRIVATE_KEY") returns (uint256 deployerPrivateKey) {
            if (deployerPrivateKey == 0) revert InvalidPrivateKey();
            
            address deployer = vm.addr(deployerPrivateKey);
            
            console.log("============================================");
            console.log("  GR1FTSWORD Deployment");
            console.log("============================================");
            console.log("Deployer:", deployer);
            console.log("Chain ID:", block.chainid);
            console.log("");
            
            vm.startBroadcast(deployerPrivateKey);
            
            // Deploy contract
            SwordEvolution sword = new SwordEvolution();
            
            vm.stopBroadcast();
            
            console.log("SUCCESS! Contract deployed at:");
            console.log(address(sword));
            console.log("");
            console.log("Next steps:");
            console.log("1. Add CONTRACT_ADDRESS to .env.local");
            console.log("2. Add first track: cast send", address(sword), "addTrack(string,uint256) \"GR1FTSWORD\" 139880 --rpc-url $RPC_URL --private-key $PRIVATE_KEY");
            console.log("3. Update frontend with new address");
            console.log("============================================");
            
            return sword;
            
        } catch {
            console.log("ERROR: PRIVATE_KEY not set in environment");
            console.log("");
            console.log("Please set your private key:");
            console.log("  export PRIVATE_KEY=0x...");
            console.log("");
            console.log("Or use a hardware wallet:");
            console.log("  forge script script/Deploy.s.sol --account <ledger_account>");
            revert MissingPrivateKey();
        }
    }
}
