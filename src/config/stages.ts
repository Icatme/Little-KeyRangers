import { StageConfig } from './stageConfig';
// Word selection now comes from a selectable WordBank.
// Each stage defines proportions of the three difficulty groups.
import type { WordMix } from '../core/WordBankManager';

export interface BossConfig {
  name: string;
  words: string[];
  speed: number;
  pushback: number;
  damage: number;
  spriteScale: number;
}

export interface StageDefinition {
  id: number;
  name: string;
  description: string;
  difficulty: 'easy' | 'normal' | 'hard';
  wordMix: WordMix; // proportion of g1/g2/g3 in this stage
  stageConfig: StageConfig;
  dropRate: number;
  boss: BossConfig;
}

const createStageConfig = (
  overrides: Partial<StageConfig>,
  base: StageConfig,
): StageConfig => ({
  wall: overrides.wall ?? base.wall,
  dangerZone: overrides.dangerZone ?? base.dangerZone,
  spawn: {
    ...base.spawn,
    ...(overrides.spawn ?? {}),
    speed: overrides.spawn?.speed ?? base.spawn.speed,
    paths: overrides.spawn?.paths ?? base.spawn.paths,
  },
  bombs: {
    ...base.bombs,
    ...(overrides.bombs ?? {}),
  },
});

const baseStage: StageConfig = {
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

export const stages: StageDefinition[] = [
  {
    id: 1,
    name: '城墙演练',
    description: '轻度敌军压境，熟悉箭矢与炸弹的基础操控。',
    difficulty: 'easy',
    wordMix: { g1: 0.6, g2: 0.3, g3: 0.1 },
    stageConfig: createStageConfig(
      {
        wall: { maxHp: 4 },
        spawn: {
          total: 16,
          interval: 1600,
          maxConcurrent: 3,
          speed: { min: 70, max: 120 },
          paths: ['straight', 'drift'],
        },
        bombs: {
          initial: 1,
          max: 2,
          cooldown: 18000,
          comboThreshold: 5,
        },
      },
      baseStage,
    ),
    dropRate: 0.25,
    boss: {
      name: '暗影侦察兵',
      words: ['shadow', 'focus', 'valor', 'resist', 'unyielding'],
      speed: 60,
      pushback: 140,
      damage: 2,
      spriteScale: 1.1,
    },
  },
  {
    id: 2,
    name: '暴风前线',
    description: '更多敌人从各个角度袭来，保持冷静的节奏与准确度。',
    difficulty: 'normal',
    wordMix: { g1: 0.3, g2: 0.4, g3: 0.3 },
    stageConfig: createStageConfig(
      {
        wall: { maxHp: 4 },
        spawn: {
          total: 22,
          interval: 1350,
          maxConcurrent: 5,
          speed: { min: 90, max: 150 },
          paths: ['straight', 'zigzag', 'drift'],
        },
        bombs: {
          initial: 1,
          max: 3,
          cooldown: 17000,
          comboThreshold: 5,
        },
      },
      baseStage,
    ),
    dropRate: 0.32,
    boss: {
      name: '风暴军需官',
      words: ['tempest', 'barricade', 'sentinel', 'command', 'stronghold', 'onslaught'],
      speed: 70,
      pushback: 170,
      damage: 2,
      spriteScale: 1.18,
    },
  },
  {
    id: 3,
    name: '深夜决战',
    description: '黑暗之中强敌云集，谨慎守护城墙直至最后一刻。',
    difficulty: 'hard',
    wordMix: { g1: 0.1, g2: 0.3, g3: 0.6 },
    stageConfig: createStageConfig(
      {
        wall: { maxHp: 5 },
        dangerZone: 160,
        spawn: {
          total: 26,
          interval: 1200,
          maxConcurrent: 5,
          speed: { min: 100, max: 170 },
          paths: ['straight', 'zigzag', 'drift'],
        },
        bombs: {
          initial: 2,
          max: 3,
          cooldown: 15000,
          comboThreshold: 4,
        },
      },
      baseStage,
    ),
    dropRate: 0.38,
    boss: {
      name: '暮影指挥官',
      words: ['resurgence', 'cataclysm', 'dominion', 'unbreakable', 'sovereign', 'indomitable', 'perseverance'],
      speed: 82,
      pushback: 200,
      damage: 3,
      spriteScale: 1.26,
    },
  },
];

export function getStageById(stageId: number): StageDefinition {
  const stage = stages.find((entry) => entry.id === stageId);
  if (!stage) {
    throw new Error(`Stage ${stageId} not found`);
  }
  return stage;
}
