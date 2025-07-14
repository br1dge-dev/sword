#!/usr/bin/env node

/**
 * Batch Track Analyzer
 * 
 * Analysiert alle Tracks im music-Verzeichnis und generiert Konfigurationen.
 * 
 * Usage: node scripts/analyzeAllTracks.js
 */

const fs = require('fs');
const path = require('path');
const TrackAnalyzer = require('./trackAnalyzer');

async function analyzeAllTracks() {
  console.log('🎵 Batch-Track-Analyse gestartet...\n');
  
  const musicDir = path.join(__dirname, '..', 'public', 'music');
  const analyzer = new TrackAnalyzer();
  
  try {
    // Lade alle MP3-Dateien
    const files = fs.readdirSync(musicDir)
      .filter(file => file.endsWith('.mp3'))
      .sort();
    
    console.log(`📁 Gefundene Tracks: ${files.length}\n`);
    
    const results = [];
    
    for (const file of files) {
      const trackPath = path.join(musicDir, file);
      console.log(`\n🎵 Analysiere: ${file}`);
      console.log('─'.repeat(50));
      
      try {
        const config = await analyzer.analyzeTrack(trackPath);
        results.push(config);
        console.log(`✅ ${file} erfolgreich analysiert`);
      } catch (error) {
        console.error(`❌ Fehler bei ${file}:`, error.message);
      }
    }
    
    // Erstelle Index-Datei mit allen Konfigurationen
    createIndexFile(results);
    
    console.log(`\n🎉 Batch-Analyse abgeschlossen! ${results.length}/${files.length} Tracks erfolgreich analysiert.`);
    
  } catch (error) {
    console.error('💥 Fehler bei der Batch-Analyse:', error.message);
    process.exit(1);
  }
}

function createIndexFile(results) {
  const indexPath = path.join(__dirname, '..', 'src', 'config', 'tracks', 'index.json');
  
  const index = {
    generatedAt: new Date().toISOString(),
    totalTracks: results.length,
    tracks: results.map(config => ({
      trackId: config.trackId,
      trackPath: config.trackPath,
      analysisDate: config.analysisDate,
      config: config.config,
      metadata: config.metadata
    }))
  };
  
  // Erstelle Verzeichnis falls es nicht existiert
  const configDir = path.dirname(indexPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  // Speichere Index
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`📋 Index-Datei erstellt: ${indexPath}`);
}

// Führe aus wenn direkt aufgerufen
if (require.main === module) {
  analyzeAllTracks();
}

module.exports = { analyzeAllTracks }; 