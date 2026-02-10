// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title SwordEvolution V2 - Sequential aspect progression
/// @notice 60 days (24h each), 3 aspects, 10 days each per round, 2 rounds total
/// @dev Each day = exactly 24h. First claim of day adds +0.1 to active aspect.
///      Up to 10 users can claim $EDGE per day. Day auto-advances on next claim after 24h.
contract SwordEvolutionV2 is ERC20, Ownable {

    using ECDSA for bytes32;
    
    // ============ Constants ============
    
    uint256 public constant MAX_SUPPLY = 60_000 ether;
    uint256 public constant EDGE_BASE = 100 ether;        // Minimum EDGE for MIN_SCORE
    uint256 public constant EDGE_MAX = 200 ether;         // Maximum EDGE for perfect score (100)
    uint8 public constant MAX_CLAIMS_PER_DAY = 10;
    uint256 public constant CHALLENGE_WINDOW_MS = 45_000;
    uint8 public constant MIN_SCORE = 70;
    uint8 public constant TOTAL_DAYS = 60;
    uint8 public constant DAYS_PER_ASPECT = 10; // 10 days per aspect per round
    uint8 public constant TOTAL_ROUNDS = 3; // 3 rounds (1.0→2.0, 2.0→3.0)
    
    enum Aspect { FORGE, CHARGE, GLITCH }
    
    // ============ EIP-712 ============
    
    bytes32 public immutable DOMAIN_SEPARATOR;
    bytes32 public constant CLAIM_TYPEHASH = keccak256("Claim(address user,uint256 score,uint256 startOffsetMs,uint256 deadline)");
    mapping(address => uint256) public nonces;
    
    // ============ State Variables ============
    
    /// @notice Deployment timestamp (used to calculate current day)
    uint256 public immutable deploymentTimestamp;
    
    /// @notice Claims made in the current day (0-10)
    uint8 public claimsToday;
    
    /// @notice Was a step claimed today? (prevents multiple progress per day)
    bool public stepClaimedToday;
    
    /// @notice Which day was last processed (for claimsToday/stepClaimedToday reset)
    uint256 public lastProcessedDay;
    
    /// @notice Aspect progress: 10-30 for each aspect (internally 10 = 1.0, 30 = 3.0)
    /// forgeProgress, chargeProgress, glitchProgress
    uint8 public forgeLevel;
    uint8 public chargeLevel;
    uint8 public glitchLevel;
    
    /// @notice Track pool
    struct Track {
        string name;
        uint256 durationMs;
        bool active;
    }
    Track[] public tracks;
    uint256 public trackCount;
    
    /// @notice User data
    mapping(address => uint256) public userLastClaimDay;      // Which day user last claimed (for aspect progression)
    mapping(address => uint256) public userLastClaimTimestamp;  // Exact timestamp of last claim (for 24h cooldown)
    mapping(address => uint256) public userTotalClaims;
    mapping(address => uint256) public userTotalMinted;
    
    // ============ Events ============
    
    event ChallengeClaimed(
        address indexed user,
        uint256 startOffsetMs,
        uint8 score,
        uint256 edgeMinted,
        Aspect activeAspect,
        uint8 aspectNewLevel
    );
    
    event DayAdvanced(
        uint256 indexed newDay,
        Aspect activeAspect,
        uint8 forgeLevel,
        uint8 chargeLevel,
        uint8 glitchLevel
    );
    
    event AspectLevelUp(
        Aspect indexed aspect,
        uint8 newLevel
    );
    
    // ============ Errors ============
    
    error EvolutionComplete();
    error MaxClaimsReached();
    error AlreadyClaimedToday();
    error ScoreTooLow(uint8 score, uint8 required);
    error InvalidSignature();
    error SignatureExpired();
    error NoActiveTracks();
    
    // ============ Constructor ============
    
    constructor() ERC20("EDGE", "EDGE") Ownable(msg.sender) {
        deploymentTimestamp = block.timestamp;
        lastProcessedDay = 1;
        
        // Initialize all aspects at level 10 (1.0)
        forgeLevel = 10;
        chargeLevel = 10;
        glitchLevel = 10;
        
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
    
    // ============ Helper Functions ============
    
    /// @notice Calculate EDGE amount based on score (70-100)
    /// Score 70 = 100 EDGE, Score 100 = 200 EDGE, linear in between
    function calculateEdgeReward(uint8 score) public pure returns (uint256) {
        if (score <= MIN_SCORE) {
            return EDGE_BASE;
        }
        if (score >= 100) {
            return EDGE_MAX;
        }
        
        // Linear interpolation: BASE + (MAX - BASE) * (score - MIN) / (100 - MIN)
        uint256 bonus = (EDGE_MAX - EDGE_BASE) * (score - MIN_SCORE) / (100 - MIN_SCORE);
        return EDGE_BASE + bonus;
    }
    
    /// @notice Calculate current day based on time elapsed since deployment
    /// This ensures days progress automatically without requiring claims
    function getCurrentDay() public view returns (uint256) {
        if (block.timestamp <= deploymentTimestamp) {
            return 1;
        }
        uint256 elapsedDays = (block.timestamp - deploymentTimestamp) / 1 days;
        uint256 day = elapsedDays + 1;
        return day > TOTAL_DAYS ? TOTAL_DAYS + 1 : day; // Cap at TOTAL_DAYS + 1 (evolution complete)
    }
    
    /// @notice Get currently active aspect based on day
    function getActiveAspect() public view returns (Aspect) {
        uint256 currentDay = getCurrentDay();
        if (currentDay > TOTAL_DAYS) {
            return Aspect.GLITCH; // Default when evolution complete
        }
        uint8 dayInCycle = uint8((currentDay - 1) % 30); // 0-29
        
        if (dayInCycle < 10) {
            return Aspect.FORGE; // Days 1-10, 31-40, 51-60
        } else if (dayInCycle < 20) {
            return Aspect.CHARGE; // Days 11-20, 41-50
        } else {
            return Aspect.GLITCH; // Days 21-30, 51-60 (wait, that's wrong)
        }
    }
    
    /// @notice Get current round (0, 1, or 2)
    function getCurrentRound() public view returns (uint8) {
        uint256 currentDay = getCurrentDay();
        if (currentDay > TOTAL_DAYS) {
            return 2; // Last round when evolution complete
        }
        return uint8((currentDay - 1) / 30); // 0, 1, or 2
    }
    
    /// @notice Internal function to sync state when day changes
    /// Resets daily counters if we've entered a new day
    function _syncDay() internal {
        uint256 actualCurrentDay = getCurrentDay();
        
        if (actualCurrentDay != lastProcessedDay) {
            // We've entered a new day - reset daily counters
            claimsToday = 0;
            stepClaimedToday = false;
            lastProcessedDay = actualCurrentDay;
        }
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
        // Sync day state (resets counters if we've entered a new day)
        _syncDay();
        
        uint256 currentDay = getCurrentDay();
        
        // Check evolution not complete
        if (currentDay > TOTAL_DAYS) {
            revert EvolutionComplete();
        }
        
        // Check global claims limit
        if (claimsToday >= MAX_CLAIMS_PER_DAY) {
            revert MaxClaimsReached();
        }
        
        // Check user hasn't claimed in the last 24 hours (strict cooldown)
        if (block.timestamp < userLastClaimTimestamp[msg.sender] + 1 days) {
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
        userLastClaimTimestamp[msg.sender] = block.timestamp;
        userTotalClaims[msg.sender]++;
        nonces[msg.sender]++;
        
        // Update global claims counter
        claimsToday++;
        
        // KEY: Only increase aspect level once per day!
        Aspect activeAspect = getActiveAspect();
        uint8 aspectNewLevel = 0;
        
        if (!stepClaimedToday) {
            stepClaimedToday = true;
            
            // Increase the active aspect by 1 (0.1 level)
            if (activeAspect == Aspect.FORGE && forgeLevel < 30) {
                forgeLevel++;
                aspectNewLevel = forgeLevel;
                
                // Check for level up event (every 10 steps)
                if (forgeLevel % 10 == 0) {
                    emit AspectLevelUp(Aspect.FORGE, forgeLevel);
                }
            } else if (activeAspect == Aspect.CHARGE && chargeLevel < 30) {
                chargeLevel++;
                aspectNewLevel = chargeLevel;
                
                if (chargeLevel % 10 == 0) {
                    emit AspectLevelUp(Aspect.CHARGE, chargeLevel);
                }
            } else if (activeAspect == Aspect.GLITCH && glitchLevel < 30) {
                glitchLevel++;
                aspectNewLevel = glitchLevel;
                
                if (glitchLevel % 10 == 0) {
                    emit AspectLevelUp(Aspect.GLITCH, glitchLevel);
                }
            }
        }
        
        // Mint $EDGE based on score
        uint256 mintAmount = calculateEdgeReward(score);
        if (totalSupply() + mintAmount > MAX_SUPPLY) {
            mintAmount = MAX_SUPPLY - totalSupply();
        }
        
        if (mintAmount > 0) {
            _mint(msg.sender, mintAmount);
            userTotalMinted[msg.sender] += mintAmount;
        }
        
        emit ChallengeClaimed(
            msg.sender, 
            startOffsetMs, 
            score, 
            mintAmount, 
            activeAspect,
            aspectNewLevel
        );
    }
    
    // ============ View Functions ============
    
    /// @notice Get all aspect levels and which is currently active
    function getAspectLevels() external view returns (
        uint8 forgeLevel_,      // 10-30 (1.0-3.0)
        uint8 chargeLevel_,     // 10-30
        uint8 glitchLevel_,     // 10-30
        uint8 forgeProgress,    // 0-9 within current level
        uint8 chargeProgress,   // 0-9
        uint8 glitchProgress,   // 0-9
        Aspect activeAspect,
        uint8 daysRemainingInAspect // How many days left for current aspect
    ) {
        forgeLevel_ = forgeLevel;
        chargeLevel_ = chargeLevel;
        glitchLevel_ = glitchLevel;
        
        // Progress within current level (0-9)
        forgeProgress = (forgeLevel - 1) % 10;
        chargeProgress = (chargeLevel - 1) % 10;
        glitchProgress = (glitchLevel - 1) % 10;
        
        activeAspect = getActiveAspect();
        
        // Calculate days remaining in current aspect phase
        uint256 currentDay = getCurrentDay();
        uint8 dayInCycle = uint8((currentDay - 1) % 30);
        if (dayInCycle < 10) {
            daysRemainingInAspect = 10 - dayInCycle;
        } else if (dayInCycle < 20) {
            daysRemainingInAspect = 20 - dayInCycle;
        } else {
            daysRemainingInAspect = 30 - dayInCycle;
        }
    }
    
    /// @notice Get user state
    function getUserState(address user) external view returns (
        uint256 totalClaims,
        uint256 totalMinted,
        bool canClaimToday,
        uint256 lastClaimDay
    ) {
        bool cooldownPassed = block.timestamp >= userLastClaimTimestamp[user] + 1 days;
        bool hasClaimsRemaining = claimsToday < MAX_CLAIMS_PER_DAY;
        
        return (
            userTotalClaims[user],
            userTotalMinted[user],
            cooldownPassed && hasClaimsRemaining,
            userLastClaimDay[user]
        );
    }
    
    /// @notice Get global state
    function getGlobalState() external view returns (
        uint256 day,
        uint8 claimsToday_,
        uint8 claimsRemaining,
        Aspect activeAspect,
        uint8 currentRound, // 0, 1, or 2
        bool evolutionComplete,
        bool canAdvanceDay
    ) {
        uint256 currentDay = getCurrentDay();
        bool claimsFull = claimsToday >= MAX_CLAIMS_PER_DAY;
        
        return (
            currentDay,
            claimsToday,
            MAX_CLAIMS_PER_DAY - claimsToday,
            getActiveAspect(),
            getCurrentRound(),
            currentDay > TOTAL_DAYS,
            claimsFull
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
        
        uint256 seed = uint256(keccak256(abi.encodePacked(getCurrentDay(), "GR1FTSWORD")));
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
