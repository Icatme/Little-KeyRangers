import type { WordMix } from './WordBankManager';
import { WordBankManager } from './WordBankManager';
import { stages as defaultStages } from '../config/stages';

const LS_MIX_KEY = 'lkr.stageMixOverrides.v1';

export type MixOverrides = Record<string, WordMix>; // key by stageId

function loadMixOverrides(): MixOverrides {
  try {
    const raw = window.localStorage.getItem(LS_MIX_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw) as MixOverrides;
    return obj || {};
  } catch {
    return {};
  }
}

function saveMixOverrides(data: MixOverrides): void {
  window.localStorage.setItem(LS_MIX_KEY, JSON.stringify(data));
}

export class SettingsManager {
  private static mixes: MixOverrides = loadMixOverrides();

  static getStageWordMix(stageId: number, fallback?: WordMix): WordMix {
    const key = String(stageId);
    const mix = this.mixes[key];
    if (mix) return mix;
    // fallback to default from config
    const entry = defaultStages.find((s) => s.id === stageId);
    return entry?.wordMix || fallback || { g1: 0.6, g2: 0.3, g3: 0.1 };
  }

  static setStageWordMix(stageId: number, mix: WordMix): void {
    const normalized = SettingsManager.normalizeMix(mix);
    this.mixes[String(stageId)] = normalized;
    saveMixOverrides(this.mixes);
  }

  static normalizeMix(mix: WordMix): WordMix {
    let g1 = Math.max(0, Number(mix.g1) || 0);
    let g2 = Math.max(0, Number(mix.g2) || 0);
    let g3 = Math.max(0, Number(mix.g3) || 0);
    const sum = g1 + g2 + g3;
    if (sum <= 0) return { g1: 1, g2: 0, g3: 0 };
    return { g1: g1 / sum, g2: g2 / sum, g3: g3 / sum };
  }

  static getNextDifficultyMix(currentStageId: number): WordMix {
    // Try to use the mix of the next stage (by index in config)
    const idx = defaultStages.findIndex((s) => s.id === currentStageId);
    const next = idx >= 0 && idx < defaultStages.length - 1 ? defaultStages[idx + 1] : undefined;
    if (next) return this.getStageWordMix(next.id, next.wordMix);
    // If already last stage, skew harder by shifting 0.1 from g1 to g3
    const cur = defaultStages[idx] || defaultStages[defaultStages.length - 1];
    const base = this.getStageWordMix(currentStageId, cur.wordMix);
    const g1 = Math.max(0, base.g1 - 0.1);
    const g3 = Math.min(1, base.g3 + 0.1);
    const g2 = base.g2;
    return this.normalizeMix({ g1, g2, g3 });
  }
}

