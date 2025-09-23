import Phaser from 'phaser';
import { ICON_TEXTURE_KEYS } from '../core/IconTextureLoader';

export type PowerupType = 'bomb' | 'repair';

interface PowerupOptions {
  type: PowerupType;
  fallSpeed: number;
  groundY: number;
}

export class Powerup extends Phaser.GameObjects.Container {
  readonly type: PowerupType;
  private readonly speed: number;
  private readonly groundY: number;
  private collected = false;
  private readonly badge: Phaser.GameObjects.Rectangle;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, options: PowerupOptions) {
    super(scene, x, -60);

    this.type = options.type;
    this.speed = options.fallSpeed;
    this.groundY = options.groundY;

    const tint = this.type === 'bomb' ? 0xf97316 : 0x38bdf8;
    this.badge = scene.add
      .rectangle(0, 0, 52, 52, 0x0f172a, 0.8)
      .setStrokeStyle(2, tint)
      .setRadius(12);

    const texture = this.type === 'bomb' ? ICON_TEXTURE_KEYS.bomb : ICON_TEXTURE_KEYS.wallEmblem;
    this.icon = scene.add.image(0, 0, texture).setDisplaySize(32, 32).setTint(tint);

    const labelText = this.type === 'bomb' ? '补给' : '维修';
    this.label = scene.add
      .text(0, 42, labelText, {
        fontFamily: '"Noto Sans SC", sans-serif',
        fontSize: '18px',
        color: '#e2e8f0',
      })
      .setOrigin(0.5, 0);

    this.add([this.badge, this.icon, this.label]);
    this.setDepth(9);
    scene.add.existing(this);

    scene.tweens.add({
      targets: this.icon,
      angle: { from: -6, to: 6 },
      duration: 600,
      repeat: -1,
      yoyo: true,
      ease: Phaser.Math.Easing.Sine.InOut,
    });
  }

  update(delta: number): void {
    if (this.collected) {
      return;
    }

    const deltaSeconds = delta / 1000;
    this.y += this.speed * deltaSeconds;

    if (this.y >= this.groundY) {
      this.collect();
    }
  }

  collect(): void {
    if (this.collected) {
      return;
    }
    this.collected = true;
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 1.2,
      duration: 240,
      ease: Phaser.Math.Easing.Cubic.Out,
      onComplete: () => {
        this.emit('collected', this.type);
        this.destroy();
      },
    });
  }

  override destroy(fromScene?: boolean): void {
    this.badge.destroy();
    this.icon.destroy();
    this.label.destroy();
    super.destroy(fromScene);
  }
}
