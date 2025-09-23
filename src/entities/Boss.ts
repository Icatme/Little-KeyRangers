import Phaser from 'phaser';
import { ICON_TEXTURE_KEYS } from '../core/IconTextureLoader';

export type BossState = 'advancing' | 'retreating' | 'defeated' | 'breached';

export interface BossOptions {
  words: string[];
  speed: number;
  pushback: number;
  damage: number;
  breachX: number;
  dangerZone: number;
  spriteScale: number;
}

export class Boss extends Phaser.GameObjects.Container {
  private readonly options: BossOptions;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly wordPanel: Phaser.GameObjects.Rectangle;
  private readonly progressBar: Phaser.GameObjects.Rectangle;
  private readonly typedText: Phaser.GameObjects.Text;
  private readonly remainingText: Phaser.GameObjects.Text;

  private readonly panelWidth: number;
  private readonly panelHeight = 54;
  private readonly textLeft: number;

  private currentIndex = 0;
  private currentInput = '';
  private progress = 0;
  private state: BossState = 'advancing';
  private inDangerZone = false;
  private currentWord: string;

  constructor(scene: Phaser.Scene, x: number, y: number, options: BossOptions) {
    super(scene, x, y);
    if (options.words.length === 0) {
      throw new Error('Boss must have at least one word.');
    }

    this.options = options;
    const longest = Math.max(...options.words.map((word) => word.length));
    this.panelWidth = Math.max(200, longest * 30);
    this.textLeft = 16 - this.panelWidth / 2 + 10;

    this.currentWord = options.words[0];

    this.sprite = scene.add
      .image(0, -52, ICON_TEXTURE_KEYS.enemy)
      .setDisplaySize(130 * options.spriteScale, 130 * options.spriteScale)
      .setDepth(1);

    this.shadow = scene.add
      .ellipse(0, 68, this.panelWidth * 0.6, 36, 0x000000, 0.35)
      .setDepth(-1);

    this.wordPanel = scene.add
      .rectangle(16, 28, this.panelWidth, this.panelHeight, 0x0b1220, 0.9)
      .setStrokeStyle(3, 0x475569);

    this.progressBar = scene.add
      .rectangle(16 - this.panelWidth / 2, 28, 0, this.panelHeight, 0x38bdf8, 0.45)
      .setOrigin(0, 0.5)
      .setVisible(false);

    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: '"Noto Sans Mono", monospace',
      fontSize: '26px',
      color: '#f8fafc',
    };

    this.typedText = scene.add.text(this.textLeft, 28, '', textStyle).setOrigin(0, 0.5);
    this.remainingText = scene.add
      .text(this.textLeft, 28, this.currentWord, { ...textStyle, color: '#f8fafc' })
      .setOrigin(0, 0.5);

    this.add([this.shadow, this.sprite, this.wordPanel, this.progressBar, this.typedText, this.remainingText]);
    scene.add.existing(this);
  }

  get word(): string {
    return this.currentWord;
  }

  get damage(): number {
    return this.options.damage;
  }

  isDefeated(): boolean {
    return this.state === 'defeated';
  }

  advance(delta: number): void {
    if (this.state !== 'advancing') {
      return;
    }

    const deltaSeconds = delta / 1000;
    this.x -= this.options.speed * deltaSeconds;

    const totalDistance = Math.max(80, this.x - this.options.breachX);
    const progressRatio = Phaser.Math.Clamp(1 - totalDistance / 600, 0.25, 0.9);
    this.shadow.setScale(progressRatio, Phaser.Math.Clamp(progressRatio * 0.6, 0.28, 0.8));

    if (this.x <= this.options.breachX) {
      this.state = 'breached';
      this.emit('breached');
      this.fadeOut(280, '#ef4444');
      return;
    }

    const distanceToBreach = this.x - this.options.breachX;
    const nowDangerous = distanceToBreach <= this.options.dangerZone;
    if (nowDangerous !== this.inDangerZone) {
      this.inDangerZone = nowDangerous;
      if (this.inDangerZone && this.state === 'advancing') {
        this.wordPanel.setStrokeStyle(3, 0xf97316);
      } else {
        this.wordPanel.setStrokeStyle(3, 0x475569);
      }
    }
  }

  markAsTargeted(isTarget: boolean): void {
    if (this.state === 'defeated') {
      return;
    }
    if (isTarget) {
      this.wordPanel.setStrokeStyle(3, 0x38bdf8);
      this.sprite.setTint(0xfff7ed);
    } else if (this.inDangerZone) {
      this.wordPanel.setStrokeStyle(3, 0xf97316);
      this.sprite.clearTint();
    } else {
      this.wordPanel.setStrokeStyle(3, 0x475569);
      this.sprite.clearTint();
    }
  }

  updateTypingPreview(input: string, isMistake: boolean): void {
    this.currentInput = input;
    this.typedText.setText(input);
    this.remainingText.setText(this.currentWord.slice(input.length));
    this.remainingText.setX(this.textLeft + this.typedText.displayWidth);

    if (this.state === 'defeated') {
      return;
    }

    if (isMistake) {
      this.typedText.setColor('#f87171');
    } else if (input.length >= this.currentWord.length) {
      this.typedText.setColor('#34d399');
    } else {
      this.typedText.setColor('#38bdf8');
    }
  }

  setProgress(progress: number): void {
    this.progress = Phaser.Math.Clamp(progress, 0, this.currentWord.length);
    const ratio = this.currentWord.length === 0 ? 0 : this.progress / this.currentWord.length;
    const width = this.panelWidth * ratio;
    this.progressBar.setDisplaySize(width, this.panelHeight);
    this.progressBar.setVisible(ratio > 0);

    if (this.progress >= this.currentWord.length) {
      this.wordPanel.setFillStyle(0x14532d, 0.92);
      this.sprite.setTint(0xfef3c7);
      this.typedText.setColor('#34d399');
    } else {
      this.wordPanel.setFillStyle(0x0b1220, 0.9);
      this.sprite.clearTint();
    }
  }

  resetTypingState(): void {
    this.progress = 0;
    this.currentInput = '';
    this.typedText.setColor('#38bdf8');
    this.updateTypingPreview('', false);
    this.progressBar.setVisible(false);
    this.wordPanel.setFillStyle(0x0b1220, 0.9);
  }

  handleWordCompleted(): void {
    if (this.state === 'defeated' || this.state === 'breached') {
      return;
    }

    this.setProgress(this.currentWord.length);
    this.updateTypingPreview(this.currentWord, false);

    if (this.currentIndex >= this.options.words.length - 1) {
      this.defeat();
      return;
    }

    this.state = 'retreating';
    this.scene.tweens.add({
      targets: this,
      x: this.x + this.options.pushback,
      duration: 360,
      ease: Phaser.Math.Easing.Cubic.Out,
      onComplete: () => {
        this.currentIndex += 1;
        this.currentWord = this.options.words[this.currentIndex];
        this.resetTypingState();
        this.state = 'advancing';
        this.emit('word:changed', this.currentWord);
      },
    });
  }

  stop(): void {
    this.state = 'defeated';
  }

  private defeat(): void {
    if (this.state === 'defeated') {
      return;
    }
    this.state = 'defeated';
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0.6,
      duration: 320,
      ease: Phaser.Math.Easing.Cubic.In,
      onComplete: () => {
        this.emit('defeated');
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
      duration: 320,
      ease: Phaser.Math.Easing.Cubic.In,
      onComplete: () => {
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
