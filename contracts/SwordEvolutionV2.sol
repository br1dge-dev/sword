// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title SwordEvolution V2 - Sequential aspect progression
/// @notice 60 days, 3 aspects, 10 days each per round, 3 rounds total
/// @dev Each day with ≥1 claim adds +0.1 to current active aspect
contract SwordEvolutionV2 is ERC20, Ownable {

    using ECDSA for bytes32;
    
    // ============ Constants ============
    
    uint256 public constant MAX_SUPPLY = 60_000 ether;
    uint256 public constant EDGE_PER_CLAIM = 100 ether;
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
    
    /// @notice Current day (1-60)
    uint256 public currentDay;
    
    /// @notice Claims made today (0-10)
    uint8 public claimsToday;
    
    /// @notice Was a step claimed today? (prevents multiple progress per day)
    bool public stepClaimedToday;
    
    /// @notice When current day started
    uint256 public dayStartTimestamp;
    
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
    mapping(address => uint256) public userLastClaimDay;
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
    error TooEarly();
    error NoActiveTracks();
    
    // ============ Constructor ============
    
    constructor() ERC20("EDGE", "EDGE") Ownable(msg.sender) {
        currentDay = 1;
        dayStartTimestamp = block.timestamp;
        
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
    
    /// @notice Get currently active aspect based on day
    function getActiveAspect() public view returns (Aspect) {
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
        return uint8((currentDay - 1) / 30); // 0, 1, or 2
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
        if (currentDay > TOTAL_DAYS) {
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
                "\x19\01",
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
        
        // Mint $EDGE
        uint256 mintAmount = EDGE_PER_CLAIM;
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
    
    /// @notice Advance to next day
    function advanceDay() external {
        // Can advance if: 24h passed OR 10 claims reached
        if (block.timestamp < dayStartTimestamp + 1 days && claimsToday < MAX_CLAIMS_PER_DAY) {
            revert TooEarly();
        }
        
        if (currentDay >= TOTAL_DAYS) {
            return; // Evolution complete
        }
        
        currentDay++;
        claimsToday = 0;
        stepClaimedToday = false;
        dayStartTimestamp = block.timestamp;
        
        emit DayAdvanced(currentDay, getActiveAspect(), forgeLevel, chargeLevel, glitchLevel);
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
        Aspect activeAspect,
        uint8 currentRound, // 0, 1, or 2
        bool evolutionComplete,
        bool canAdvanceDay
    ) {
        bool timePassed = block.timestamp >= dayStartTimestamp + 1 days;
        bool claimsFull = claimsToday >= MAX_CLAIMS_PER_DAY;
        
        return (
            currentDay,
            claimsToday,
            MAX_CLAIMS_PER_DAY - claimsToday,
            getActiveAspect(),
            getCurrentRound(),
            currentDay > TOTAL_DAYS,
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
