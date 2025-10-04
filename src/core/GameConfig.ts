import Phaser from 'phaser';
import { BootScene } from './BootScene';
import { UIScene } from './UIScene';
import { MenuScene } from '../states/MenuScene';
import { PlayScene } from '../states/PlayScene';
import { ResultScene } from '../states/ResultScene';
import { PauseScene } from '../states/PauseScene';

export function createGameConfig(): Phaser.Types.Core.GameConfig {
  // Lock game logical resolution to 16:9
  const baseWidth = 1280;
  const baseHeight = Math.round((baseWidth * 9) / 16); // 720
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : baseWidth;
  const width = Phaser.Math.Clamp(viewportWidth, 960, 1600);
  // Compute height from width to keep 16:9
  const height = Math.round((width * 9) / 16);
  return {
    type: Phaser.AUTO,
    parent: 'app',
    width,
    height,
    backgroundColor: '#0f172a',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, MenuScene, PlayScene, PauseScene, UIScene, ResultScene],
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
      },
    },
  };
}
