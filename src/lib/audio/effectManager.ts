/**
 * effectManager.ts
 * 
 * Zentraler Manager für Audio-reaktive Effekte.
 * Verbindet Audio-Analyse mit verschiedenen visuellen Effekten.
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
    energyThreshold: 0.15, // Reduziert von 0.25 auf 0.15
    energySensitivity: 1.0, // Erhöht von 0.8 auf 1.0
    reactsToBeats: true,
    beatSensitivity: 1.0, // Erhöht von 0.9 auf 1.0
    cooldown: 200, // Reduziert von 300 auf 200
    duration: 1000
  },
  [EffectType.GLITCH]: {
    energyThreshold: 0.2, // Reduziert von 0.35 auf 0.2
    energySensitivity: 1.0, // Unverändert
    reactsToBeats: true,
    beatSensitivity: 1.0,
    cooldown: 100, // Reduziert von 160 auf 100
    duration: 160
  },
  [EffectType.BACKGROUND]: {
    energyThreshold: 0.15, // Reduziert von 0.2 auf 0.15
    energySensitivity: 0.8, // Erhöht von 0.6 auf 0.8
    reactsToBeats: true, // Geändert von false auf true
    beatSensitivity: 0.5, // Erhöht von 0.3 auf 0.5
    cooldown: 1500, // Reduziert von 2000 auf 1500
    duration: 0
  },
  [EffectType.VEINS]: {
    energyThreshold: 0.1, // Reduziert von 0.15 auf 0.1
    energySensitivity: 0.9, // Erhöht von 0.7 auf 0.9
    reactsToBeats: true,
    beatSensitivity: 1.0, // Erhöht von 0.8 auf 1.0
    cooldown: 250, // Reduziert von 400 auf 250
    duration: 1000
  },
  [EffectType.TILES]: {
    energyThreshold: 0.15, // Reduziert von 0.3 auf 0.15
    energySensitivity: 1.0, // Erhöht von 0.9 auf 1.0
    reactsToBeats: true,
    beatSensitivity: 1.0, // Unverändert
    cooldown: 200, // Reduziert von 300 auf 200
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
export let globalEffectManager: EffectManager;

// Speichere Callback-Referenzen, um doppelte Registrierungen zu vermeiden
const callbackRegistry = new Map<string, { callback: EffectCallback, unregister: () => void }>();

// Maximale Anzahl von Callbacks pro Effekttyp
const MAX_CALLBACKS_PER_TYPE = 10;

// Zeit zwischen Speicherbereinigungen in ms
const MEMORY_CLEANUP_INTERVAL = 30000; // 30 Sekunden

// Effekt-Manager-Klasse
export class EffectManager {
  private effects: Map<EffectType, EffectConfig> = new Map();
  private callbacks: Map<EffectType, EffectCallback[]> = new Map();
  private animationFrameId: number | null = null;
  private lastUpdateTime: number = 0;
  private lastBeatTime: number = 0;
  private isRunning: boolean = false;
  private lastLogTime: number = 0;
  private debugMode: boolean = false;
  private callbackIds: Map<EffectCallback, string> = new Map();
  private lastMemoryCheck: number = 0;

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
      this.callbacks.set(type, []);
    });
    
    // Setze globalen EffectManager
    globalEffectManager = this;
  }

  // Generiere eine eindeutige ID für einen Callback
  private generateCallbackId(type: EffectType, callback: EffectCallback): string {
    // Verwende eine zufällige ID, falls keine existiert
    if (!this.callbackIds.has(callback)) {
      const id = `${type}_${Math.random().toString(36).substring(2, 9)}`;
      this.callbackIds.set(callback, id);
    }
    return this.callbackIds.get(callback)!;
  }

  // Registriere einen Callback für einen Effekttyp
  public registerCallback(type: EffectType, callback: EffectCallback): () => void {
    const callbackId = this.generateCallbackId(type, callback);
    
    // Prüfe, ob dieser Callback bereits registriert ist
    if (callbackRegistry.has(callbackId)) {
      this.debugLog(`Callback ${callbackId} already registered for effect type: ${type}`);
      return callbackRegistry.get(callbackId)!.unregister;
    }
    
    const callbacks = this.callbacks.get(type) || [];
    
    // Begrenze die Anzahl der Callbacks pro Typ
    if (callbacks.length >= MAX_CALLBACKS_PER_TYPE) {
      this.debugLog(`Maximum number of callbacks (${MAX_CALLBACKS_PER_TYPE}) reached for effect type: ${type}. Removing oldest.`);
      
      // Entferne den ältesten Callback
      const oldestCallback = callbacks.shift();
      if (oldestCallback) {
        // Entferne auch aus der Registry und der ID-Map
        for (const [id, entry] of Array.from(callbackRegistry.entries())) {
          if (entry.callback === oldestCallback) {
            callbackRegistry.delete(id);
            break;
          }
        }
        
        // Entferne aus der ID-Map
        this.callbackIds.delete(oldestCallback);
      }
    }
    
    callbacks.push(callback);
    this.callbacks.set(type, callbacks);
    
    // Log registrierte Callbacks
    this.debugLog(`Registered callback for effect type: ${type}, total callbacks: ${callbacks.length}`);

    // Rückgabefunktion zum Entfernen des Callbacks
    const unregister = () => {
      const currentCallbacks = this.callbacks.get(type) || [];
      const filteredCallbacks = currentCallbacks.filter(cb => cb !== callback);
      this.callbacks.set(type, filteredCallbacks);
      
      // Entferne aus der Registry
      callbackRegistry.delete(callbackId);
      this.callbackIds.delete(callback);
      
      this.debugLog(`Removed callback for effect type: ${type}, remaining callbacks: ${filteredCallbacks.length}`);
    };
    
    // Speichere in der Registry
    callbackRegistry.set(callbackId, { callback, unregister });
    
    return unregister;
  }

  // Aktiviere oder deaktiviere einen Effekttyp
  public setEffectEnabled(type: EffectType, enabled: boolean): void {
    const effect = this.effects.get(type);
    if (effect) {
      effect.enabled = enabled;
      this.effects.set(type, effect);
      this.debugLog(`Effect ${type} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  // Passe Reaktivitätsparameter für einen Effekttyp an
  public updateReactivity(type: EffectType, reactivity: Partial<EffectReactivity>): void {
    const effect = this.effects.get(type);
    if (effect) {
      effect.reactivity = { ...effect.reactivity, ...reactivity };
      this.effects.set(type, effect);
      this.debugLog(`Updated reactivity for effect type: ${type}`);
    }
  }

  // Starte den Effekt-Manager
  public start(): void {
    if (this.animationFrameId === null && !this.isRunning) {
      this.isRunning = true;
      this.lastUpdateTime = performance.now();
      this.update();
      console.log('EffectManager started');
    }
  }

  // Stoppe den Effekt-Manager
  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.isRunning = false;
    console.log('EffectManager stopped');
  }

  // Debug-Logging mit Ratenbegrenzung
  private debugLog(message: string): void {
    if (!this.debugMode) return;
    
    const now = Date.now();
    if (now - this.lastLogTime > 1000) { // Max. 1 Log pro Sekunde
      console.log(`[EffectManager] ${message}`);
      this.lastLogTime = now;
    }
  }

  // Regelmäßige Speicherbereinigung
  private performMemoryCleanup(): void {
    const now = Date.now();
    // Nur alle 30 Sekunden prüfen
    if (now - this.lastMemoryCheck < MEMORY_CLEANUP_INTERVAL) return;
    
    this.lastMemoryCheck = now;
    
    // Prüfe auf verwaiste Callbacks (ohne aktive Komponente)
    let cleanedUp = 0;
    
    // Für jeden Effekttyp
    for (const type of Object.values(EffectType)) {
      const callbacks = this.callbacks.get(type) || [];
      
      // Filtere verwaiste Callbacks heraus (keine entsprechende Registry-Einträge)
      const validCallbacks = callbacks.filter(callback => {
        // Prüfe, ob dieser Callback in der Registry existiert
        let exists = false;
        for (const [_, entry] of Array.from(callbackRegistry.entries())) {
          if (entry.callback === callback) {
            exists = true;
            break;
          }
        }
        
        if (!exists) {
          // Entferne aus der ID-Map
          this.callbackIds.delete(callback);
          cleanedUp++;
        }
        
        return exists;
      });
      
      // Aktualisiere die Liste der Callbacks
      if (validCallbacks.length !== callbacks.length) {
        this.callbacks.set(type, validCallbacks);
      }
    }
    
    if (cleanedUp > 0) {
      this.debugLog(`Memory cleanup: removed ${cleanedUp} orphaned callbacks`);
    }
    
    // Begrenze die Anzahl der Callbacks in der Registry
    if (callbackRegistry.size > MAX_CALLBACKS_PER_TYPE * Object.values(EffectType).length) {
      const entriesToRemove = Array.from(callbackRegistry.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(0, callbackRegistry.size - MAX_CALLBACKS_PER_TYPE * Object.values(EffectType).length);
      
      entriesToRemove.forEach(([id, _]) => {
        callbackRegistry.delete(id);
      });
      
      this.debugLog(`Registry cleanup: removed ${entriesToRemove.length} old registry entries`);
    }
  }

  // Aktualisiere Effekte basierend auf Audio-Daten
  private update(): void {
    if (!this.isRunning) {
      return;
    }
    
    // Führe Speicherbereinigung durch
    this.performMemoryCleanup();
    
    const now = performance.now();
    const deltaTime = now - this.lastUpdateTime;
    this.lastUpdateTime = now;

    try {
      // Hole Audio-Daten aus dem Store
      const { energy, beatDetected, lastBeatTime } = useAudioReactionStore.getState();
      
      // Prüfe, ob ein neuer Beat erkannt wurde
      const isBeatNew = lastBeatTime > this.lastBeatTime;
      if (isBeatNew) {
        this.lastBeatTime = lastBeatTime;
      }

      // Aktualisiere jeden Effekt
      this.effects.forEach((effect, type) => {
        if (!effect.enabled) return;

        // Prüfe, ob der Effekt aktiv ist und ggf. deaktivieren
        if (effect.isActive && now > effect.activeUntil) {
          effect.isActive = false;
          effect.intensity = 0;
          
          // Rufe Callbacks mit Intensität 0 auf, um das Ende des Effekts zu signalisieren
          const callbacks = this.callbacks.get(type) || [];
          callbacks.forEach(callback => {
            callback(0, type);
          });
        }

        // Prüfe, ob der Effekt ausgelöst werden soll
        let shouldTrigger = false;
        let triggerIntensity = 0;

        // Prüfe Energie-Trigger mit verbesserter Reaktivität
        if (energy >= effect.reactivity.energyThreshold) {
          // Verbesserte Berechnung für energyFactor mit höherer Reaktivität bei niedrigen Werten
          const energyRange = 1 - effect.reactivity.energyThreshold;
          const normalizedEnergy = (energy - effect.reactivity.energyThreshold) / energyRange;
          // Quadratwurzel für bessere Reaktivität bei niedrigen Werten
          const energyFactor = Math.min(1, Math.sqrt(normalizedEnergy));
          
          triggerIntensity = Math.max(triggerIntensity, energyFactor * effect.reactivity.energySensitivity);
          shouldTrigger = true;
          
          // Debug-Logging für Energie-Trigger
          if (this.debugMode && Math.random() < 0.05) { // Nur 5% der Updates loggen
            console.log(`[EffectManager] Energy trigger for ${type}: energy=${energy.toFixed(2)}, threshold=${effect.reactivity.energyThreshold}, factor=${energyFactor.toFixed(2)}, intensity=${triggerIntensity.toFixed(2)}`);
          }
        }

        // Prüfe Beat-Trigger mit erhöhter Priorität
        if ((beatDetected || isBeatNew) && effect.reactivity.reactsToBeats) {
          // Erhöhe die Intensität bei Beat-Erkennung
          const beatIntensity = effect.reactivity.beatSensitivity * (1 + energy * 0.5);
          triggerIntensity = Math.max(triggerIntensity, beatIntensity);
          shouldTrigger = true;
          
          // Debug-Logging für Beat-Trigger
          if (this.debugMode) {
            console.log(`[EffectManager] Beat trigger for ${type}: beatIntensity=${beatIntensity.toFixed(2)}`);
          }
        }

        // Prüfe Cooldown
        if (shouldTrigger && now - effect.lastTriggered >= effect.reactivity.cooldown) {
          effect.lastTriggered = now;
          effect.isActive = true;
          
          // Erhöhe die Intensität, wenn bereits aktiv, anstatt zu ersetzen
          if (effect.intensity > 0) {
            effect.intensity = Math.min(1, effect.intensity + triggerIntensity * 0.7); // Erhöht von 0.5 auf 0.7
          } else {
            effect.intensity = triggerIntensity;
          }
          
          // Dynamische Dauer basierend auf Intensität
          const durationMultiplier = 0.5 + effect.intensity * 0.75; // Längere Dauer bei höherer Intensität
          effect.activeUntil = now + (effect.reactivity.duration * durationMultiplier);

          // Protokolliere Effektauslösung (mit Rate-Limiting)
          const logMessage = `[${type}] Effect triggered with intensity ${effect.intensity.toFixed(2)} (${Math.round(effect.reactivity.duration * durationMultiplier)}ms)`;
          this.debugLog(logMessage);
          
          // Bei hoher Intensität oder Beat immer loggen
          if (effect.intensity > 0.7 || beatDetected) {
            console.log(`[${new Date().toLocaleTimeString()}] ${logMessage}`);
          }
        }

        // Rufe Callbacks auf, wenn der Effekt aktiv ist
        if (effect.isActive) {
          const callbacks = this.callbacks.get(type) || [];
          callbacks.forEach(callback => {
            try {
              callback(effect.intensity, type);
            } catch (error) {
              console.error(`Error in effect callback for ${type}:`, error);
            }
          });
        }
      });
    } catch (error) {
      console.error('Error in EffectManager update:', error);
    }

    // Nächstes Frame anfordern
    this.animationFrameId = requestAnimationFrame(() => this.update());
  }

  // Löse einen Effekt manuell aus
  public triggerEffect(type: EffectType, intensity: number = 1.0, duration: number = 0): void {
    const effect = this.effects.get(type);
    if (effect) {
      const now = performance.now();
      effect.lastTriggered = now;
      effect.isActive = true;
      effect.intensity = intensity;
      effect.activeUntil = now + (duration || effect.reactivity.duration);
      
      // Rufe Callbacks auf
      const callbacks = this.callbacks.get(type) || [];
      callbacks.forEach(callback => {
        try {
          callback(intensity, type);
        } catch (error) {
          console.error(`Error in effect callback for ${type}:`, error);
        }
      });
      
      console.log(`[${new Date().toLocaleTimeString()}] [${type}] Effect manually triggered with intensity ${intensity.toFixed(2)}`);
    }
  }
  
  // Gib eine Übersicht über registrierte Effekte und Callbacks
  public getEffectsOverview(): Record<string, { enabled: boolean, callbackCount: number }> {
    const overview: Record<string, { enabled: boolean, callbackCount: number }> = {};
    
    this.effects.forEach((effect, type) => {
      const callbacks = this.callbacks.get(type) || [];
      overview[type] = {
        enabled: effect.enabled,
        callbackCount: callbacks.length
      };
    });
    
    return overview;
  }
  
  // Aktiviere/Deaktiviere Debug-Modus
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    console.log(`EffectManager debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  // Bereinige alle Callbacks
  public clearCallbacks(): void {
    this.callbacks.forEach((callbacks, type) => {
      this.callbacks.set(type, []);
    });
    this.callbackIds.clear();
    callbackRegistry.clear();
    console.log('All effect callbacks cleared');
  }
  
  // Bereinige den gesamten Callback-Registry
  public clearCallbackRegistry(): void {
    callbackRegistry.clear();
    this.callbackIds.clear();
    console.log('Effect callback registry cleared');
  }
}

// React Hook für die Verwendung des EffectManagers
export function useEffectManager(
  type: EffectType,
  callback: EffectCallback,
  customReactivity?: Partial<EffectReactivity>
): void {
  const callbackRef = useRef<EffectCallback>(callback);
  
  // Aktualisiere die Callback-Referenz, wenn sich der Callback ändert
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Stelle sicher, dass der EffectManager existiert
  useEffect(() => {
    if (!globalEffectManager) {
      console.warn('No global EffectManager instance found, creating one');
      globalEffectManager = new EffectManager();
      globalEffectManager.start();
    }
    
    // Erstelle einen stabilen Callback, der die aktuelle Referenz verwendet
    const stableCallback: EffectCallback = (intensity, effectType) => {
      callbackRef.current(intensity, effectType);
    };
    
    // Registriere den Callback und erhalte die Funktion zum Entfernen
    const unregister = globalEffectManager.registerCallback(type, stableCallback);
    
    // Aktualisiere die Reaktivitätsparameter, falls angegeben
    if (customReactivity) {
      globalEffectManager.updateReactivity(type, customReactivity);
    }
    
    // Bereinigung beim Unmounten
    return () => {
      unregister();
    };
  }, [type, customReactivity]); // Callback ist nicht in den Dependencies, da wir callbackRef verwenden
} 