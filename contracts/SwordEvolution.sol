// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title SwordEvolution - On-chain rhythm challenge with $EDGE token rewards
/// @notice Players complete daily rhythm challenges to earn $EDGE and evolve the global sword
/// @dev Single contract: ERC-20 token + challenge verification + level progression
contract SwordEvolution is ERC20, Ownable {
    
    // ============ Constants ============
    
    /// @notice Maximum $EDGE supply: 60,000 (60 days × 10 claims × 100 EDGE)
    uint256 public constant MAX_SUPPLY = 60_000 ether;
    
    /// @notice $EDGE minted per successful claim
    uint256 public constant EDGE_PER_CLAIM = 100 ether;
    
    /// @notice Maximum claims per day (global)
    uint8 public constant MAX_CLAIMS_PER_DAY = 10;
    
    /// @notice Challenge window duration in milliseconds
    uint256 public constant CHALLENGE_WINDOW_MS = 45_000;
    
    /// @notice Minimum score to pass challenge (70%)
    uint8 public constant MIN_SCORE = 70;
    
    /// @notice Steps required per level-up (10 successful days = +1 level)
    uint8 public constant STEPS_PER_LEVEL = 10;
    
    /// @notice Maximum level per aspect (3.0 = 30 internally)
    uint8 public constant MAX_LEVEL = 30;
    
    /// @notice Starting level per aspect (1.0 = 10 internally)
    uint8 public constant START_LEVEL = 10;
    
    /// @notice Total evolution days
    uint8 public constant TOTAL_DAYS = 60;
    
    // ============ Enums ============
    
    enum Aspect { FORGE, CHARGE, GLITCH }
    
    // ============ Structs ============
    
    struct Track {
        string name;
        uint256 durationMs;
        bytes32 merkleRoot;
        bool active;
    }
    
    struct UserState {
        uint8 levelForge;      // 10-30 (1.0-3.0)
        uint8 levelCharge;     // 10-30
        uint8 levelGlitch;     // 10-30
        uint256 totalMinted;   // Total $EDGE minted to user
        uint256 lastClaimDay;  // Prevents double-claim same day
    }
    
    // ============ State Variables ============
    
    /// @notice Current evolution day (1-60)
    uint256 public currentDay;
    
    /// @notice Claims made today (resets at advanceDay)
    uint8 public claimsToday;
    
    /// @notice Timestamp when current day started
    uint256 public dayStartTimestamp;
    
    /// @notice Whether at least one successful claim happened today
    bool public hasClaimToday;
    
    /// @notice Array of tracks in the pool
    Track[] public tracks;
    
    /// @notice User states
    mapping(address => UserState) public users;
    
    /// @notice Track count for iteration
    uint256 public trackCount;
    
    // ============ Events ============
    
    event ChallengeClaimed(
        address indexed user,
        uint256 indexed trackId,
        uint256 startOffsetMs,
        uint8 score,
        uint256 edgeMinted
    );
    
    event LevelUp(
        address indexed user,
        Aspect indexed aspect,
        uint8 newLevel
    );
    
    event DayAdvanced(
        uint256 indexed newDay,
        uint8 claimsYesterday,
        bool levelUpTriggered
    );
    
    event TrackAdded(
        uint256 indexed trackId,
        string name,
        uint256 durationMs
    );
    
    // ============ Errors ============
    
    error MaxClaimsReached();
    error AlreadyClaimedToday();
    error ScoreTooLow(uint8 score, uint8 required);
    error InvalidProof();
    error EvolutionComplete();
    error NoActiveTracks();
    error InvalidTrack();
    
    // ============ Constructor ============
    
    constructor() ERC20("EDGE", "EDGE") Ownable(msg.sender) {
        currentDay = 1;
        dayStartTimestamp = block.timestamp;
    }
    
    // ============ Core Functions ============
    
    /// @notice Claim a challenge completion
    /// @param merkleProof Proof of valid hits within the 45s window
    /// @param score Percentage score (0-100)
    function claimChallenge(
        bytes32[] calldata merkleProof,
        uint8 score
    ) external {
        // Check evolution not complete
        if (currentDay > TOTAL_DAYS) revert EvolutionComplete();
        
        // Check global claims limit
        if (claimsToday >= MAX_CLAIMS_PER_DAY) revert MaxClaimsReached();
        
        // Check user hasn't claimed today
        UserState storage user = users[msg.sender];
        if (user.lastClaimDay == currentDay) revert AlreadyClaimedToday();
        
        // Check minimum score
        if (score < MIN_SCORE) revert ScoreTooLow(score, MIN_SCORE);
        
        // Get active challenge
        (uint256 trackId, , uint256 startOffsetMs, ) = getActiveChallenge();
        Track storage track = tracks[trackId];
        
        // Verify merkle proof
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, score, startOffsetMs));
        if (!MerkleProof.verify(merkleProof, track.merkleRoot, leaf)) {
            revert InvalidProof();
        }
        
        // Update state
        user.lastClaimDay = currentDay;
        claimsToday++;
        hasClaimToday = true;
        
        // Initialize levels if first claim
        if (user.levelForge == 0) {
            user.levelForge = START_LEVEL;
            user.levelCharge = START_LEVEL;
            user.levelGlitch = START_LEVEL;
        }
        
        // Mint $EDGE
        uint256 mintAmount = EDGE_PER_CLAIM;
        if (totalSupply() + mintAmount > MAX_SUPPLY) {
            mintAmount = MAX_SUPPLY - totalSupply();
        }
        
        if (mintAmount > 0) {
            _mint(msg.sender, mintAmount);
            user.totalMinted += mintAmount;
        }
        
        emit ChallengeClaimed(msg.sender, trackId, startOffsetMs, score, mintAmount);
    }
    
    /// @notice Advance to next evolution day
    /// @dev Can be called by anyone, but only advances if 24h passed
    function advanceDay() external {
        // Check if 24 hours have passed
        require(block.timestamp >= dayStartTimestamp + 1 days, "Too early");
        
        // Check if evolution is complete
        if (currentDay >= TOTAL_DAYS) {
            revert EvolutionComplete();
        }
        
        uint8 yesterdayClaims = claimsToday;
        bool levelUp = hasClaimToday;
        
        // If at least one claim today, trigger level-up on active aspect
        if (levelUp) {
            Aspect activeAspect = getActiveAspect();
            _triggerLevelUp(activeAspect);
        }
        
        // Advance day
        currentDay++;
        claimsToday = 0;
        hasClaimToday = false;
        dayStartTimestamp = block.timestamp;
        
        emit DayAdvanced(currentDay, yesterdayClaims, levelUp);
    }
    
    // ============ View Functions ============
    
    /// @notice Get current active challenge info
    function getActiveChallenge() public view returns (
        uint256 trackId,
        string memory trackName,
        uint256 startOffsetMs,
        uint256 endOffsetMs
    ) {
        if (trackCount == 0) revert NoActiveTracks();
        
        // Count active tracks
        uint256 activeCount = 0;
        for (uint256 i = 0; i < trackCount; i++) {
            if (tracks[i].active) activeCount++;
        }
        if (activeCount == 0) revert NoActiveTracks();
        
        // Pseudo-random seed from current day
        uint256 seed = uint256(keccak256(abi.encodePacked(currentDay, "GR1FTSWORD")));
        
        // Select track
        uint256 selectedIndex = seed % activeCount;
        uint256 activeIdx = 0;
        for (uint256 i = 0; i < trackCount; i++) {
            if (tracks[i].active) {
                if (activeIdx == selectedIndex) {
                    trackId = i;
                    break;
                }
                activeIdx++;
            }
        }
        
        Track storage track = tracks[trackId];
        trackName = track.name;
        
        // Calculate 45s window start
        uint256 maxStart = track.durationMs > CHALLENGE_WINDOW_MS 
            ? track.durationMs - CHALLENGE_WINDOW_MS 
            : 0;
        startOffsetMs = maxStart > 0 ? (seed >> 128) % maxStart : 0;
        endOffsetMs = startOffsetMs + CHALLENGE_WINDOW_MS;
        
        return (trackId, trackName, startOffsetMs, endOffsetMs);
    }
    
    /// @notice Get currently active aspect for level-ups
    function getActiveAspect() public view returns (Aspect) {
        // Days 1-10: Forge, 11-20: Charge, 21-30: Glitch
        // Days 31-40: Forge (L2), 41-50: Charge (L2), 51-60: Glitch (L2)
        uint256 cycleDay = ((currentDay - 1) % 30);
        if (cycleDay < 10) return Aspect.FORGE;
        if (cycleDay < 20) return Aspect.CHARGE;
        return Aspect.GLITCH;
    }
    
    /// @notice Get user's current state
    function getUserState(address userAddr) external view returns (
        uint8 levelForge,
        uint8 levelCharge,
        uint8 levelGlitch,
        uint256 totalMinted,
        bool canClaimToday
    ) {
        UserState storage user = users[userAddr];
        levelForge = user.levelForge > 0 ? user.levelForge : START_LEVEL;
        levelCharge = user.levelCharge > 0 ? user.levelCharge : START_LEVEL;
        levelGlitch = user.levelGlitch > 0 ? user.levelGlitch : START_LEVEL;
        totalMinted = user.totalMinted;
        canClaimToday = user.lastClaimDay != currentDay && claimsToday < MAX_CLAIMS_PER_DAY;
    }
    
    /// @notice Get global state
    function getGlobalState() external view returns (
        uint256 evolutionDay,
        uint8 claimsMadeToday,
        uint8 claimsRemaining,
        Aspect activeAspect,
        bool evolutionComplete
    ) {
        evolutionDay = currentDay;
        claimsMadeToday = claimsToday;
        claimsRemaining = currentDay <= TOTAL_DAYS ? MAX_CLAIMS_PER_DAY - claimsToday : 0;
        activeAspect = getActiveAspect();
        evolutionComplete = currentDay > TOTAL_DAYS;
    }
    
    /// @notice Check if specific user can claim today
    function canClaim(address userAddr) external view returns (bool) {
        if (currentDay > TOTAL_DAYS) return false;
        if (claimsToday >= MAX_CLAIMS_PER_DAY) return false;
        if (users[userAddr].lastClaimDay == currentDay) return false;
        return true;
    }
    
    /// @notice Get remaining claims for today
    function remainingClaimsToday() external view returns (uint8) {
        if (currentDay > TOTAL_DAYS) return 0;
        return MAX_CLAIMS_PER_DAY - claimsToday;
    }
    
    /// @notice Get track info
    function getTrack(uint256 trackId) external view returns (
        string memory name,
        uint256 durationMs,
        bytes32 merkleRoot,
        bool active
    ) {
        if (trackId >= trackCount) revert InvalidTrack();
        Track storage track = tracks[trackId];
        return (track.name, track.durationMs, track.merkleRoot, track.active);
    }
    
    // ============ Admin Functions ============
    
    /// @notice Add a new track to the pool
    function addTrack(
        string calldata name,
        uint256 durationMs,
        bytes32 merkleRoot
    ) external onlyOwner returns (uint256 trackId) {
        trackId = trackCount;
        tracks.push(Track({
            name: name,
            durationMs: durationMs,
            merkleRoot: merkleRoot,
            active: true
        }));
        trackCount++;
        
        emit TrackAdded(trackId, name, durationMs);
    }
    
    /// @notice Toggle track active status
    function setTrackActive(uint256 trackId, bool active) external onlyOwner {
        if (trackId >= trackCount) revert InvalidTrack();
        tracks[trackId].active = active;
    }
    
    /// @notice Update track merkle root (for fixes only)
    function updateTrackMerkleRoot(uint256 trackId, bytes32 newRoot) external onlyOwner {
        if (trackId >= trackCount) revert InvalidTrack();
        tracks[trackId].merkleRoot = newRoot;
    }
    
    // ============ Internal Functions ============
    
    /// @notice Trigger level-up on specified aspect
    function _triggerLevelUp(Aspect aspect) internal {
        // Level-up is global (affects all future users' starting state conceptually)
        // For individual users, they get levels based on when they started
        // This is a simplified version - the level-up is tracked via events
        
        emit LevelUp(address(0), aspect, 0); // Global level-up event
    }
}
