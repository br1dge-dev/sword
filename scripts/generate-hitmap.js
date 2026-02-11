#!/usr/bin/env node

/**
 * Auto-generate hitmap from MP3 using beat detection
 * 
 * Usage: node scripts/generate-hitmap.js <track-name>
 * Example: node scripts/generate-hitmap.js DANGERSWORD
 */

const fs = require('fs');
const path = require('path');

// We need to use dynamic import for ESM module
async function main() {
  const trackName = process.argv[2];
  
  if (!trackName) {
    console.error('Usage: node scripts/generate-hitmap.js <TRACK_NAME>');
    console.error('Example: node scripts/generate-hitmap.js DANGERSWORD');
    process.exit(1);
  }

  const trackNameLower = trackName.toLowerCase();
  const mp3Path = path.join(__dirname, '..', 'public', 'music', `${trackName}.mp3`);
  const mp3PathAlt = path.join(__dirname, '..', 'public', 'music', `${trackNameLower}.mp3`);
  
  // Find the MP3 file
  let actualMp3Path = null;
  if (fs.existsSync(mp3Path)) {
    actualMp3Path = mp3Path;
  } else if (fs.existsSync(mp3PathAlt)) {
    actualMp3Path = mp3PathAlt;
  } else {
    console.error(`MP3 not found: ${mp3Path} or ${mp3PathAlt}`);
    process.exit(1);
  }

  console.log(`Loading: ${actualMp3Path}`);
  
  // Read MP3 file
  const audioBuffer = fs.readFileSync(actualMp3Path);
  
  // Use OfflineAudioContext for Node.js - we need a different approach
  // Since web-audio-beat-detector requires browser APIs, let's use a simpler approach
  
  console.log('');
  console.log('⚠️  Automatic beat detection requires browser Web Audio API.');
  console.log('');
  console.log('Alternative approaches:');
  console.log('');
  console.log('1. Use the hitmap-recorder.html tool in browser (recommended)');
  console.log('   - Open tools/hitmap-recorder.html');
  console.log('   - Load the MP3 and tap along to the beat');
  console.log('');
  console.log('2. Use external CLI tools:');
  console.log('   - aubio: aubiotrack -i input.mp3');
  console.log('   - librosa (Python): pip install librosa');
  console.log('   - madmom (Python): pip install madmom');
  console.log('');
  console.log('3. Generate a simple BPM-based hitmap (less accurate):');
  
  // Offer to generate a simple BPM-based hitmap
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('\nGenerate simple BPM-based hitmap? Enter BPM (or skip): ', (bpmInput) => {
    if (!bpmInput || isNaN(parseInt(bpmInput))) {
      console.log('Skipped.');
      rl.close();
      process.exit(0);
    }

    const bpm = parseInt(bpmInput);
    
    rl.question('Track duration in seconds: ', (durationInput) => {
      const duration = parseFloat(durationInput);
      
      if (isNaN(duration)) {
        console.log('Invalid duration.');
        rl.close();
        process.exit(1);
      }

      // Generate beats based on BPM
      const beatInterval = 60 / bpm; // seconds per beat
      const beats = [];
      
      for (let t = beatInterval; t < duration; t += beatInterval) {
        beats.push(parseFloat(t.toFixed(3)));
      }

      const hitmap = {
        track: `${trackNameLower}.mp3`,
        displayName: trackName.toUpperCase(),
        fullHitMap: beats,
        challengeConfig: {
          startOffset: 10,
          duration: 45,
          toleranceMs: 150
        },
        difficulty: "medium",
        totalDuration: duration
      };

      const outputPath = path.join(__dirname, '..', 'public', 'hitmaps', `${trackNameLower}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(hitmap, null, 2));
      
      console.log('');
      console.log(`✅ Generated ${outputPath}`);
      console.log(`   ${beats.length} beats at ${bpm} BPM`);
      console.log('');
      console.log('⚠️  This is a simple BPM-based hitmap.');
      console.log('   For better accuracy, use the hitmap-recorder.html tool.');
      
      rl.close();
    });
  });
}

main().catch(console.error);
