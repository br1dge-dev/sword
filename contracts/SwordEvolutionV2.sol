// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title SwordEvolution V2 - Corrected progression system
/// @notice 60 days, 60 steps, all aspects level up together
/// @dev Each day with ≥1 claim adds +1 step to global progress
contract SwordEvolutionV2 is ERC20, Ownable {

    using ECDSA for bytes32;
    
    // ============ Constants ============
    
    uint256 public constant MAX_SUPPLY = 60_000 ether;
    uint256 public constant EDGE_PER_CLAIM = 100 ether;
    uint8 public constant MAX_CLAIMS_PER_DAY = 10;
    uint256 public constant CHALLENGE_WINDOW_MS = 45_000;
    uint8 public constant MIN_SCORE = 70;
    uint8 public constant TOTAL_DAYS = 60;
    uint8 public constant TOTAL_STEPS = 60; // 3 aspects × 20 steps (1.0→3.0)
    
    // ============ EIP-712 ============
    
    bytes32 public immutable DOMAIN_SEPARATOR;
    bytes32 public constant CLAIM_TYPEHASH = keccak256("Claim(address user,uint256 score,uint256 startOffsetMs,uint256 deadline)");
    mapping(address => uint256) public nonces;
    
    // ============ State Variables ============
    
    /// @notice Global progress (0-60), increases by 1 per day with ≥1 claim
    uint8 public globalProgress;
    
    /// @notice Current day (1-60)
    uint256 public currentDay;
    
    /// @notice Claims made today (0-10)
    uint8 public claimsToday;
    
    /// @notice Was a step already claimed today?
    bool public stepClaimedToday;
    
    /// @notice When current day started
    uint256 public dayStartTimestamp;
    
    /// @notice Track pool
    struct Track {
        string name;
        uint256 durationMs;
        bool active;
    }
    Track[] public tracks;
    uint256 public trackCount;
    
    /// @notice User data
    mapping(address => uint256) public userLastClaimDay;
    mapping(address => uint256) public userTotalClaims;
    mapping(address => uint256) public userTotalMinted;
    
    // ============ Events ============
    
    event ChallengeClaimed(
        address indexed user,
        uint256 startOffsetMs,
        uint8 score,
        uint256 edgeMinted,
        uint8 newGlobalProgress
    );
    
    event DayAdvanced(
        uint256 indexed newDay,
        uint8 claimsYesterday,
        uint8 globalProgress
    );
    
    event GlobalProgressIncreased(
        uint8 newProgress,
        uint8 currentLevel  // 10, 20, or 30
    );
    
    // ============ Errors ============
    
    error EvolutionComplete();
    error MaxClaimsReached();
    error AlreadyClaimedToday();
    error ScoreTooLow(uint8 score, uint8 required);
    error InvalidSignature();
    error SignatureExpired();
    error TooEarly();
    error NoActiveTracks();
    
    // ============ Constructor ============
    
    constructor() ERC20("EDGE", "EDGE") Ownable(msg.sender) {
        currentDay = 1;
        dayStartTimestamp = block.timestamp;
        
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("GR1FTSWORD")),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }
    
    // ============ Core Functions ============
    
    /// @notice Claim a challenge completion with EIP-712 signature
    function claimWithSignature(
        uint8 score,
        uint256 startOffsetMs,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // Check evolution not complete
        if (currentDay > TOTAL_DAYS || globalProgress >= TOTAL_STEPS) {
            revert EvolutionComplete();
        }
        
        // Check global claims limit
        if (claimsToday >= MAX_CLAIMS_PER_DAY) {
            revert MaxClaimsReached();
        }
        
        // Check user hasn't claimed today
        if (userLastClaimDay[msg.sender] == currentDay) {
            revert AlreadyClaimedToday();
        }
        
        // Check signature not expired
        if (block.timestamp > deadline) {
            revert SignatureExpired();
        }
        
        // Check minimum score
        if (score < MIN_SCORE) {
            revert ScoreTooLow(score, MIN_SCORE);
        }
        
        // Build EIP-712 hash
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        CLAIM_TYPEHASH,
                        msg.sender,
                        score,
                        startOffsetMs,
                        deadline
                    )
                )
            )
        );
        
        // Recover and verify signer
        address signer = ecrecover(digest, v, r, s);
        if (signer != owner()) {
            revert InvalidSignature();
        }
        
        // Update user state
        userLastClaimDay[msg.sender] = currentDay;
        userTotalClaims[msg.sender]++;
        nonces[msg.sender]++;
        
        // Update global claims counter
        claimsToday++;
        
        // KEY FIX: Only increase progress once per day!
        if (!stepClaimedToday) {
            globalProgress++;
            stepClaimedToday = true;
            
            // Calculate current level (10, 20, or 30)
            uint8 currentLevel = 10 + ((globalProgress - 1) / 10) * 10;
            if (currentLevel > 30) currentLevel = 30;
            
            emit GlobalProgressIncreased(globalProgress, currentLevel);
        }
        
        // Mint $EDGE
        uint256 mintAmount = EDGE_PER_CLAIM;
        if (totalSupply() + mintAmount > MAX_SUPPLY) {
            mintAmount = MAX_SUPPLY - totalSupply();
        }
        
        if (mintAmount > 0) {
            _mint(msg.sender, mintAmount);
            userTotalMinted[msg.sender] += mintAmount;
        }
        
        emit ChallengeClaimed(msg.sender, startOffsetMs, score, mintAmount, globalProgress);
    }
    
    /// @notice Advance to next day (manual or when full)
    function advanceDay() external {
        // Can advance if: 24h passed OR 10 claims reached
        if (block.timestamp < dayStartTimestamp + 1 days && claimsToday < MAX_CLAIMS_PER_DAY) {
            revert TooEarly();
        }
        
        if (currentDay >= TOTAL_DAYS) {
            return; // Evolution complete
        }
        
        uint8 yesterdayClaims = claimsToday;
        currentDay++;
        claimsToday = 0;
        stepClaimedToday = false; // Reset for new day
        dayStartTimestamp = block.timestamp;
        
        emit DayAdvanced(currentDay, yesterdayClaims, globalProgress);
    }
    
    // ============ View Functions ============
    
    /// @notice Get aspect levels - ALL aspects have the same level!
    function getAspectLevels() external view returns (
        uint8 forgeLevel,      // 10-30 (1.0-3.0)
        uint8 chargeLevel,     // 10-30
        uint8 glitchLevel,     // 10-30
        uint8 forgeProgress,   // 0-9 (within current level)
        uint8 chargeProgress,  // 0-9
        uint8 glitchProgress   // 0-9
    ) {
        // All aspects have the same level based on globalProgress
        // Level 1.0 = 10, Level 2.0 = 20, Level 3.0 = 30
        uint8 baseLevel = 10 + (globalProgress / 10) * 10;
        if (baseLevel > 30) baseLevel = 30;
        
        uint8 progress = globalProgress % 10;
        
        forgeLevel = baseLevel;
        chargeLevel = baseLevel;
        glitchLevel = baseLevel;
        forgeProgress = progress;
        chargeProgress = progress;
        glitchProgress = progress;
    }
    
    /// @notice Get user state
    function getUserState(address user) external view returns (
        uint256 totalClaims,
        uint256 totalMinted,
        bool canClaimToday,
        uint256 lastClaimDay
    ) {
        return (
            userTotalClaims[user],
            userTotalMinted[user],
            userLastClaimDay[user] != currentDay && claimsToday < MAX_CLAIMS_PER_DAY,
            userLastClaimDay[user]
        );
    }
    
    /// @notice Get global state
    function getGlobalState() external view returns (
        uint256 day,
        uint8 claimsToday_,
        uint8 claimsRemaining,
        uint8 progress,
        uint8 progressMax,
        bool evolutionComplete,
        bool canAdvanceDay
    ) {
        bool timePassed = block.timestamp >= dayStartTimestamp + 1 days;
        bool claimsFull = claimsToday >= MAX_CLAIMS_PER_DAY;
        
        return (
            currentDay,
            claimsToday,
            MAX_CLAIMS_PER_DAY - claimsToday,
            globalProgress,
            TOTAL_STEPS,
            currentDay > TOTAL_DAYS || globalProgress >= TOTAL_STEPS,
            timePassed || claimsFull
        );
    }
    
    /// @notice Get active challenge info
    function getActiveChallenge() external view returns (
        string memory trackName,
        uint256 startOffsetMs,
        uint256 endOffsetMs
    ) {
        if (trackCount == 0) revert NoActiveTracks();
        
        uint256 activeCount = 0;
        for (uint256 i = 0; i < trackCount; i++) {
            if (tracks[i].active) activeCount++;
        }
        if (activeCount == 0) revert NoActiveTracks();
        
        uint256 seed = uint256(keccak256(abi.encodePacked(currentDay, "GR1FTSWORD")));
        uint256 selectedIndex = seed % activeCount;
        
        uint256 activeIdx = 0;
        uint256 selectedTrackId = 0;
        for (uint256 i = 0; i < trackCount; i++) {
            if (tracks[i].active) {
                if (activeIdx == selectedIndex) {
                    selectedTrackId = i;
                    break;
                }
                activeIdx++;
            }
        }
        
        Track storage track = tracks[selectedTrackId];
        trackName = track.name;
        
        uint256 maxStart = track.durationMs > CHALLENGE_WINDOW_MS 
            ? track.durationMs - CHALLENGE_WINDOW_MS 
            : 0;
        startOffsetMs = maxStart > 0 ? (seed >> 128) % maxStart : 0;
        endOffsetMs = startOffsetMs + CHALLENGE_WINDOW_MS;
        
        return (trackName, startOffsetMs, endOffsetMs);
    }
    
    // ============ Admin Functions ============
    
    function addTrack(string calldata name, uint256 durationMs) external onlyOwner returns (uint256 trackId) {
        trackId = trackCount;
        tracks.push(Track({
            name: name,
            durationMs: durationMs,
            active: true
        }));
        trackCount++;
    }
    
    function setTrackActive(uint256 trackId, bool active) external onlyOwner {
        require(trackId < trackCount, "Invalid track");
        tracks[trackId].active = active;
    }
}
