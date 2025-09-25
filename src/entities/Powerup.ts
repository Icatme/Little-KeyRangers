import Phaser from 'phaser';
import { ICON_TEXTURE_KEYS } from '../core/IconTextureLoader';

export type PowerupType = 'bomb' | 'repair';

export type PowerupCollectTrigger = 'typed' | 'auto';

interface PowerupOptions {
  type: PowerupType;
  fallSpeed: number;
  groundY: number;
  requiresTyping?: boolean;
  word?: string;
}

export class Powerup extends Phaser.GameObjects.Container {
  override readonly type: PowerupType;
  readonly requiresTyping: boolean;

  private readonly speed: number;
  private readonly groundY: number;
  private readonly baseTint: number;
  private readonly targetWord?: string;

  private collected = false;
  private targeted = false;

  private readonly badge: Phaser.GameObjects.Rectangle;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly label?: Phaser.GameObjects.Text;
  private readonly wordPanel?: Phaser.GameObjects.Rectangle;
  private readonly progressBar?: Phaser.GameObjects.Rectangle;
  private readonly typedText?: Phaser.GameObjects.Text;
  private readonly remainingText?: Phaser.GameObjects.Text;

  private progress = 0;

  constructor(scene: Phaser.Scene, x: number, options: PowerupOptions) {
    super(scene, x, -60);

    this.type = options.type;
    this.speed = options.fallSpeed;
    this.groundY = options.groundY;
    this.requiresTyping = Boolean(options.requiresTyping);
    this.targetWord = options.word;

    if (this.requiresTyping && !this.targetWord) {
      throw new Error('Typed powerups must provide a word.');
    }

    this.baseTint = this.type === 'bomb' ? 0xf97316 : 0x38bdf8;

    this.badge = scene.add
      .rectangle(0, 0, 52, 52, 0x0f172a, 0.8)
      .setStrokeStyle(2, this.baseTint)
      .setRadius(12);

    const texture = this.type === 'bomb' ? ICON_TEXTURE_KEYS.bomb : ICON_TEXTURE_KEYS.wallEmblem;
    this.icon = scene.add.image(0, 0, texture).setDisplaySize(32, 32).setTint(this.baseTint);

    if (this.requiresTyping && this.targetWord) {
      const panelWidth = Math.max(96, this.targetWord.length * 22);
      const panelHeight = 34;

      this.progressBar = scene.add
        .rectangle(-panelWidth / 2, 44, 0, panelHeight, this.baseTint, 0.3)
        .setOrigin(0, 0.5)
        .setVisible(false);

      this.wordPanel = scene.add
        .rectangle(0, 44, panelWidth, panelHeight, 0x0f172a, 0.86)
        .setStrokeStyle(2, 0x475569);

      const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
        fontFamily: '"Noto Sans Mono", monospace',
        fontSize: '20px',
        color: '#e2e8f0',
      };

      this.typedText = scene.add
        .text(-panelWidth / 2 + 12, 44, '', { ...textStyle, color: '#38bdf8' })
        .setOrigin(0, 0.5);
      this.remainingText = scene.add.text(this.typedText.x, 44, this.targetWord, textStyle).setOrigin(0, 0.5);

      this.add([this.badge, this.icon, this.progressBar, this.wordPanel, this.typedText, this.remainingText]);
      this.resetTypingState();
    } else {
      const labelText = this.type === 'bomb' ? '补给' : '维修';
      this.label = scene.add
        .text(0, 42, labelText, {
          fontFamily: '"Noto Sans SC", sans-serif',
          fontSize: '18px',
          color: '#e2e8f0',
        })
        .setOrigin(0.5, 0);
      this.add([this.badge, this.icon, this.label]);
    }

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

  get word(): string {
    return this.targetWord ?? '';
  }

  isTypingActive(): boolean {
    return this.requiresTyping && !this.collected;
  }

  update(delta: number): void {
    if (this.collected) {
      return;
    }

    const deltaSeconds = delta / 1000;
    this.y += this.speed * deltaSeconds;

    if (this.y >= this.groundY) {
      if (this.requiresTyping) {
        this.handleMissed();
      } else {
        this.collect('auto');
      }
    }
  }

