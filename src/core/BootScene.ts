import Phaser from 'phaser';
import { loadIconTextures } from './IconTextureLoader';
import { createPanel, fadeInScene, fadeOutScene, UI_TEXT } from './UIStyle';

export class BootScene extends Phaser.Scene {
  private loadingText!: Phaser.GameObjects.Text;
  private barBg!: Phaser.GameObjects.Rectangle;
  private barFill!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('BootScene');
  }

  override preload(): void {
    fadeInScene(this, 200);
    const { width, height } = this.scale;

    createPanel(this, width / 2, height / 2, width * 0.55, 160, { alpha: 0.88 });

    this.loadingText = this.add.text(width / 2, height / 2 - 12, '正在装配游侠装备...', UI_TEXT.body).setOrigin(0.5);

    this.barBg = this.add.rectangle(width / 2, height / 2 + 26, width * 0.42, 12, 0x0f172a, 0.9).setStrokeStyle(2, 0x1e293b);
    this.barFill = this.add.rectangle(this.barBg.x - this.barBg.width / 2 + 2, this.barBg.y, 0, 8, 0x38bdf8, 0.9).setOrigin(0, 0.5);
  }

  override async create(): Promise<void> {
    await loadIconTextures(this, (loaded, total) => {
      const progress = Math.round((loaded / total) * 100);
      this.loadingText.setText(`正在装配游侠装备... ${progress}%`);
      this.barFill.setSize((this.barBg.width - 4) * (progress / 100), 8);
    });

    this.loadingText.setText('装配完成，准备出击！');
    fadeOutScene(this, 260, () => this.scene.start('MenuScene'));
  }
}
