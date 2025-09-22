import Phaser from 'phaser';
import { BootScene } from './BootScene';
import { UIScene } from './UIScene';
import { MenuScene } from '../states/MenuScene';
import { PlayScene } from '../states/PlayScene';
import { ResultScene } from '../states/ResultScene';

export function createGameConfig(): Phaser.Types.Core.GameConfig {
  const baseHeight = 540;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 960;
  const width = Phaser.Math.Clamp(viewportWidth, 960, 1600);
  return {
    type: Phaser.AUTO,
    parent: 'app',
    width,
    height: baseHeight,
    backgroundColor: '#0f172a',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, MenuScene, PlayScene, UIScene, ResultScene],
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
      },
    },
  };
}
