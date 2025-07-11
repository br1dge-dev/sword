/**
 * effectManager.ts
 * 
 * Zentraler Manager für Audio-reaktive Effekte.
 * Verbindet Audio-Analyse mit verschiedenen visuellen Effekten.
 * OPTIMIERT: Callback-Batching, effizientere Datenstrukturen, Caching
 */
import { useAudioReactionStore } from '@/store/audioReactionStore';
import { useEffect, useRef } from 'react';

// Effekttypen
export enum EffectType {
  COLOR = 'color',
  GLITCH = 'glitch',
  BACKGROUND = 'background',
  VEINS = 'veins',
  TILES = 'tiles'
}

// Effekt-Prioritäten (höhere Zahl = höhere Priorität)
export const EffectPriority = {
  [EffectType.COLOR]: 3,
  [EffectType.GLITCH]: 4,
  [EffectType.BACKGROUND]: 1,
  [EffectType.VEINS]: 2,
  [EffectType.TILES]: 2
};

// Effekt-Reaktivitätsparameter
export interface EffectReactivity {
  // Schwellenwert für Energie, ab dem der Effekt ausgelöst wird
  energyThreshold: number;
  
  // Wie stark der Effekt auf Energie reagiert (0-1)
  energySensitivity: number;
  
  // Ob der Effekt auf Beats reagiert
  reactsToBeats: boolean;
  
  // Wie stark der Effekt auf Beats reagiert (0-1)
  beatSensitivity: number;
  
  // Minimale Zeit zwischen Effektauslösungen in ms
  cooldown: number;
  
  // Wie lange der Effekt anhält in ms
  duration: number;
}

// Standard-Reaktivitätsparameter für verschiedene Effekttypen
export const DefaultReactivity: Record<EffectType, EffectReactivity> = {
  [EffectType.COLOR]: {
    energyThreshold: 0.15,
    energySensitivity: 1.0,
    reactsToBeats: true,
    beatSensitivity: 1.0,
    cooldown: 200,
    duration: 1000
  },
  [EffectType.GLITCH]: {
    energyThreshold: 0.2,
    energySensitivity: 1.0,
    reactsToBeats: true,
    beatSensitivity: 1.0,
    cooldown: 100,
    duration: 160
  },
  [EffectType.BACKGROUND]: {
    energyThreshold: 0.15,
    energySensitivity: 0.8,
    reactsToBeats: true,
    beatSensitivity: 0.5,
    cooldown: 1500,
    duration: 0
  },
  [EffectType.VEINS]: {
    energyThreshold: 0.1,
    energySensitivity: 0.9,
    reactsToBeats: true,
    beatSensitivity: 1.0,
    cooldown: 250,
    duration: 1000
  },
  [EffectType.TILES]: {
    energyThreshold: 0.15,
    energySensitivity: 1.0,
    reactsToBeats: true,
    beatSensitivity: 1.0,
    cooldown: 200,
    duration: 800
  }
};

// Effekt-Konfiguration
export interface EffectConfig {
  type: EffectType;
  reactivity: EffectReactivity;
  enabled: boolean;
  lastTriggered: number;
  intensity: number; // 0-1
  isActive: boolean;
  activeUntil: number;
}

// Effekt-Callback-Typ
export type EffectCallback = (intensity: number, type: EffectType) => void;

// Globaler EffectManager für die gesamte Anwendung
export let globalEffectManager: EffectManager | undefined = undefined;

// OPTIMIERT: Drastische Performance-Optimierungen für Render-Zeit-Katastrophe
const MAX_CALLBACKS_PER_TYPE = 5; // Reduziert von 10 auf 5

// OPTIMIERT: Reduzierte Speicherbereinigung für bessere Performance
const MEMORY_CLEANUP_INTERVAL = 120000; // 120 Sekunden (erhöht von 60s)

// OPTIMIERT: Cache für Energie-Berechnungen
interface EnergyCache {
  energy: number;
  energyFactors: Map<EffectType, number>;
  lastUpdate: number;
}

// OPTIMIERT: Batch-Updates für Callbacks
interface BatchUpdate {
  type: EffectType;
  intensity: number;
  timestamp: number;
}

// OPTIMIERT: Effizientere Callback-Struktur mit Set statt Array
const callbackRegistry = new Map<string, { callback: EffectCallback, unregister: () => void }>();

// ENTFERNT: Logging-Variablen (lastLogTime, LOG_THROTTLE_INTERVAL)

