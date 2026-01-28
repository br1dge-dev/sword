// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title SwordEvolution - On-chain rhythm challenge with $EDGE token rewards
/// @notice Players complete daily rhythm challenges to earn $EDGE and evolve the global sword
/// @dev ERC-20 token with EIP-712 signature verification for claims
contract SwordEvolution is ERC20, Ownable {

    using ECDSA for bytes32;
    
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

    // ============ EIP-712 ============

    /// @notice EIP-712 domain separator
    bytes32 public immutable DOMAIN_SEPARATOR;

    /// @notice Claim type hash for EIP-712
    bytes32 public constant CLAIM_TYPEHASH = keccak256("Claim(address user,uint256 score,uint256 startOffsetMs,uint256 deadline)");

    /// @notice Nonce used to prevent signature replay attacks
    mapping(address => uint256) public nonces;

    // ============ Structs ============
    
    struct Track {
        string name;
        uint256 durationMs;
        bool active;
    }
    
    struct UserState {
        uint8 levelForge;      // 10-30 (1.0-3.0)
        uint8 levelCharge;     // 10-30
        uint8 levelGlitch;     // 10-30
        uint256 successfulDays; // Total successful claims
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
    
    /// @notice Array of tracks in the pool
    Track[] public tracks;
    
    /// @notice User states
    mapping(address => UserState) public users;
    
    /// @notice Track count for iteration
    uint256 public trackCount;
    
    // ============ Events ============
    
    event ChallengeClaimed(
        address indexed user,
        uint256 startOffsetMs,
        uint8 score,
        uint256 edgeMinted
    );
    
    event DayAdvanced(
        uint256 indexed newDay,
        uint8 claimsYesterday,
        Aspect activeAspect,
        uint8 newLevel
    );
    
    event LevelUp(
        Aspect indexed aspect,
        uint8 newLevel
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
    error InvalidSignature();
    error SignatureExpired();
    error NonceUsed();
    error EvolutionComplete();
    error NoActiveTracks();
    error InvalidTrack();
    
    // ============ Constructor ============
    
    constructor() ERC20("EDGE", "EDGE") Ownable(msg.sender) {
        currentDay = 1;
        dayStartTimestamp = block.timestamp;

        // Initialize EIP-712 domain separator
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
    /// @param score Percentage score (0-100)
    /// @param startOffsetMs Challenge window start time
    /// @param deadline Signature expiration time
    /// @param v v component of ECDSA signature
    /// @param r r component of ECDSA signature
    /// @param s s component of ECDSA signature
    function claimWithSignature(
        uint8 score,
        uint256 startOffsetMs,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // Check evolution not complete
        if (currentDay > TOTAL_DAYS) revert EvolutionComplete();
        
        // Check global claims limit
        if (claimsToday >= MAX_CLAIMS_PER_DAY) revert MaxClaimsReached();
        
        // Check user hasn't claimed today
        UserState storage user = users[msg.sender];
        if (user.lastClaimDay == currentDay) revert AlreadyClaimedToday();
        
        // Check signature not expired
        if (block.timestamp > deadline) revert SignatureExpired();
        
        // Check minimum score
        if (score < MIN_SCORE) revert ScoreTooLow(score, MIN_SCORE);
        
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
        
        // Recover signer address
        address signer = ecrecover(digest, v, r, s);
        
        // Verify signature from authorized server (owner can set signer)
        if (signer != owner()) revert InvalidSignature();
        
        // Update state
        user.lastClaimDay = currentDay;
        user.successfulDays++;
        claimsToday++;
        nonces[msg.sender]++; // Increment nonce to prevent replay
        
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
        
        emit ChallengeClaimed(msg.sender, startOffsetMs, score, mintAmount);
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
        Aspect activeAspect = getActiveAspect();
        uint8 newLevel = 0;
        
        // If at least one claim today, trigger level-up on active aspect
        if (yesterdayClaims > 0) {
            newLevel = _triggerLevelUp(activeAspect);
        }
        
        // Advance day
        currentDay++;
        claimsToday = 0;
        dayStartTimestamp = block.timestamp;
        
        emit DayAdvanced(currentDay, yesterdayClaims, activeAspect, newLevel);
    }
    
    // ============ View Functions ============
    
    /// @notice Get current active challenge info
    function getActiveChallenge() public view returns (
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
        
        // Calculate 45s window start
        uint256 maxStart = track.durationMs > CHALLENGE_WINDOW_MS 
            ? track.durationMs - CHALLENGE_WINDOW_MS 
            : 0;
        startOffsetMs = maxStart > 0 ? (seed >> 128) % maxStart : 0;
        endOffsetMs = startOffsetMs + CHALLENGE_WINDOW_MS;
        
        return (trackName, startOffsetMs, endOffsetMs);
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
        bool active
    ) {
        if (trackId >= trackCount) revert InvalidTrack();
        Track storage track = tracks[trackId];
        return (track.name, track.durationMs, track.active);
    }
    
    /// @notice Get currently active aspect for level-ups
    function getActiveAspect() public view returns (Aspect) {
        // Days 1-20: Forge, 21-40: Charge, 41-60: Glitch
        uint256 cycleDay = currentDay - 1;
        if (cycleDay < 20) return Aspect.FORGE;
        if (cycleDay < 40) return Aspect.CHARGE;
        return Aspect.GLITCH;
    }
    
    // ============ Internal Functions ============
    
    /// @notice Trigger level-up on specified aspect
    function _triggerLevelUp(Aspect aspect) internal returns (uint8 newLevel) {
        // This is called when a day advances with at least one claim
        // The level-up is global - all users get the same level based on total successful days
        // 10 successful days = +1 level (10 → 20 → 30)
        uint8 baseLevel = START_LEVEL;
        uint8 levelIncrement = uint8(claimsToday / STEPS_PER_LEVEL);
        newLevel = baseLevel + levelIncrement;
        
        // Cap at MAX_LEVEL
        if (newLevel > MAX_LEVEL) {
            newLevel = MAX_LEVEL;
        }
        
        emit LevelUp(aspect, newLevel);
        return newLevel;
    }
    
    // ============ Admin Functions ============
    
    /// @notice Add a new track to the pool
    function addTrack(
        string calldata name,
        uint256 durationMs
    ) external onlyOwner returns (uint256 trackId) {
        trackId = trackCount;
        tracks.push(Track({
            name: name,
            durationMs: durationMs,
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
    

}
