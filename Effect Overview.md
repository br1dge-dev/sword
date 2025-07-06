# Effect Overview

This document provides an overview of all visual effects in the sword application and their timing values, organized by the affected elements.

## Implementation Structure

The visual effects are mainly implemented in the following files:

- **src/components/ascii/sword-modules/AsciiSwordModular.tsx**: Main component for the ASCII sword with all visual effects
- **src/components/ascii/sword-modules/effects/backgroundEffects.ts**: Background generation and veins effects
- **src/store/powerUpStore.ts**: State management for level, charge, and glitch effects
- **src/components/ui/ChargeProgressBar.tsx**: Component for the charge progress display
- **src/components/ui/GlitchProgressBar.tsx**: Component for the glitch progress display
- **src/app/page.tsx**: Contains the effect tracking logic and categorization with rate-limited logging

## Dependencies

- **State**: The effects are controlled by various state variables:
  - `currentLevel`: Sword level (1-3)
  - `chargeLevel`: Charge level (1-3)
  - `glitchLevel`: Glitch level (1-3)

- **Libraries**:
  - `zustand`: For state management
  - `zustand/middleware/persist`: For persistent storage of effect states

## 1. Background Layer Effects

### Pattern Generation
- **Background Pattern Update**: 
  - Fixed interval of 10 seconds
  - Full pattern regeneration with new random parameters
  - Uses simplified character sets without complex symbols (no clocks, hourglasses, etc.)
  - Logged with timestamp as `[BACKGROUND] Scheduled pattern update (10s interval)`

### Veins Effect
- **Colored Veins**: 
  - Fixed interval of 4 seconds
  - Additional subtle updates with 60% chance every 1200ms - (glitchLevel * 200ms)
  - Glitch chance increases with glitchLevel
  - Logged with timestamp as `[VEINS] Scheduled wave pattern update (4s interval)`

### Temporary Glitch Pattern
- **Pattern Shift**:
  - Fixed interval of 5 seconds
  - Applies a temporary pattern followed by a new pattern after 120ms
  - Logged with timestamp as `[BACKGROUND] Temporary glitch pattern applied (5s interval)`

### Background Color
- **Base Color Change**:
  - Interval depends on glitchLevel:
    - Level 1: 7 seconds
    - Level 2: 5 seconds
    - Level 3: 3 seconds
  - Color change probability based on glitchLevel: 88%, 91%, 94%, 97% (extremely high chance)
  - Colors remain stable for 0.3-1.5 seconds (controlled by colorStability)
  - Uses harmonic color pairs with 4 different harmony types
  - Logged with timestamp as `[COLOR_CHANGE]` with color values and stability duration

## 2. Sword Effects

### Base Effects
- **Glow Effect**: 
  - Updates every 100-200ms
  - Intensity: Random between 0.3 and 1.0
  - Logged with timestamp as `[GLOW]` with intensity value

- **Colored Tiles**:
  - Fixed interval of 2 seconds
  - Number of clusters based on glitchLevel: 2, 4, 7, 10
  - Cluster size: 2-8 tiles, larger with higher glitchLevel
  - Logged with timestamp as `[TILES]` with count of tiles and clusters

### Glitch Effects
- **DOS-Style Glitches**:
  - Updates every 200-400ms with 50% chance
  - 2-10 glitches simultaneously
  - Duration: 80ms (shortened for more aggressive effect)
  - Logged with timestamp as `[GLITCH]` with count of applied characters

- **Unicode Glitches**:
  - Frequency: 500ms - (glitchLevel * 50ms)
  - Chance increases with glitchLevel: 30%, 40%, 50%, 60%
  - Number of glitches: glitchLevel * 3 + glitchLevel
  - Duration: 100ms + (glitchLevel * 20ms)
  - Logged with timestamp as `[UNICODE]` with count of applied glitches

- **Skew Effect**:
  - Active from glitchLevel 2
  - Percentage of skewed characters: 0.5% * glitchLevel
  - Angle: -5° to +5°
  - Updates every 300ms

- **Opacity Effect**:
  - Active from glitchLevel 3
  - Percentage of transparent characters: 0.3% * glitchLevel
  - Transparency: 70-100%
  - Updates every 400ms

