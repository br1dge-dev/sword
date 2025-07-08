// Audio-Analyse Web Worker
// Diese Datei wird in einem separaten Thread ausgeführt

interface AudioWorkerMessage {
  type: 'analyze' | 'initialize' | 'stop';
  data?: {
    frequencies?: Uint8Array;
    energyThreshold?: number;
    beatSensitivity?: number;
  };
}

interface AudioWorkerResponse {
  type: 'energy' | 'beat' | 'error';
  data: {
    energy?: number;
    beatTime?: number;
    error?: string;
  };
}

// Worker-Kontext
const ctx: Worker = self as any;

// Zustandsvariablen
let isAnalyzing = false;
let lastBeatTime = 0;
let energyThreshold = 0.1;
let beatSensitivity = 1.2;
let lastAnalyzeTime = 0;
let analyzeInterval = 50;

// Energieberechnung mit Frequenzgewichtung
function calculateEnergy(frequencies: Uint8Array): number {
  let weightedSum = 0;
  let totalWeight = 0;
  
  // Frequenzbereiche und Gewichtungen definieren (Bass stärker gewichten)
  const lowRange = { start: 0, end: 10, weight: 3.0 };    // Bass (0-200 Hz)
  const midRange = { start: 10, end: 30, weight: 1.5 };   // Mitten (200-600 Hz)
  const highRange = { start: 30, end: 255, weight: 0.5 }; // Höhen (600+ Hz)
  
  // Niedrige Frequenzen (Bass)
  for (let i = lowRange.start; i < lowRange.end; i++) {
    weightedSum += frequencies[i] * lowRange.weight;
    totalWeight += lowRange.weight;
  }
  
  // Mittlere Frequenzen
  for (let i = midRange.start; i < midRange.end; i++) {
    weightedSum += frequencies[i] * midRange.weight;
    totalWeight += midRange.weight;
  }
  
  // Hohe Frequenzen (nur jeden 4. Wert für Performance)
  for (let i = highRange.start; i < highRange.end; i += 4) {
    weightedSum += frequencies[i] * highRange.weight;
    totalWeight += highRange.weight;
  }
  
  // Gewichteten Durchschnitt berechnen und normalisieren (0-1)
  return weightedSum / (totalWeight * 255);
}

// Beat-Erkennung
function detectBeat(energy: number, currentTime: number): boolean {
  if (energy > energyThreshold) {
    const timeSinceLastBeat = currentTime - lastBeatTime;
    
    // Mindestens 150ms zwischen Beats
    if (timeSinceLastBeat > 150) {
      const beatIntensity = energy / energyThreshold;
      
      if (beatIntensity > beatSensitivity) {
        lastBeatTime = currentTime;
        return true;
      }
    }
  }
  return false;
}

// Hauptanalyse-Funktion
function analyze(frequencies: Uint8Array) {
  if (!isAnalyzing) return;
  
  const now = performance.now();
  const timeSinceLastAnalyze = now - lastAnalyzeTime;
  
  // Nur analysieren, wenn das Intervall überschritten wurde
  if (timeSinceLastAnalyze >= analyzeInterval) {
    try {
      // Energie berechnen
      const energy = calculateEnergy(frequencies);
      
      // Beat-Erkennung
      const beatDetected = detectBeat(energy, now);
      
      // Ergebnisse an den Hauptthread senden
      if (energy > 0) {
        ctx.postMessage({
          type: 'energy',
          data: { energy }
        } as AudioWorkerResponse);
      }
      
      if (beatDetected) {
        ctx.postMessage({
          type: 'beat',
          data: { beatTime: now }
        } as AudioWorkerResponse);
      }
      
      lastAnalyzeTime = now;
    } catch (error) {
      ctx.postMessage({
        type: 'error',
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      } as AudioWorkerResponse);
    }
  }
  
  // Nächste Analyse planen
  if (isAnalyzing) {
    setTimeout(() => {
      // Hier würden wir normalerweise neue Frequenzdaten erhalten
      // Für jetzt verwenden wir die letzten Daten
    }, analyzeInterval);
  }
}

// Message-Handler
ctx.addEventListener('message', (event: MessageEvent<AudioWorkerMessage>) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'initialize':
      if (data) {
        energyThreshold = data.energyThreshold || 0.1;
        beatSensitivity = data.beatSensitivity || 1.2;
      }
      isAnalyzing = true;
      console.log('Audio worker initialized');
      break;
      
    case 'analyze':
      if (data?.frequencies) {
        analyze(data.frequencies);
      }
      break;
      
    case 'stop':
      isAnalyzing = false;
      console.log('Audio worker stopped');
      break;
      
    default:
      console.warn('Unknown message type:', type);
  }
});

// Worker-Initialisierung
console.log('Audio worker loaded'); 