import Phaser from 'phaser';

export interface ScoreSummary {
  score: number;
  combo: number;
  accuracy: number;
  enemiesDefeated: number;
  typedEliminations: number;
  bombEliminations: number;
  bombsUsed: number;
  breaches: number;
}

export interface BombStatus {
  charges: number;
  maxCharges: number;
  cooldownRemaining: number;
  cooldown: number;
}

export interface WallStatus {
  current: number;
  max: number;
}

export const EventBus = new Phaser.Events.EventEmitter();

export const Events = {
  ScoreUpdated: 'score:updated',
  WordChanged: 'word:changed',
  RoundCompleted: 'round:completed',
  DisplayMessage: 'ui:message',
  BombStatusUpdated: 'bomb:status',
  BombActivated: 'bomb:activated',
  WallStatusUpdated: 'wall:status',
} as const;
