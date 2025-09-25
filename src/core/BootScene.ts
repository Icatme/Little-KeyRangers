import Phaser from 'phaser';
import { loadIconTextures } from './IconTextureLoader';

export class BootScene extends Phaser.Scene {
  private loadingText!: Phaser.GameObjects.Text;

  constructor() {
    super('BootScene');
  }

  override preload(): void {
    this.cameras.main.setBackgroundColor('#020617');
    const { width, height } = this.scale;

    this.add
      .rectangle(width / 2, height / 2, width * 0.55, 150, 0x0f172a, 0.85)
      .setStrokeStyle(2, 0x1e293b);

    this.loadingText = this.add
      .text(width / 2, height / 2, '正在装配游侠装备...', {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        color: '#e2e8f0',
      })
      .setOrigin(0.5);
  }

  override async create(): Promise<void> {
    await loadIconTextures(this, (loaded, total) => {
      const progress = Math.round((loaded / total) * 100);
      this.loadingText.setText(`正在装配游侠装备... ${progress}%`);
    });

    this.loadingText.setText('装配完成，准备出击！');
    this.time.delayedCall(480, () => {
      this.scene.start('MenuScene');
    });
  }
}