// DEAKTIVIERT: Logging-Funktion
// const throttledLog = (message: string, force: boolean = false) => {
//   const now = Date.now();
//   if (force || now - lastLogTime > LOG_THROTTLE_INTERVAL) {
//     console.log(`[EffectManager] ${message}`);
//     lastLogTime = now;
//   }
// };

// Effekt-Manager-Klasse
export class EffectManager {
  private effects: Map<EffectType, EffectConfig> = new Map();
  // OPTIMIERT: Set statt Array für effizientere Callback-Verwaltung
  private callbacks: Map<EffectType, Set<EffectCallback>> = new Map();
  private animationFrameId: number | null = null;
  private lastUpdateTime: number = 0;
  private lastBeatTime: number = 0;
  private isRunning: boolean = false;
  private lastLogTime: number = 0;
  private debugMode: boolean = false;
  private callbackIds: Map<EffectCallback, string> = new Map();
  private lastMemoryCheck: number = 0;
  
  // OPTIMIERT: Cache für Energie-Berechnungen
  private energyCache: EnergyCache = {
    energy: 0,
    energyFactors: new Map(),
    lastUpdate: 0
  };
  
  // OPTIMIERT: Batch-Updates für Callbacks
  private batchUpdates: BatchUpdate[] = [];
  private lastBatchTime: number = 0;
  private batchTimeout: number | null = null;
  
  // OPTIMIERT: Memory-Leak-Prävention
  private isDisposed: boolean = false;
  private lastActiveCheck: number = 0;
  private activeCheckInterval: number = 10000; // 10 Sekunden

  constructor() {
    // Initialisiere Effekte mit Standardwerten
    Object.values(EffectType).forEach(type => {
      this.effects.set(type, {
        type,
        reactivity: DefaultReactivity[type],
        enabled: true,
        lastTriggered: 0,
        intensity: 0,
        isActive: false,
        activeUntil: 0
      });
      // OPTIMIERT: Set statt Array
      this.callbacks.set(type, new Set());
    });
    
    // Setze globalen EffectManager
    globalEffectManager = this;
    
    // throttledLog('EffectManager initialized', true);
  }

  // Generiere eine eindeutige ID für einen Callback
  private generateCallbackId(type: EffectType, callback: EffectCallback): string {
    if (!this.callbackIds.has(callback)) {
      const id = `${type}_${Math.random().toString(36).substring(2, 9)}`;
      this.callbackIds.set(callback, id);
    }
    return this.callbackIds.get(callback)!;
  }

  // OPTIMIERT: Effizientere Callback-Registrierung
  public registerCallback(type: EffectType, callback: EffectCallback): () => void {
    const callbackId = this.generateCallbackId(type, callback);
    
    if (callbackRegistry.has(callbackId)) {
      // throttledLog(`Callback ${callbackId} already registered for effect type: ${type}`);
      return callbackRegistry.get(callbackId)!.unregister;
    }
    
    const callbacks = this.callbacks.get(type) || new Set();
    
    // Begrenze die Anzahl der Callbacks pro Typ
    if (callbacks.size >= MAX_CALLBACKS_PER_TYPE) {
      // throttledLog(`Maximum number of callbacks (${MAX_CALLBACKS_PER_TYPE}) reached for effect type: ${type}. Removing oldest.`);
      
      // Entferne den ersten Callback (FIFO)
      const firstCallback = callbacks.values().next().value;
      if (firstCallback) {
        callbacks.delete(firstCallback);
        // Entferne auch aus der Registry und der ID-Map
        for (const [id, entry] of Array.from(callbackRegistry.entries())) {
          if (entry.callback === firstCallback) {
            callbackRegistry.delete(id);
            break;
          }
        }
        this.callbackIds.delete(firstCallback);
      }
    }
    
    callbacks.add(callback);
    this.callbacks.set(type, callbacks);
    
    // throttledLog(`Registered callback for effect type: ${type}, total callbacks: ${callbacks.size}`);

    const unregister = () => {
      const currentCallbacks = this.callbacks.get(type) || new Set();
      currentCallbacks.delete(callback);
      this.callbacks.set(type, currentCallbacks);
      
      callbackRegistry.delete(callbackId);
      this.callbackIds.delete(callback);
      
      // throttledLog(`Removed callback for effect type: ${type}, remaining callbacks: ${currentCallbacks.size}`);
    };
    
    callbackRegistry.set(callbackId, { callback, unregister });
    
    return unregister;
  }