  setProgress(progressCount: number): void {
    if (!this.requiresTyping || !this.targetWord) {
      return;
    }

    this.progress = Phaser.Math.Clamp(progressCount, 0, this.targetWord.length);
    const ratio = this.targetWord.length === 0 ? 0 : this.progress / this.targetWord.length;
    const width = (this.wordPanel?.width ?? 0) * ratio;

    if (this.progressBar) {
      this.progressBar.setDisplaySize(width, this.progressBar.height);
      this.progressBar.setVisible(ratio > 0);
    }

    if (this.wordPanel) {
      if (this.progress >= this.targetWord.length) {
        this.wordPanel.setFillStyle(0x14532d, 0.9);
        this.icon.setTint(0xfef3c7);
      } else {
        this.wordPanel.setFillStyle(0x0f172a, 0.86);
        if (!this.targeted) {
          this.icon.setTint(this.baseTint);
        }
      }
    }
  }

  markAsTargeted(isTarget: boolean): void {
    this.targeted = isTarget;
    if (this.requiresTyping) {
      if (isTarget) {
        this.wordPanel?.setStrokeStyle(3, 0x38bdf8);
        this.icon.setTint(0xfff7ed);
      } else {
        this.wordPanel?.setStrokeStyle(2, 0x475569);
        this.icon.setTint(this.baseTint);
      }
      return;
    }

    const strokeTint = this.type === 'bomb' ? 0xf97316 : 0x38bdf8;
    this.badge.setStrokeStyle(isTarget ? 3 : 2, strokeTint);
    this.icon.setTint(isTarget ? 0xfff7ed : this.baseTint);
  }

  updateTypingPreview(input: string, isMistake: boolean): void {
    if (!this.requiresTyping || !this.targetWord || !this.typedText || !this.remainingText) {
      return;
    }

    const trimmed = input.slice(0, this.targetWord.length);
    this.typedText.setText(trimmed);
    this.remainingText.setText(this.targetWord.slice(trimmed.length));
    this.remainingText.setX(this.typedText.x + this.typedText.displayWidth);

    if (isMistake) {
      this.typedText.setColor('#f87171');
    } else if (trimmed.length >= this.targetWord.length) {
      this.typedText.setColor('#34d399');
    } else {
      this.typedText.setColor('#38bdf8');
    }
  }

  resetTypingState(): void {
    if (!this.requiresTyping) {
      return;
    }

    this.progress = 0;
    if (this.progressBar) {
      this.progressBar.setDisplaySize(0, this.progressBar.height);
      this.progressBar.setVisible(false);
    }
    this.wordPanel?.setFillStyle(0x0f172a, 0.86);
    this.icon.setTint(this.baseTint);
    this.updateTypingPreview('', false);
  }

  completeByTyping(): void {
    if (this.requiresTyping && this.targetWord) {
      this.setProgress(this.targetWord.length);
      this.updateTypingPreview(this.targetWord, false);
      this.collect('typed');
    } else {
      this.collect('auto');
    }
  }

  collect(trigger: PowerupCollectTrigger = 'auto'): void {
    if (this.collected) {
      return;
    }

    if (this.requiresTyping && trigger !== 'typed') {
      return;
    }

    this.collected = true;
    this.targeted = false;
    this.wordPanel?.setStrokeStyle(2, 0x475569);
    this.icon.setTint(this.baseTint);

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 1.1,
      duration: 240,
      ease: Phaser.Math.Easing.Cubic.Out,
      onComplete: () => {
        this.emit('collected', { type: this.type, trigger });
        this.destroy();
      },
    });
  }

  private handleMissed(): void {
    if (this.collected) {
      return;
    }

    this.collected = true;
    this.targeted = false;
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0.8,
      duration: 220,
      ease: Phaser.Math.Easing.Cubic.In,
      onComplete: () => {
        this.emit('missed', this.type);
        this.destroy();
      },
    });
  }

  override destroy(fromScene?: boolean): void {
    this.badge.destroy();
    this.icon.destroy();
    this.label?.destroy();
    this.wordPanel?.destroy();
    this.progressBar?.destroy();
    this.typedText?.destroy();
    this.remainingText?.destroy();
    super.destroy(fromScene);
  }
}
