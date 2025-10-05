import { EnemyPath } from '../entities/Enemy';

export interface SpawnConfig {
  total: number;
  interval: number;
  maxConcurrent: number;
  speed: { min: number; max: number };
  paths: EnemyPath[];
}

export interface BombSettings {
  initial: number;
  max: number;
  cooldown: number;
  comboThreshold: number;
}

export interface StageConfig {
  wall: { maxHp: number };
  dangerZone: number;
  spawn: SpawnConfig;
  bombs: BombSettings;
}

export const defaultStage: StageConfig = {
  wall: { maxHp: 3 },
  dangerZone: 140,
  spawn: {
    total: 18,
    interval: 1500,
    maxConcurrent: 4,
    speed: { min: 80, max: 140 },
    paths: ['straight', 'zigzag', 'drift'],
  },
  bombs: {
    initial: 1,
    max: 2,
    cooldown: 20000,
    comboThreshold: 6,
  },
};
