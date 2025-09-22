import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 80, 'Little Key Rangers', {
        fontFamily: 'sans-serif',
        fontSize: '48px',
        color: '#f1f5f9',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2, '按下空格或点击开始挑战', {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        color: '#cbd5f5',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 60, '在游戏中输入屏幕上的单词击败敌人', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#94a3b8',
      })
      .setOrigin(0.5);

    this.input.keyboard?.once('keydown-SPACE', this.startGame, this);
    this.input.keyboard?.once('keydown-ENTER', this.startGame, this);
    this.input.once('pointerdown', this.startGame, this);
  }

  private startGame(): void {
    this.scene.start('PlayScene');
  }
}
