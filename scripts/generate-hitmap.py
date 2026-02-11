#!/usr/bin/env python3
"""
Auto-generate hitmap from MP3 using librosa beat detection

Usage: python3 scripts/generate-hitmap.py <track-name>
Example: python3 scripts/generate-hitmap.py DANGERSWORD
"""

import sys
import os
import json
import librosa
import numpy as np

def generate_hitmap(track_name):
    # Find MP3 file
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    # Try different filename cases
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
        print(f"❌ MP3 not found. Tried:")
        for p in possible_paths:
            print(f"   {p}")
        sys.exit(1)
    
    print(f"📂 Loading: {mp3_path}")
    
    # Load audio file
    y, sr = librosa.load(mp3_path, sr=22050)
    duration = librosa.get_duration(y=y, sr=sr)
    
    print(f"⏱️  Duration: {duration:.2f}s")
    print(f"🎵 Sample rate: {sr}Hz")
    print()
    print("🔍 Detecting beats...")
    
    # Beat detection using librosa
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    beat_times = librosa.frames_to_time(beat_frames, sr=sr)
    
    # Convert to list and round to 3 decimal places
    beats = [round(float(t), 3) for t in beat_times]
    
    print(f"🎯 Detected {len(beats)} beats at ~{float(tempo):.1f} BPM")
    
    # Also detect onsets (more detailed than beats)
    print()
    print("🔍 Detecting onsets (for comparison)...")
    onset_frames = librosa.onset.onset_detect(y=y, sr=sr)
    onset_times = librosa.frames_to_time(onset_frames, sr=sr)
    print(f"🎯 Detected {len(onset_times)} onsets")
    
    # Ask user which to use
    print()
    print("Options:")
    print(f"  1. Beats only ({len(beats)} hits) - cleaner, follows tempo")
    print(f"  2. Onsets only ({len(onset_times)} hits) - more detailed, every note")
    print(f"  3. Combined & deduplicated - best of both")
    
    choice = input("\nChoose (1/2/3) [default: 1]: ").strip() or "1"
    
    if choice == "2":
        final_beats = [round(float(t), 3) for t in onset_times]
    elif choice == "3":
        # Combine and deduplicate (remove onsets within 100ms of a beat)
        combined = set(beats)
        for onset in onset_times:
            onset_rounded = round(float(onset), 3)
            # Check if there's already a beat within 100ms
            is_duplicate = any(abs(onset_rounded - b) < 0.1 for b in combined)
            if not is_duplicate:
                combined.add(onset_rounded)
        final_beats = sorted(combined)
    else:
        final_beats = beats
    
    print(f"\n✅ Using {len(final_beats)} hits")
    
    # Get actual filename for track field
    actual_filename = os.path.basename(mp3_path)
    
    # Create hitmap JSON
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
    
    # Save to file
    output_path = os.path.join(project_root, 'public', 'hitmaps', f'{track_name.lower()}.json')
    
    with open(output_path, 'w') as f:
        json.dump(hitmap, f, indent=2)
    
    print(f"\n💾 Saved: {output_path}")
    print(f"   {len(final_beats)} beats, {duration:.2f}s duration")
    
    # Show first few beats
    print(f"\n📊 First 10 beats: {final_beats[:10]}")
    
    return output_path

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/generate-hitmap.py <TRACK_NAME>")
        print("Example: python3 scripts/generate-hitmap.py DANGERSWORD")
        print()
        print("Available tracks:")
        script_dir = os.path.dirname(os.path.abspath(__file__))
        music_dir = os.path.join(os.path.dirname(script_dir), 'public', 'music')
        for f in sorted(os.listdir(music_dir)):
            if f.endswith('.mp3'):
                print(f"  - {f.replace('.mp3', '')}")
        sys.exit(1)
    
    track_name = sys.argv[1]
    generate_hitmap(track_name)
