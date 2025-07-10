#!/usr/bin/env node

/**
 * Performance Analysis Script
 * 
 * Analysiert Performance-Daten und generiert detaillierte Berichte
 */

const fs = require('fs');
const path = require('path');

// Farben für Console-Output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function analyzePerformanceData(data) {
  const metrics = data.metrics;
  const summary = data.summary;
  
  console.log(colorize('\n🔍 PERFORMANCE ANALYSE', 'bright'));
  console.log(colorize('='.repeat(50), 'cyan'));
  
  // Session-Info
  console.log(colorize('\n📊 SESSION INFORMATION', 'yellow'));
  console.log(`Session ID: ${data.sessionId}`);
  console.log(`Dauer: ${(data.duration / 1000).toFixed(1)} Sekunden`);
  console.log(`Datenpunkte: ${metrics.length}`);
  
  // Performance-Übersicht
  console.log(colorize('\n⚡ PERFORMANCE ÜBERSICHT', 'yellow'));
  console.log(`Durchschnittliche FPS: ${colorize(summary.averageFps.toFixed(1), summary.averageFps >= 50 ? 'green' : summary.averageFps >= 30 ? 'yellow' : 'red')}`);
  console.log(`Min FPS: ${colorize(summary.minFps.toString(), summary.minFps >= 30 ? 'green' : 'red')}`);
  console.log(`Max FPS: ${colorize(summary.maxFps.toString(), summary.maxFps >= 55 ? 'green' : 'yellow')}`);
  console.log(`Durchschnittlicher Speicher: ${colorize(summary.averageMemory.toFixed(1) + 'MB', summary.averageMemory < 50 ? 'green' : summary.averageMemory < 100 ? 'yellow' : 'red')}`);
  console.log(`Peak Speicher: ${colorize(summary.peakMemory.toFixed(1) + 'MB', summary.peakMemory < 100 ? 'green' : 'red')}`);
  
  // Aktivitäts-Analyse
  console.log(colorize('\n🎯 AKTIVITÄTS-ANALYSE', 'yellow'));
  console.log(`Gesamte Beats: ${colorize(summary.totalBeats.toString(), 'cyan')}`);
  console.log(`Gesamte Effekte: ${colorize(summary.totalEffects.toString(), 'cyan')}`);
  
  // Performance-Probleme
  if (summary.performanceIssues.length > 0) {
    console.log(colorize('\n⚠️ PERFORMANCE-PROBLEME ERKANNT', 'red'));
    summary.performanceIssues.forEach(issue => {
      console.log(`• ${issue}`);
    });
  } else {
    console.log(colorize('\n✅ KEINE PERFORMANCE-PROBLEME ERKANNT', 'green'));
  }
  
  // Detaillierte Metriken-Analyse
  console.log(colorize('\n📈 DETAILLIERTE METRIKEN', 'yellow'));
  
  // FPS-Trend
  const fpsValues = metrics.map(m => m.fps);
  const lowFpsCount = fpsValues.filter(fps => fps < 30).length;
  const mediumFpsCount = fpsValues.filter(fps => fps >= 30 && fps < 50).length;
  const highFpsCount = fpsValues.filter(fps => fps >= 50).length;
  
  console.log(`FPS-Verteilung:`);
  console.log(`  Niedrig (<30): ${colorize(lowFpsCount.toString(), 'red')} (${((lowFpsCount / fpsValues.length) * 100).toFixed(1)}%)`);
  console.log(`  Mittel (30-49): ${colorize(mediumFpsCount.toString(), 'yellow')} (${((mediumFpsCount / fpsValues.length) * 100).toFixed(1)}%)`);
  console.log(`  Hoch (≥50): ${colorize(highFpsCount.toString(), 'green')} (${((highFpsCount / fpsValues.length) * 100).toFixed(1)}%)`);
  
  // Memory-Trend
  const memoryValues = metrics.map(m => m.memoryUsage);
  const avgMemory = memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length;
  const memoryVariance = memoryValues.reduce((sum, val) => sum + Math.pow(val - avgMemory, 2), 0) / memoryValues.length;
  const memoryStdDev = Math.sqrt(memoryVariance);
  
  console.log(`\nSpeicher-Trend:`);
  console.log(`  Durchschnitt: ${avgMemory.toFixed(1)}MB`);
  console.log(`  Standardabweichung: ${memoryStdDev.toFixed(1)}MB`);
  console.log(`  Stabilität: ${colorize(memoryStdDev < 10 ? 'Gut' : memoryStdDev < 20 ? 'Mittel' : 'Schlecht', memoryStdDev < 10 ? 'green' : memoryStdDev < 20 ? 'yellow' : 'red')}`);
  
  // Aktivitäts-Trend
  const effectRates = metrics.map(m => m.effectCount);
  const veinRates = metrics.map(m => m.veinCount);
  const glitchRates = metrics.map(m => m.glitchCount);
  
  const avgEffectRate = effectRates.reduce((a, b) => a + b, 0) / effectRates.length;
  const avgVeinRate = veinRates.reduce((a, b) => a + b, 0) / veinRates.length;
  const avgGlitchRate = glitchRates.reduce((a, b) => a + b, 0) / glitchRates.length;
  
  console.log(`\nAktivitäts-Raten (pro Sekunde):`);
  console.log(`  Effekte: ${avgEffectRate.toFixed(1)}`);
  console.log(`  Veins: ${avgVeinRate.toFixed(1)}`);
  console.log(`  Glitches: ${avgGlitchRate.toFixed(1)}`);
  
  // Empfehlungen
  console.log(colorize('\n💡 EMPFEHLUNGEN', 'yellow'));
  
  const recommendations = [];
  
  if (summary.averageFps < 50) {
    recommendations.push('FPS-Optimierung: Reduziere Effekt-Frequenz oder erhöhe Throttling');
  }
  
  if (summary.peakMemory > 100) {
    recommendations.push('Memory-Optimierung: Implementiere besseres Cleanup und reduzierte Vein-Anzahl');
  }
  
  if (avgEffectRate > 10) {
    recommendations.push('Effekt-Optimierung: Reduziere Effekt-Trigger-Frequenz');
  }
  
  if (avgVeinRate > 20) {
    recommendations.push('Vein-Optimierung: Reduziere Vein-Generierung und verbessere Cleanup');
  }
  
  if (recommendations.length === 0) {
    console.log(colorize('✅ Keine spezifischen Optimierungen erforderlich', 'green'));
  } else {
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  }
  
  // Performance-Score
  const fpsScore = Math.min(100, (summary.averageFps / 60) * 100);
  const memoryScore = Math.max(0, 100 - (summary.peakMemory / 2));
  const stabilityScore = memoryStdDev < 10 ? 100 : memoryStdDev < 20 ? 80 : 60;
  
  const overallScore = Math.round((fpsScore + memoryScore + stabilityScore) / 3);
  
  console.log(colorize('\n🏆 PERFORMANCE-SCORE', 'yellow'));
  console.log(`FPS-Score: ${colorize(fpsScore.toFixed(0) + '/100', fpsScore >= 80 ? 'green' : fpsScore >= 60 ? 'yellow' : 'red')}`);
  console.log(`Memory-Score: ${colorize(memoryScore.toFixed(0) + '/100', memoryScore >= 80 ? 'green' : memoryScore >= 60 ? 'yellow' : 'red')}`);
  console.log(`Stabilitäts-Score: ${colorize(stabilityScore.toFixed(0) + '/100', stabilityScore >= 80 ? 'green' : stabilityScore >= 60 ? 'yellow' : 'red')}`);
  console.log(`Gesamt-Score: ${colorize(overallScore + '/100', overallScore >= 80 ? 'green' : overallScore >= 60 ? 'yellow' : 'red')}`);
  
  console.log(colorize('\n' + '='.repeat(50), 'cyan'));
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(colorize('❌ Keine Datei angegeben', 'red'));
    console.log('Verwendung: node analyze-performance.js <performance-data.json>');
    process.exit(1);
  }
  
  const filePath = args[0];
  
  if (!fs.existsSync(filePath)) {
    console.log(colorize(`❌ Datei nicht gefunden: ${filePath}`, 'red'));
    process.exit(1);
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    analyzePerformanceData(data);
  } catch (error) {
    console.log(colorize(`❌ Fehler beim Lesen der Datei: ${error.message}`, 'red'));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { analyzePerformanceData }; 