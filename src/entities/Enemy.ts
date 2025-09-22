import Phaser from 'phaser';
import { ICON_TEXTURE_KEYS } from '../core/IconTextureLoader';

export type EnemyPath = 'straight' | 'zigzag' | 'drift';

export type EnemyEliminationCause = 'arrow' | 'bomb';

interface EnemyOptions {
  word: string;
  path: EnemyPath;
  speed: number;
  breachY: number;
  dangerZone: number;
}

type EnemyState = 'spawning' | 'descending' | 'eliminating' | 'breached' | 'inactive';

export class Enemy extends Phaser.GameObjects.Container {
  readonly word: string;
  readonly path: EnemyPath;

  private readonly sprite: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly wordPanel: Phaser.GameObjects.Rectangle;
  private readonly progressBar: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;

  private readonly speed: number;
  private readonly breachY: number;
  private readonly dangerZone: number;

  private readonly panelWidth: number;
  private readonly panelHeight: number = 46;

  private state: EnemyState = 'spawning';
  private elapsed = 0;
  private progress = 0;
  private readonly startX: number;
  private readonly zigzagFrequency: number;
  private readonly driftSpeed: number;
  private targetted = false;
  private inDangerZone = false;

  constructor(scene: Phaser.Scene, x: number, y: number, options: EnemyOptions) {
    super(scene, x, y);

    this.word = options.word;
    this.path = options.path;
    this.speed = options.speed;
    this.breachY = options.breachY;
    this.dangerZone = options.dangerZone;

    this.startX = x;
    this.zigzagFrequency = Phaser.Math.FloatBetween(0.0035, 0.0055);
    this.driftSpeed = Phaser.Math.FloatBetween(-12, 12);

    this.panelWidth = Math.max(160, this.word.length * 34);

    this.sprite = scene.add
      .image(0, -54, ICON_TEXTURE_KEYS.enemy)
      .setDisplaySize(118, 118)
      .setDepth(1);

    this.shadow = scene.add
      .ellipse(0, 64, this.panelWidth * 0.52, 34, 0x000000, 0.28)
      .setDepth(-1);

    this.wordPanel = scene.add
      .rectangle(0, 28, this.panelWidth, this.panelHeight, 0x0f172a, 0.88)
      .setStrokeStyle(2, 0x475569);

    this.progressBar = scene.add
      .rectangle(-this.panelWidth / 2, 28, 0, this.panelHeight, 0x38bdf8, 0.55)
      .setOrigin(0, 0.5)
      .setVisible(false);

    this.label = scene.add
      .text(0, 28, this.word, {
        fontFamily: '"Noto Sans Mono", monospace',
        fontSize: '26px',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    this.setSize(this.panelWidth, this.panelHeight + 140);
    this.add([this.shadow, this.sprite, this.wordPanel, this.progressBar, this.label]);
    scene.add.existing(this);

    this.state = 'descending';
  }

  advance(delta: number): void {
    if (this.state !== 'descending') {
      return;
    }

    const deltaSeconds = delta / 1000;
    this.elapsed += delta;

    this.y += this.speed * deltaSeconds;

    if (this.path === 'zigzag') {
      const amplitude = Math.min(180, Math.max(60, this.word.length * 12));
      const offset = Math.sin(this.elapsed * this.zigzagFrequency) * amplitude;
      this.x = Phaser.Math.Clamp(this.startX + offset, 120, this.scene.scale.width - 120);
    } else if (this.path === 'drift') {
      this.x = Phaser.Math.Clamp(
        this.x + this.driftSpeed * deltaSeconds,
        100,
        this.scene.scale.width - 100,
      );
    }

    const progressRatio = Phaser.Math.Clamp((this.y - 60) / (this.breachY - 60), 0.2, 1);
    this.shadow.setScale(progressRatio, Phaser.Math.Clamp(progressRatio, 0.25, 0.6));
    this.shadow.setAlpha(Phaser.Math.Clamp(progressRatio * 0.45, 0.12, 0.4));

    if (this.y >= this.breachY) {
      this.state = 'breached';
      this.emit('breached');
      this.fadeOut(220, '#ef4444');
      return;
    }

    const distanceToBreach = this.breachY - this.y;
    const nowDangerous = distanceToBreach <= this.dangerZone;
    if (nowDangerous !== this.inDangerZone) {
      this.inDangerZone = nowDangerous;
      if (this.inDangerZone && !this.targetted) {
        this.wordPanel.setStrokeStyle(3, 0xf97316);
      } else if (!this.targetted) {
        this.wordPanel.setStrokeStyle(2, 0x475569);
      }
    }
  }

  setProgress(progressCount: number): void {
    this.progress = Phaser.Math.Clamp(progressCount, 0, this.word.length);
    const ratio = this.word.length === 0 ? 0 : this.progress / this.word.length;
    const width = this.panelWidth * ratio;
    this.progressBar.setDisplaySize(width, this.panelHeight);
    this.progressBar.setVisible(ratio > 0);

    if (this.progress >= this.word.length) {
      this.wordPanel.setFillStyle(0x14532d, 0.92);
      this.sprite.setTint(0xfef3c7);
    } else {
      this.wordPanel.setFillStyle(0x0f172a, 0.88);
      this.sprite.clearTint();
    }
  }

  markAsTargeted(isTarget: boolean): void {
    this.targetted = isTarget;
    if (isTarget) {
      this.wordPanel.setStrokeStyle(3, 0x38bdf8);
      this.sprite.setTint(0xfff7ed);
    } else if (this.inDangerZone) {
      this.wordPanel.setStrokeStyle(3, 0xf97316);
      this.sprite.clearTint();
    } else {
      this.wordPanel.setStrokeStyle(2, 0x475569);
      this.sprite.clearTint();
    }
  }

  hitByArrow(): void {
    if (this.state !== 'descending') {
      return;
    }
    this.state = 'eliminating';

    const impact = this.scene.add
      .image(this.x, this.y - 24, ICON_TEXTURE_KEYS.arrow)
      .setDisplaySize(64, 64)
      .setDepth(this.depth + 2)
      .setRotation(Phaser.Math.DegToRad(-20));

    this.scene.tweens.add({
      targets: impact,
      alpha: 0,
      scale: 1.2,
      duration: 220,
      ease: Phaser.Math.Easing.Quadratic.Out,
      onComplete: () => impact.destroy(),
    });

    this.scene.tweens.add({
      targets: this,
      y: this.y + 120,
      alpha: 0,
      duration: 320,
      ease: Phaser.Math.Easing.Cubic.In,
      onComplete: () => {
        this.state = 'inactive';
        this.emit('eliminated', { cause: 'arrow' as EnemyEliminationCause });
        this.destroy();
      },
    });
  }

  eliminateByBomb(): void {
    if (this.state !== 'descending') {
      return;
    }
    this.state = 'eliminating';
    this.scene.tweens.add({
      targets: this,
      angle: 300,
      scale: 0.15,
      alpha: 0,
      duration: 260,
      ease: Phaser.Math.Easing.Back.In,
      onComplete: () => {
        this.state = 'inactive';
        this.emit('eliminated', { cause: 'bomb' as EnemyEliminationCause });
        this.destroy();
      },
    });
  }

  private fadeOut(offset: number, color: string): void {
    this.wordPanel.setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(color).color);
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      y: this.y + offset,
      duration: 280,
      ease: Phaser.Math.Easing.Cubic.In,
      onComplete: () => {
        this.state = 'inactive';
        this.emit('breach:completed');
        this.destroy();
      },
    });
  }

  override destroy(fromScene?: boolean): void {
    this.sprite.destroy();
    this.shadow.destroy();
    this.wordPanel.destroy();
    this.progressBar.destroy();
    this.label.destroy();
    super.destroy(fromScene);
  }
}
