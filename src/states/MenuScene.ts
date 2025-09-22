import Phaser from 'phaser';
import { ICON_TEXTURE_KEYS } from '../core/IconTextureLoader';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#020617');

    this.add
      .image(width / 2, height / 2, ICON_TEXTURE_KEYS.castle)
      .setDisplaySize(width * 0.95, height * 0.95)
      .setAlpha(0.18)
      .setDepth(-2);

    const banner = this.add
      .rectangle(width / 2, height * 0.22, width * 0.72, 120, 0x0f172a, 0.85)
      .setStrokeStyle(2, 0x1e293b);

    this.add
      .text(banner.x, banner.y - 16, 'Little Key Rangers', {
        fontFamily: '"Cinzel", "Noto Serif SC", serif',
        fontSize: '56px',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    this.add
      .text(banner.x, banner.y + 42, '守护城墙的键盘游侠', {
        fontFamily: '"Noto Sans SC", sans-serif',
        fontSize: '22px',
        color: '#cbd5f5',
      })
      .setOrigin(0.5);

    this.add
      .image(width / 2, height / 2 + 12, ICON_TEXTURE_KEYS.ranger)
      .setDisplaySize(260, 260)
      .setOrigin(0.5, 0.9)
      .setAlpha(0.95);

    const infoPanel = this.add
      .rectangle(width / 2, height * 0.68, width * 0.62, 150, 0x0b1220, 0.75)
      .setStrokeStyle(2, 0x1e293b);

    this.add
      .text(infoPanel.x, infoPanel.y - 28, '输入敌人身上的单词发射箭矢', {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: '#e2e8f0',
      })
      .setOrigin(0.5);

    this.add
      .text(infoPanel.x, infoPanel.y + 8, '空格键释放魔法炸弹，清除屏幕上的敌人', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#94a3b8',
      })
      .setOrigin(0.5);

    const startHint = this.add
      .text(width / 2, infoPanel.y + 64, '按下空格或点击开始守城', {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: '#facc15',
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: startHint,
      alpha: { from: 0.3, to: 1 },
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    this.add
      .image(width * 0.86, height * 0.86, ICON_TEXTURE_KEYS.target)
      .setDisplaySize(120, 120)
      .setAlpha(0.22)
      .setDepth(-1);

    this.input.keyboard?.once('keydown-SPACE', this.startGame, this);
    this.input.keyboard?.once('keydown-ENTER', this.startGame, this);
    this.input.once('pointerdown', this.startGame, this);
  }

  private startGame(): void {
    this.scene.start('PlayScene');
  }
}
