// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../SwordEvolutionV2.sol";

/**
 * @title AddTracksScript
 * @notice Adds initial tracks to SwordEvolutionV2
 * @dev Run: source .env.local && forge script script/AddTracks.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast
 */
contract AddTracksScript is Script {
    error MissingPrivateKey();
    error MissingContractAddress();
    
    function run() external {
        // Check environment
        uint256 deployerPrivateKey;
        try vm.envUint("PRIVATE_KEY") returns (uint256 key) {
            deployerPrivateKey = key;
        } catch {
            console.log("ERROR: PRIVATE_KEY not set");
            revert MissingPrivateKey();
        }
        
        address contractAddress;
        try vm.envAddress("CONTRACT_ADDRESS_BASE_SEPOLIA") returns (addr) {
            contractAddress = addr;
        } catch {
            console.log("ERROR: CONTRACT_ADDRESS_BASE_SEPOLIA not set");
            revert MissingContractAddress();
        }
        
        console.log("============================================");
        console.log("  Adding Tracks to SwordEvolutionV2");
        console.log("============================================");
        console.log("Contract:", contractAddress);
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        SwordEvolutionV2 sword = SwordEvolutionV2(contractAddress);
        
        // Add tracks
        // Duration in milliseconds
        console.log("Adding tracks...");
        
        sword.addTrack("GR1FTSWORD", 139880);
        console.log("  + GR1FTSWORD (139880ms)");
        
        sword.addTrack("FLASHWORD", 120000);
        console.log("  + FLASHWORD (120000ms)");
        
        sword.addTrack("FUNKSWORD", 180000);
        console.log("  + FUNKSWORD (180000ms)");
        
        sword.addTrack("ATARISWORD", 150000);
        console.log("  + ATARISWORD (150000ms)");
        
        sword.addTrack("DR4GONSWORD", 200000);
        console.log("  + DR4GONSWORD (200000ms)");
        
        sword.addTrack("PUNCHSWORD", 160000);
        console.log("  + PUNCHSWORD (160000ms)");
        
        sword.addTrack("NIGHTSWORD", 175000);
        console.log("  + NIGHTSWORD (175000ms)");
        
        sword.addTrack("DANGERSWORD", 190000);
        console.log("  + DANGERSWORD (190000ms)");
        
        sword.addTrack("SHONENSWORD", 185000);
        console.log("  + SHONENSWORD (185000ms)");
        
        sword.addTrack("WORFSWORD", 170000);
        console.log("  + WORFSWORD (170000ms)");
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("============================================");
        console.log("  SUCCESS! 10 tracks added");
        console.log("============================================");
        console.log("");
        console.log("All tracks are active by default.");
        console.log("Users can now start challenges!");
    }
}
