import Phaser from 'phaser';
import { ICON_TEXTURE_KEYS } from '../core/IconTextureLoader';

export type EnemyPath = 'straight' | 'zigzag' | 'drift';

export type EnemyEliminationCause = 'arrow' | 'bomb';

interface EnemyOptions {
  word: string;
  path: EnemyPath;
  speed: number;
  breachX: number;
  dangerZone: number;
}

type EnemyState = 'spawning' | 'descending' | 'eliminating' | 'breached' | 'inactive';

export class Enemy extends Phaser.GameObjects.Container {
  private currentWord: string;
  readonly path: EnemyPath;

  private readonly sprite: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly wordPanel: Phaser.GameObjects.Rectangle;
  private readonly progressBar: Phaser.GameObjects.Rectangle;
  private readonly typedText: Phaser.GameObjects.Text;
  private readonly remainingText: Phaser.GameObjects.Text;

  private readonly speed: number;
  private readonly breachX: number;
  private readonly dangerZone: number;

  private readonly panelWidth: number;
  private readonly panelHeight: number = 46;
  private readonly textLeft: number;

  private state: EnemyState = 'spawning';
  private elapsed = 0;
  private progress = 0;
  private readonly startX: number;
  private readonly startY: number;
  private readonly zigzagFrequency: number;
  private readonly driftSpeed: number;
  private targetted = false;
  private inDangerZone = false;

  constructor(scene: Phaser.Scene, x: number, y: number, options: EnemyOptions) {
    super(scene, x, y);

    this.currentWord = options.word;
    this.path = options.path;
    this.speed = options.speed;
    this.breachX = options.breachX;
    this.dangerZone = options.dangerZone;

    this.startX = x;
    this.startY = y;
    this.zigzagFrequency = Phaser.Math.FloatBetween(0.0026, 0.0044);
    this.driftSpeed = Phaser.Math.FloatBetween(-26, 26);

    this.panelWidth = Math.max(140, this.currentWord.length * 28);
    this.textLeft = 12 - this.panelWidth / 2 + 10;

    this.sprite = scene.add
      .image(-12, -46, ICON_TEXTURE_KEYS.enemy)
      .setDisplaySize(92, 92)
      .setDepth(1);

    this.shadow = scene.add
      .ellipse(10, 58, this.panelWidth * 0.48, 30, 0x000000, 0.28)
      .setDepth(-1);

    this.wordPanel = scene.add
      .rectangle(12, 24, this.panelWidth, this.panelHeight, 0x0f172a, 0.88)
      .setStrokeStyle(2, 0x475569);

    this.progressBar = scene.add
      .rectangle(12 - this.panelWidth / 2, 24, 0, this.panelHeight, 0x38bdf8, 0.55)
      .setOrigin(0, 0.5)
      .setVisible(false);

    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: '"Noto Sans Mono", monospace',
      fontSize: '22px',
      color: '#f8fafc',
    };

    this.typedText = scene.add
      .text(this.textLeft, 24, '', { ...textStyle, color: '#38bdf8' })
      .setOrigin(0, 0.5);
    this.remainingText = scene.add
      .text(this.textLeft, 24, this.currentWord, textStyle)
      .setOrigin(0, 0.5);

    this.setSize(this.panelWidth + 60, this.panelHeight + 120);
    this.add([this.shadow, this.sprite, this.wordPanel, this.progressBar, this.typedText, this.remainingText]);
    scene.add.existing(this);

    this.state = 'descending';
  }

  get word(): string {
    return this.currentWord;
  }

  advance(delta: number): void {
    if (this.state !== 'descending') {
      return;
    }

    const deltaSeconds = delta / 1000;
    this.elapsed += delta;

    this.x -= this.speed * deltaSeconds;

    if (this.path === 'zigzag') {
      const amplitude = Math.min(140, Math.max(48, this.word.length * 10));
      const offset = Math.sin(this.elapsed * this.zigzagFrequency) * amplitude;
      this.y = Phaser.Math.Clamp(this.startY + offset, 110, this.scene.scale.height - 110);
    } else if (this.path === 'drift') {
      this.y = Phaser.Math.Clamp(
        this.y + this.driftSpeed * deltaSeconds,
        96,
        this.scene.scale.height - 96,
      );
    }

    const totalDistance = Math.max(60, this.startX - this.breachX);
    const travelled = this.startX - this.x;
    const progressRatio = Phaser.Math.Clamp(travelled / totalDistance, 0.2, 1);
    this.shadow.setScale(
      Phaser.Math.Clamp(progressRatio, 0.4, 0.8),
      Phaser.Math.Clamp(progressRatio, 0.25, 0.58),
    );
    this.shadow.setAlpha(Phaser.Math.Clamp(progressRatio * 0.45, 0.12, 0.4));

    if (this.x <= this.breachX) {
      this.state = 'breached';
      this.emit('breached');
      this.fadeOut(220, '#ef4444');
      return;
    }

    const distanceToBreach = this.x - this.breachX;
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
    this.progress = Phaser.Math.Clamp(progressCount, 0, this.currentWord.length);
    const ratio = this.currentWord.length === 0 ? 0 : this.progress / this.currentWord.length;
    const width = this.panelWidth * ratio;
    this.progressBar.setDisplaySize(width, this.panelHeight);
    this.progressBar.setVisible(ratio > 0);

    if (this.progress >= this.currentWord.length) {
      this.wordPanel.setFillStyle(0x14532d, 0.92);
      this.sprite.setTint(0xfef3c7);
      this.typedText.setColor('#34d399');
    } else {
      this.wordPanel.setFillStyle(0x0f172a, 0.88);
      this.sprite.clearTint();
      this.typedText.setColor('#38bdf8');
    }

    this.updateTypingPreview(this.currentWord.slice(0, this.progress), false);
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

  updateTypingPreview(input: string, isMistake: boolean): void {
    const trimmed = input.slice(0, this.currentWord.length);
    this.typedText.setText(trimmed);
    this.remainingText.setText(this.currentWord.slice(trimmed.length));
    this.remainingText.setX(this.textLeft + this.typedText.displayWidth);

    if (isMistake) {
      this.typedText.setColor('#f87171');
    } else if (trimmed.length >= this.currentWord.length) {
      this.typedText.setColor('#34d399');
    } else if (this.progress >= this.currentWord.length) {
      this.typedText.setColor('#34d399');
    } else {
      this.typedText.setColor('#38bdf8');
    }
  }

  resetTypingState(): void {
    this.progress = 0;
    this.updateTypingPreview('', false);
    this.progressBar.setVisible(false);
    this.wordPanel.setFillStyle(0x0f172a, 0.88);
    this.sprite.clearTint();
  }

  hitByArrow(): void {
    if (this.state !== 'descending') {
      return;
    }
    this.state = 'eliminating';

    const bodyWidth = this.displayWidth || this.width || 180;
    const bodyHeight = this.displayHeight || this.height || 160;
    const impact = this.scene.add
      .image(this.x - bodyWidth * 0.32, this.y - bodyHeight * 0.18, ICON_TEXTURE_KEYS.arrow)
      .setDisplaySize(52, 52)
      .setDepth(this.depth + 2)
      .setRotation(Phaser.Math.DegToRad(0));

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
      x: this.x + Math.min(200, bodyWidth * 0.7),
      y: this.y - bodyHeight * 0.18,
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
      x: this.x - offset,
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
    this.typedText.destroy();
    this.remainingText.destroy();
    super.destroy(fromScene);
  }
}
