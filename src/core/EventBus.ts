import Phaser from 'phaser';

export interface ScoreSummary {
  score: number;
  combo: number;
  accuracy: number;
  wordsCompleted: number;
}

export const EventBus = new Phaser.Events.EventEmitter();

export const Events = {
  ScoreUpdated: 'score:updated',
  WordChanged: 'word:changed',
  RoundCompleted: 'round:completed',
  DisplayMessage: 'ui:message',
} as const;
