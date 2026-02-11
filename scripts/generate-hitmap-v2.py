#!/usr/bin/env python3
"""
Auto-generate hitmap from MP3 using advanced onset detection

This version creates more musical, varied hitmaps by:
1. Using onset detection (not just beat tracking)
2. Filtering by onset strength (only strong hits)
3. Respecting musical dynamics (quiet sections = fewer hits)
4. Adding variation through selective beat picking

Usage: python3 scripts/generate-hitmap-v2.py <track-name>
"""

import sys
import os
import json
import librosa
import numpy as np

def generate_hitmap_v2(track_name):
    # Find MP3 file
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    possible_paths = [
        os.path.join(project_root, 'public', 'music', f'{track_name}.mp3'),
        os.path.join(project_root, 'public', 'music', f'{track_name.lower()}.mp3'),
        os.path.join(project_root, 'public', 'music', f'{track_name.upper()}.mp3'),
    ]
    
    mp3_path = None
    for path in possible_paths:
        if os.path.exists(path):
            mp3_path = path
            break
    
    if not mp3_path:
        print(f"❌ MP3 not found")
        sys.exit(1)
    
    print(f"📂 Loading: {mp3_path}")
    
    # Load audio
    y, sr = librosa.load(mp3_path, sr=22050)
    duration = librosa.get_duration(y=y, sr=sr)
    
    print(f"⏱️  Duration: {duration:.2f}s")
    
    # === ONSET DETECTION ===
    print("\n🔍 Analyzing onsets...")
    
    # Get onset envelope (shows intensity of onsets over time)
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    
    # Detect onsets with backtracking for better timing
    onset_frames = librosa.onset.onset_detect(
        y=y, sr=sr,
        onset_envelope=onset_env,
        backtrack=True,  # Adjust to actual onset start
        units='frames'
    )
    onset_times = librosa.frames_to_time(onset_frames, sr=sr)
    onset_strengths = onset_env[onset_frames]
    
    print(f"   Raw onsets: {len(onset_times)}")
    
    # === BEAT TRACKING (for reference) ===
    print("\n🥁 Analyzing beats...")
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    beat_times = librosa.frames_to_time(beat_frames, sr=sr)
    print(f"   Tempo: ~{float(tempo):.1f} BPM")
    print(f"   Beat frames: {len(beat_times)}")
    
    # === ENERGY ANALYSIS ===
    print("\n⚡ Analyzing energy dynamics...")
    
    # RMS energy over time
    rms = librosa.feature.rms(y=y)[0]
    rms_times = librosa.frames_to_time(np.arange(len(rms)), sr=sr)
    
    # Normalize RMS
    rms_norm = (rms - rms.min()) / (rms.max() - rms.min() + 1e-6)
    
    # === SMART FILTERING ===
    print("\n🎯 Filtering for musical hits...")
    
    # Strategy: Keep onsets that are:
    # 1. Strong (above median strength)
    # 2. Not too close together (min 0.15s apart)
    # 3. Weighted by local energy
    
    strength_threshold = np.percentile(onset_strengths, 50)  # Top 50% strongest
    min_interval = 0.15  # Minimum seconds between hits
    
    filtered_beats = []
    last_beat_time = -999
    
    for i, (time, strength) in enumerate(zip(onset_times, onset_strengths)):
        # Skip if too close to last beat
        if time - last_beat_time < min_interval:
            continue
        
        # Get local energy at this time
        rms_idx = np.argmin(np.abs(rms_times - time))
        local_energy = rms_norm[rms_idx]
        
        # Dynamic threshold: require stronger onsets in quiet sections
        # In loud sections (energy > 0.5), accept more onsets
        # In quiet sections (energy < 0.3), only accept very strong onsets
        if local_energy > 0.5:
            threshold = strength_threshold * 0.7  # Lower threshold in loud parts
        elif local_energy < 0.3:
            threshold = strength_threshold * 1.5  # Higher threshold in quiet parts
        else:
            threshold = strength_threshold
        
        if strength >= threshold:
            filtered_beats.append(round(float(time), 3))
            last_beat_time = time
    
    print(f"   After strength filter: {len(filtered_beats)}")
    
    # === ADD VARIATION: Skip some beats in repetitive sections ===
    print("\n🎲 Adding variation...")
    
    # Detect repetitive sections (similar intervals)
    if len(filtered_beats) > 10:
        intervals = np.diff(filtered_beats)
        
        # Find sections where intervals are very similar (repetitive)
        final_beats = [filtered_beats[0]]
        skip_probability = 0
        
        for i in range(1, len(filtered_beats)):
            current_interval = filtered_beats[i] - filtered_beats[i-1]
            
            # Check if this interval is similar to recent ones
            if i >= 3:
                recent_intervals = intervals[max(0,i-4):i-1]
                avg_recent = np.mean(recent_intervals)
                
                # If very similar to recent (repetitive section)
                if abs(current_interval - avg_recent) < 0.1:
                    skip_probability = min(skip_probability + 0.1, 0.3)  # Max 30% skip
                else:
                    skip_probability = max(skip_probability - 0.15, 0)
            
            # Randomly skip some beats in repetitive sections
            if np.random.random() > skip_probability:
                final_beats.append(filtered_beats[i])
    else:
        final_beats = filtered_beats
    
    print(f"   After variation: {len(final_beats)}")
    
    # === ANALYZE RESULT ===
    if len(final_beats) > 1:
        intervals = np.diff(final_beats)
        variation_ratio = np.std(intervals) / np.mean(intervals)
        print(f"\n📊 Result analysis:")
        print(f"   Beats: {len(final_beats)}")
        print(f"   Avg interval: {np.mean(intervals):.3f}s")
        print(f"   Variation ratio: {variation_ratio:.2f} (target: 0.3-0.7)")
    
    # === SAVE ===
    actual_filename = os.path.basename(mp3_path)
    
    hitmap = {
        "track": actual_filename,
        "displayName": track_name.upper(),
        "fullHitMap": final_beats,
        "challengeConfig": {
            "startOffset": 10,
            "duration": 45,
            "toleranceMs": 150
        },
        "difficulty": "medium",
        "totalDuration": round(duration, 2)
    }
    
    output_path = os.path.join(project_root, 'public', 'hitmaps', f'{track_name.lower()}.json')
    
    with open(output_path, 'w') as f:
        json.dump(hitmap, f, indent=2)
    
    print(f"\n💾 Saved: {output_path}")
    print(f"\n📊 First 15 beats: {final_beats[:15]}")
    
    return output_path

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/generate-hitmap-v2.py <TRACK_NAME>")
        print("\nAvailable tracks:")
        script_dir = os.path.dirname(os.path.abspath(__file__))
        music_dir = os.path.join(os.path.dirname(script_dir), 'public', 'music')
        for f in sorted(os.listdir(music_dir)):
            if f.endswith('.mp3'):
                print(f"  - {f.replace('.mp3', '')}")
        sys.exit(1)
    
    generate_hitmap_v2(sys.argv[1])