### Edge Effects
- **Edge Glitches** (for thin lines):
  - Update frequency based on chargeLevel:
    - Level 1: 200ms
    - Level 2: 70ms
    - Level 3: 100ms
  
  - Vibration intensity by chargeLevel:
    - Level 1: 0.2 (20% chance)
    - Level 2: 0.6 (60% chance)
    - Level 3: 0.8 (80% chance)
  
  - Glitch frequency by chargeLevel:
    - Level 1: 0.1 (10% chance)
    - Level 2: 0.25 (25% chance, 37.5% with multiplier)
    - Level 3: 0.4 (40% chance)
  
  - Color effect frequency by chargeLevel:
    - Level 1: 0.15 (15% chance)
    - Level 2: 0.25 (25% chance)
    - Level 3: 0.4 (40% chance)

  - Guaranteed effect at level 2+:
    - If no effects were applied randomly, one effect is guaranteed
    - Logged with timestamp as `[EDGE]` with counts of vibrations, glitches, and colors

## 3. UI Elements

### Progress Bars
- **Charge Progress Bar**:
  - Implemented in src/components/ui/ChargeProgressBar.tsx
  - Displays current charge level and progress
  - Visual effects increase with higher charge levels

- **Glitch Progress Bar**:
  - Implemented in src/components/ui/GlitchProgressBar.tsx
  - Displays current glitch level and progress
  - Visual distortions increase with higher glitch levels

- **Forge Progress Bar**:
  - Implemented in src/components/ui/ForgeProgressBar.tsx
  - Displays current forge progress for level upgrades

### Buttons
- **Glitch Button**:
  - Implemented in src/components/ui/GlitchButton.tsx
  - Triggers glitch level increase when clicked
  - Visual effects match current glitch state

- **Cleanse Button**:
  - Implemented in src/components/ui/CleanseButton.tsx
  - Resets effects when clicked

### Music Player
- **Audio Controls**:
  - Implemented in src/components/ui/MusicPlayer.tsx
  - 4 available tracks: GR1FTSWORD, FLASHWORD, FUNKSWORD, ATARISWORD
  - Progress display with 10 tiles

## 4. System Components

### Logging System
- **Timestamp Format**: HH:MM:SS in ISO format
- **Rate Limiting**: Each effect type is logged at most once per second (1000ms)
- **First Occurrence**: Always logs the first occurrence of each effect type
- **Color Coding**:
  - Background Updates: Green (#00AA55)
  - Veins Updates: Blue (#44AAFF)
  - Temporary Glitch Effects: Pink (#FF3EC8)
  - Glow Effects: Yellow (#FFFF00)
  - Color Changes: Cyan (#00FCA6)
  - Tile Colorization: Pink (#FF3EC8)
  - Glitch Effects: Orange (#FF5500)
  - Edge Effects: Light Blue (#00CCFF)
  - Unicode Glitches: Magenta (#FF00FF)
  - Cleanup Events: White (#FFFFFF)

- **Log Content**:
  - Success/failure status
  - Count of applied effects
  - Parameter values (intensity, duration, etc.)
  - Probability calculations when relevant
  - Occurrence counter (e.g., #1, #2, etc.)

### State Management
- **PowerUpStore**:
  - Manages all state related to power-ups and effects
  - Persists state between sessions using localStorage
  - Provides actions for increasing levels and progress

## Recent Improvements

1. **Timing System Overhaul**:
   - Changed from frame-based to fixed time intervals
   - Improved predictability and consistency of effects
   - Added comprehensive logging with timestamps
   - Separated overlapping effects for better debugging

2. **Background Updates**:
   - Increased background pattern interval to 10 seconds
   - Fixed interval of 4s for veins updates
   - Fixed interval of 5s for temporary glitch patterns
   - Removed blur effects from background layer
   - Added detailed logging for all background events
   - Removed complex symbols (clocks, hourglasses, keyboards) from background

3. **Color Effects Improvements**:
   - Base color change intervals now depend on glitchLevel (7s, 5s, 3s)
   - Colored tiles update at fixed 2-second intervals
   - Improved type handling for glitch characters

4. **Logging System**:
   - Added timestamps to all logs
   - Implemented rate limiting (max once per second per effect type)
   - Consistent color coding by effect type
   - Detailed information about effect parameters
   - Logging of both successful and skipped effects 
   - Simplified overview summary to reduce memory usage 