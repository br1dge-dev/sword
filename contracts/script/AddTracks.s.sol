// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../SwordEvolutionV2.sol";

/**
 * @title AddTracksScript
 * @notice Adds tracks to SwordEvolutionV2
 * @dev Run: source .env.local && forge script script/AddTracks.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast
 * 
 * Environment variables:
 *   - ADD_ALL_TRACKS=true  → Add all 10 tracks
 *   - ADD_ALL_TRACKS=false → Add only GR1FTSWORD (default)
 */
contract AddTracksScript is Script {
    error MissingPrivateKey();
    error MissingContractAddress();
    
    struct TrackInfo {
        string name;
        uint256 durationMs;
    }
    
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
        try vm.envAddress("CONTRACT_ADDRESS_BASE_SEPOLIA") returns (address addr) {
            contractAddress = addr;
        } catch {
            console.log("ERROR: CONTRACT_ADDRESS_BASE_SEPOLIA not set");
            revert MissingContractAddress();
        }
        
        // Check if we should add all tracks or just GR1FTSWORD
        bool addAllTracks = false;
        try {
            string memory addAll = vm.envString("ADD_ALL_TRACKS");
            if (keccak256(bytes(addAll)) == keccak256(bytes("true"))) {
                addAllTracks = true;
            }
        } catch {
            // Default: false (only GR1FTSWORD)
        }
        
        console.log("============================================");
        console.log("  Adding Tracks to SwordEvolutionV2");
        console.log("============================================");
        console.log("Contract:", contractAddress);
        console.log("Mode:", addAllTracks ? "ALL TRACKS" : "GR1FTSWORD ONLY");
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        SwordEvolutionV2 sword = SwordEvolutionV2(contractAddress);
        
        // Define tracks
        TrackInfo[] memory tracks = new TrackInfo[](10);
        tracks[0] = TrackInfo("GR1FTSWORD", 139880);
        tracks[1] = TrackInfo("FLASHWORD", 120000);
        tracks[2] = TrackInfo("FUNKSWORD", 180000);
        tracks[3] = TrackInfo("ATARISWORD", 150000);
        tracks[4] = TrackInfo("DR4GONSWORD", 200000);
        tracks[5] = TrackInfo("PUNCHSWORD", 160000);
        tracks[6] = TrackInfo("NIGHTSWORD", 175000);
        tracks[7] = TrackInfo("DANGERSWORD", 190000);
        tracks[8] = TrackInfo("SHONENSWORD", 185000);
        tracks[9] = TrackInfo("WORFSWORD", 170000);
        
        // Add tracks based on mode
        if (addAllTracks) {
            console.log("Adding all 10 tracks...");
            for (uint i = 0; i < tracks.length; i++) {
                sword.addTrack(tracks[i].name, tracks[i].durationMs);
                console.log(string.concat("  + ", tracks[i].name, " (", vm.toString(tracks[i].durationMs), "ms)"));
            }
        } else {
            // Only add GR1FTSWORD
            console.log("Adding GR1FTSWORD only...");
            sword.addTrack(tracks[0].name, tracks[0].durationMs);
            console.log(string.concat("  + ", tracks[0].name, " (", vm.toString(tracks[0].durationMs), "ms)"));
            console.log("");
            console.log("To add all tracks later, run with:");
            console.log("  ADD_ALL_TRACKS=true ./scripts/add-tracks.sh");
        }
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("============================================");
        console.log(addAllTracks ? "  SUCCESS! All tracks added" : "  SUCCESS! GR1FTSWORD added");
        console.log("============================================");
        console.log("");
        console.log("Tracks are active by default.");
        console.log("Users can now start challenges!");
    }
}