  // Aktiviere oder deaktiviere einen Effekttyp
  public setEffectEnabled(type: EffectType, enabled: boolean): void {
    const effect = this.effects.get(type);
    if (effect) {
      effect.enabled = enabled;
      this.effects.set(type, effect);
      // throttledLog(`Effect ${type} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  // Passe Reaktivitätsparameter für einen Effekttyp an
  public updateReactivity(type: EffectType, reactivity: Partial<EffectReactivity>): void {
    const effect = this.effects.get(type);
    if (effect) {
      effect.reactivity = { ...effect.reactivity, ...reactivity };
      this.effects.set(type, effect);
      // OPTIMIERT: Cache invalidieren bei Reaktivitätsänderung
      this.energyCache.energyFactors.delete(type);
      // throttledLog(`Updated reactivity for effect type: ${type}`);
    }
  }

  public start(): void {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    this.lastUpdateTime = performance.now();
    this.update();
    
    // throttledLog('EffectManager started', true);
  }

  public stop(): void {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // OPTIMIERT: Batch-Timeout aufräumen
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    
    // throttledLog('EffectManager stopped', true);
  }

  public dispose(): void {
    this.stop();
    
    // OPTIMIERT: Alle Callbacks aufräumen
    this.callbacks.clear();
    this.callbackIds.clear();
    this.batchUpdates = [];
    
    // OPTIMIERT: Batch-Timeout aufräumen
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    
    this.isDisposed = true;
    globalEffectManager = undefined;
    
    // throttledLog('EffectManager disposed', true);
  }

  // OPTIMIERT: Debug-Logging mit Throttling
  private debugLog(message: string): void {
    if (this.debugMode) {
      // throttledLog(message);
    }
  }

  // OPTIMIERT: Effizientere Speicherbereinigung
  private performMemoryCleanup(): void {
    const now = Date.now();
    if (now - this.lastMemoryCheck < MEMORY_CLEANUP_INTERVAL) return;
    
    this.lastMemoryCheck = now;
    
    // OPTIMIERT: Reduzierte Cleanup-Frequenz für bessere Performance
    let cleanedUp = 0;
    
    for (const type of Object.values(EffectType)) {
      const callbacks = this.callbacks.get(type) || new Set();
      
      // OPTIMIERT: Effizientere Filterung mit Set
      const validCallbacks = new Set<EffectCallback>();
      for (const callback of Array.from(callbacks)) {
        let exists = false;
        for (const [_, entry] of Array.from(callbackRegistry.entries())) {
          if (entry.callback === callback) {
            exists = true;
            break;
          }
        }
        
        if (exists) {
          validCallbacks.add(callback);
        } else {
          this.callbackIds.delete(callback);
          cleanedUp++;
        }
      }
      
      if (validCallbacks.size !== callbacks.size) {
        this.callbacks.set(type, validCallbacks);
      }
    }
    
    if (cleanedUp > 0) {
      // throttledLog(`Memory cleanup: removed ${cleanedUp} orphaned callbacks`);
    }
    
    // OPTIMIERT: Effizientere Registry-Bereinigung
    if (callbackRegistry.size > MAX_CALLBACKS_PER_TYPE * Object.values(EffectType).length) {
      const entriesToRemove = Array.from(callbackRegistry.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(0, callbackRegistry.size - MAX_CALLBACKS_PER_TYPE * Object.values(EffectType).length);
      
      entriesToRemove.forEach(([id, _]) => {
        callbackRegistry.delete(id);
      });
      
      // throttledLog(`Registry cleanup: removed ${entriesToRemove.length} old registry entries`);
    }
  }

  // OPTIMIERT: Cache für Energie-Faktoren
  private getEnergyFactor(energy: number, effect: EffectConfig): number {
    const cacheKey = effect.type;
    
    // Prüfe Cache
    if (this.energyCache.energy === energy && this.energyCache.energyFactors.has(cacheKey)) {
      return this.energyCache.energyFactors.get(cacheKey)!;
    }
    
    // Berechne neuen Faktor
    const energyRange = 1 - effect.reactivity.energyThreshold;
    const normalizedEnergy = (energy - effect.reactivity.energyThreshold) / energyRange;
    const energyFactor = Math.min(1, Math.sqrt(normalizedEnergy));
    
    // Aktualisiere Cache
    this.energyCache.energy = energy;
    this.energyCache.energyFactors.set(cacheKey, energyFactor);
    this.energyCache.lastUpdate = performance.now();
    
    return energyFactor;
  }

  // OPTIMIERT: Batch-Update-Verarbeitung
  private scheduleBatchUpdate(type: EffectType, intensity: number): void {
    this.batchUpdates.push({
      type,
      intensity,
      timestamp: performance.now()
    });
    
    // OPTIMIERT: Batch-Timeout nur setzen, wenn noch keiner läuft
    if (!this.batchTimeout) {
      this.batchTimeout = window.setTimeout(() => {
        this.executeBatchUpdates();
        this.batchTimeout = null;
      }, 16); // 16ms = 60fps
    }
  }

  // OPTIMIERT: Batch-Updates ausführen
  private executeBatchUpdates(): void {
    if (this.batchUpdates.length === 0) return;
    
    const now = performance.now();
    const callbacksToExecute = new Map<EffectType, number>();
    
    // OPTIMIERT: Batch-Updates gruppieren
    for (const update of this.batchUpdates) {
      const currentIntensity = callbacksToExecute.get(update.type) || 0;
      callbacksToExecute.set(update.type, Math.max(currentIntensity, update.intensity));
    }
    
    // OPTIMIERT: Callbacks in Batches ausführen
    for (const [type, intensity] of Array.from(callbacksToExecute.entries())) {
      const callbacks = this.callbacks.get(type);
      if (callbacks) {
        for (const callback of Array.from(callbacks)) {
          try {
            callback(intensity, type);
          } catch (error) {
            // DEAKTIVIERT: Logging
            // console.error(`Error in effect callback for ${type}:`, error);
          }
        }
      }
    }
    
    this.batchUpdates = [];
  }

  // OPTIMIERT: Haupt-Update-Loop mit niedriger Latenz für visuellen Impact
  private update(): void {
    if (!this.isRunning || this.isDisposed) {
      return;
    }
    
    // OPTIMIERT: Reduzierte Speicherbereinigung
    this.performMemoryCleanup();
    
    const now = performance.now();
    const deltaTime = now - this.lastUpdateTime;
    
    // OPTIMIERT: Niedrige Latenz für visuellen Impact (15fps statt 5fps)
    if (deltaTime < 67) { // 67ms = ~15fps (zurück von 200ms für bessere Reaktivität)
      this.animationFrameId = requestAnimationFrame(() => this.update());
      return;
    }
    
    this.lastUpdateTime = now;

    try {
      // Hole Audio-Daten aus dem Store
      const { energy, beatDetected, lastBeatTime } = useAudioReactionStore.getState();
      
      // OPTIMIERT: Früher Exit wenn keine Änderungen und keine aktiven Effekte
      const hasActiveEffects = Array.from(this.effects.values()).some(effect => effect.isActive);
      if (energy === 0 && !beatDetected && this.batchUpdates.length === 0 && !hasActiveEffects) {
        // OPTIMIERT: Direkter requestAnimationFrame statt setTimeout für bessere Performance
        this.animationFrameId = requestAnimationFrame(() => this.update());
        return;
      }
      
      const isBeatNew = lastBeatTime > this.lastBeatTime;
      if (isBeatNew) {
        this.lastBeatTime = lastBeatTime;
      }

      // OPTIMIERT: Ausgewogene Effekt-Aktualisierung für visuellen Impact
      let hasUpdates = false;
      let updateCount = 0;
      const MAX_UPDATES_PER_FRAME = 2; // Zurück zu 2 Updates pro Frame für besseren visuellen Impact
    
    for (const [type, effect] of Array.from(this.effects.entries())) {
      if (!effect.enabled || updateCount >= MAX_UPDATES_PER_FRAME) continue;

        // Prüfe, ob der Effekt aktiv ist und ggf. deaktivieren
        if (effect.isActive && now > effect.activeUntil) {
          effect.isActive = false;
          effect.intensity = 0;
          
          // OPTIMIERT: Batch-Callback für Deaktivierung
          this.scheduleBatchUpdate(type, 0);
          hasUpdates = true;
          updateCount++;
          continue;
        }

        let shouldTrigger = false;
        let triggerIntensity = 0;

        // OPTIMIERT: Verwende Cache für Energie-Berechnung
        if (energy >= effect.reactivity.energyThreshold) {
          const energyFactor = this.getEnergyFactor(energy, effect);
          triggerIntensity = Math.max(triggerIntensity, energyFactor * effect.reactivity.energySensitivity);
          shouldTrigger = true;
        }

        // Prüfe Beat-Trigger
        if ((beatDetected || isBeatNew) && effect.reactivity.reactsToBeats) {
          const beatIntensity = effect.reactivity.beatSensitivity * (1 + energy * 0.5);
          triggerIntensity = Math.max(triggerIntensity, beatIntensity);
          shouldTrigger = true;
        }

        // Prüfe Cooldown
        if (shouldTrigger && now - effect.lastTriggered >= effect.reactivity.cooldown) {
          effect.lastTriggered = now;
          effect.isActive = true;
          
          if (effect.intensity > 0) {
            effect.intensity = Math.min(1, effect.intensity + triggerIntensity * 0.5); // Reduziert von 0.7 auf 0.5
          } else {
            effect.intensity = triggerIntensity;
          }
          
          const durationMultiplier = 0.3 + effect.intensity * 0.5; // Reduziert von 0.5+0.75 auf 0.3+0.5
          effect.activeUntil = now + (effect.reactivity.duration * durationMultiplier);

          // OPTIMIERT: Batch-Callback für Aktivierung
          this.scheduleBatchUpdate(type, effect.intensity);
          hasUpdates = true;
          updateCount++;
        }
      }

      // OPTIMIERT: Reduzierte Batch-Update-Verarbeitung
      if (hasUpdates && this.batchUpdates.length > 0) {
        this.executeBatchUpdates();
      }

      // OPTIMIERT: Direkter requestAnimationFrame statt setTimeout für bessere Performance
      this.animationFrameId = requestAnimationFrame(() => this.update());
      
    } catch (error) {
      // DEAKTIVIERT: Logging
      // console.error('EffectManager update error:', error);
      this.animationFrameId = requestAnimationFrame(() => this.update());
    }
  }

  // OPTIMIERT: Effizientere manuelle Effekt-Auslösung
  public triggerEffect(type: EffectType, intensity: number = 1.0, duration: number = 0): void {
    if (!this.isRunning || this.isDisposed) return;
    
    const effect = this.effects.get(type);
    if (!effect || !effect.enabled) return;
    
    const now = performance.now();
    
    // OPTIMIERT: Cooldown-Prüfung
    if (now - effect.lastTriggered < effect.reactivity.cooldown) {
      return;
    }
    
    effect.lastTriggered = now;
    effect.isActive = true;
    effect.intensity = Math.min(1, effect.intensity + intensity * 0.3);
    effect.activeUntil = now + (effect.reactivity.duration * (0.3 + effect.intensity * 0.5));
    
    // OPTIMIERT: Batch-Update für bessere Performance
    this.scheduleBatchUpdate(type, effect.intensity);
    
    // throttledLog(`Effect ${type} triggered: ${intensity.toFixed(2)}`);
  }
  
  // OPTIMIERT: Effizientere Übersicht
  public getEffectsOverview(): Record<string, { enabled: boolean, callbackCount: number }> {
    const overview: Record<string, { enabled: boolean, callbackCount: number }> = {};
    
    for (const [type, effect] of Array.from(this.effects.entries())) {
      const callbacks = this.callbacks.get(type) || new Set();
      overview[type] = {
        enabled: effect.enabled,
        callbackCount: callbacks.size
      };
    }
    
    return overview;
  }
  
  // OPTIMIERT: Debug-Modus umschalten
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    // throttledLog(`Debug mode ${enabled ? 'enabled' : 'disabled'}`, true);
  }
  
  // OPTIMIERT: Alle Callbacks löschen
  public clearAllCallbacks(): void {
    this.callbacks.clear();
    this.callbackIds.clear();
    // throttledLog('All effect callbacks cleared', true);
  }

  // OPTIMIERT: Callback-Registry löschen
  public clearCallbackRegistry(): void {
    callbackRegistry.clear();
    // throttledLog('Effect callback registry cleared', true);
  }
}

// React Hook für die Verwendung des EffectManagers
export function useEffectManager(
  type: EffectType,
  callback: EffectCallback,
  customReactivity?: Partial<EffectReactivity>
): void {
  const callbackRef = useRef<EffectCallback>(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  useEffect(() => {
    if (!globalEffectManager) {
      // DEAKTIVIERT: Logging
      // console.warn('No global EffectManager instance found, creating one');
      globalEffectManager = new EffectManager();
      globalEffectManager.start();
    }
    
    const stableCallback: EffectCallback = (intensity, effectType) => {
      callbackRef.current(intensity, effectType);
    };
    
    const unregister = globalEffectManager.registerCallback(type, stableCallback);
    
    if (customReactivity) {
      globalEffectManager.updateReactivity(type, customReactivity);
    }
    
    return () => {
      unregister();
    };
  }, [type, customReactivity]);
} 