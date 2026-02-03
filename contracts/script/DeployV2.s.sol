// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../SwordEvolutionV2.sol";

/**
 * @title DeployScriptV2
 * @notice Deploy SwordEvolutionV2 + add GR1FTSWORD track in one transaction
 * @dev Reads PRIVATE_KEY from environment - NEVER hardcode keys!
 * 
 * Usage:
 *   source .env.local && forge script script/DeployV2.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify
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
            console.log("  GR1FTSWORD V2.1 Deployment");
            console.log("============================================");
            console.log("Deployer:", deployer);
            console.log("Chain ID:", block.chainid);
            console.log("");
            console.log("Features:");
            console.log("  - 60 days (24h each, auto-advance)");
            console.log("  - Sequential: FORGE->CHARGE->GLITCH");
            console.log("  - +0.1 level per day (first claim)");
            console.log("  - Max 10 claims per day for $EDGE");
            console.log("");
            
            vm.startBroadcast(deployerPrivateKey);
            
            // Deploy V2 contract
            SwordEvolutionV2 sword = new SwordEvolutionV2();
            console.log("Contract deployed at:", address(sword));
            
            // Add GR1FTSWORD track immediately
            sword.addTrack("GR1FTSWORD", 139880);
            console.log("Track added: GR1FTSWORD (139880ms)");
            
            vm.stopBroadcast();
            
            console.log("");
            console.log("============================================");
            console.log("  SUCCESS!");
            console.log("============================================");
            console.log("");
            console.log("Contract:", address(sword));
            console.log("");
            console.log("Next steps:");
            console.log("1. Update .env.local:");
            console.log("   CONTRACT_ADDRESS_BASE_SEPOLIA=", address(sword));
            console.log("   NEXT_PUBLIC_CONTRACT_ADDRESS_V2=", address(sword));
            console.log("");
            console.log("2. Update Vercel env vars");
            console.log("3. Update fallback addresses in:");
            console.log("   - src/app/api/sign-challenge/route.ts");
            console.log("   - src/hooks/useSwordEvolutionV2.ts");
            console.log("   - src/lib/contracts/swordEvolutionV2.ts");
            console.log("============================================");
            
            return sword;
            
        } catch {
            console.log("ERROR: PRIVATE_KEY not set in environment");
            console.log("  export PRIVATE_KEY=0x...");
            revert MissingPrivateKey();
        }
    }
}
