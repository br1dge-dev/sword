# Effects Summary

This document provides an overview of all visual effects in the sword application and their timing values.

## Background Effects

- **Background Pattern Update**: Changes every 3 seconds with 40% chance
- **Veins Effect**: Updates every 2000ms - (glitchLevel * 300ms)
  - Glitch chance increases with glitchLevel: 20%, 30%, 40%, 50%
  - Brief flash effect lasts 100ms

## Color Effects

- **Base Color Change**:
  - Updates every 250-400ms
  - Color change probability based on glitchLevel: 35%, 45%, 55%, 65%
  - Colors remain stable for 2-5 seconds (controlled by colorStability)
  - Uses harmonic color pairs with 4 different harmony types:
    1. Complementary with variation
    2. Darker version of complementary
    3. Analogous color (shifted on color wheel)
    4. Contrasting accent color

- **Colored Tiles**:
  - Number of clusters based on glitchLevel: 1-3, 3-5, 5-7, 8-10
  - Cluster size: 1-5 tiles, larger with higher glitchLevel

## Glow Effect

- **Pulse Effect**: Updates every 100-200ms
- **Intensity**: Random between 0.3 and 1.0

## Glitch Effects

- **DOS-Style Glitches**:
  - Updates every 200-400ms with 50% chance
  - 2-8 glitches simultaneously
  - Duration: 80ms

- **Unicode Glitches**:
  - Frequency: 500ms - (glitchLevel * 50ms)
  - Chance increases with glitchLevel: 30%, 40%, 50%, 60%
  - Number of glitches: glitchLevel * 3 + glitchLevel
  - Duration: 100ms + (glitchLevel * 20ms)

- **Blur Effect**:
  - Percentage of blurred characters based on glitchLevel: 1%, 2%, 3%

## Charge Effects

- **Edge Effects** (for thin lines):
  - Update frequency based on chargeLevel:
    - Level 1: 200ms
    - Level 2: 120ms (improved from 150ms)
    - Level 3: 100ms
  
  - Vibration intensity by chargeLevel:
    - Level 1: 0.2 (20% chance)
    - Level 2: 0.6 (60% chance, improved from 0.5)
    - Level 3: 0.8 (80% chance)
  
  - Glitch frequency by chargeLevel:
    - Level 1: 0.1 (10% chance)
    - Level 2: 0.25 (25% chance, 37.5% with multiplier)
    - Level 3: 0.4 (40% chance)
  
  - Color effect frequency by chargeLevel:
    - Level 1: 0.15 (15% chance)
    - Level 2: 0.25 (25% chance)
    - Level 3: 0.4 (40% chance)

  - Flicker behavior by chargeLevel:
    - Level 1: Complete reset
    - Level 2: Partial reset (keeps 30-70% of effects) + 3-7 new effects
    - Level 3: Complex patterns (50% chance) or complete reset

## Recent Improvements

1. **Charge Effects at Level 2**:
   - Added consistent vibration with variable intensity
   - Increased glitch probability by 50%
   - Ensured at least one effect is always applied
   - Implemented partial reset with 30-70% retention of effects
   - Added 3-7 new effects during each flicker cycle
   - Reduced update interval from 150ms to 120ms

2. **Color System**:
   - Added color stability system (2-5 seconds)
   - Implemented 4 different color harmony types
   - Prevented immediate color reversion
   - Extended color duration from 100-150ms to 250-400ms
   - Added 5 new base colors for more variety
   - Improved background-sword color relationship

3. **Background Updates**:
   - Increased update chance from 30% to 40% 