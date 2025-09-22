import Phaser from 'phaser';
import { BootScene } from './BootScene';
import { UIScene } from './UIScene';
import { MenuScene } from '../states/MenuScene';
import { PlayScene } from '../states/PlayScene';
import { ResultScene } from '../states/ResultScene';

export function createGameConfig(): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: 'app',
    width: 960,
    height: 540,
    backgroundColor: '#0f172a',
    scene: [BootScene, MenuScene, PlayScene, UIScene, ResultScene],
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
      },
    },
  };
}
