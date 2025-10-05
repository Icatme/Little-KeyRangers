import Phaser from 'phaser';
import { createGameConfig } from './core/GameConfig';

const gameConfig = createGameConfig();

new Phaser.Game(gameConfig);
