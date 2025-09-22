import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2, 'Loading...', {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        color: '#f8fafc',
      })
      .setOrigin(0.5);
  }

  create(): void {
    this.scene.start('MenuScene');
  }
}
