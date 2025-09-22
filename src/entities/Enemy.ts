import Phaser from 'phaser';

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

  private readonly body: Phaser.GameObjects.Rectangle;
  private readonly progressBar: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;

  private readonly speed: number;
  private readonly breachY: number;
  private readonly dangerZone: number;

  private state: EnemyState = 'spawning';
  private elapsed = 0;
  private progress = 0;
  private readonly startX: number;
  private readonly zigzagFrequency: number;
  private readonly driftSpeed: number;
  private targetted = false;

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

    const width = Math.max(120, this.word.length * 28);
    const height = 48;

    this.body = scene.add
      .rectangle(0, 0, width, height, 0x1e293b, 0.92)
      .setStrokeStyle(2, 0x94a3b8)
      .setOrigin(0.5);

    this.progressBar = scene.add
      .rectangle(-width / 2, 0, 0, height, 0x38bdf8, 0.4)
      .setOrigin(0, 0.5);

    this.label = scene.add
      .text(0, 0, this.word, {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    this.add([this.body, this.progressBar, this.label]);
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

    if (this.y >= this.breachY) {
      this.state = 'breached';
      this.emit('breached');
      this.fadeOut(180, '#ef4444');
      return;
    }

    const distanceToBreach = this.breachY - this.y;
    if (distanceToBreach <= this.dangerZone) {
      this.body.setStrokeStyle(3, 0xf97316);
    } else if (!this.targetted) {
      this.body.setStrokeStyle(2, 0x94a3b8);
    }
  }

  setProgress(progressCount: number): void {
    this.progress = Phaser.Math.Clamp(progressCount, 0, this.word.length);
    const ratio = this.word.length === 0 ? 0 : this.progress / this.word.length;
    const width = this.body.width * ratio;
    this.progressBar.setDisplaySize(width, this.body.height);
    this.progressBar.setVisible(ratio > 0);

    if (this.progress >= this.word.length) {
      this.body.setFillStyle(0x22c55e, 0.9);
    } else {
      this.body.setFillStyle(0x1e293b, 0.92);
    }
  }

  markAsTargeted(isTarget: boolean): void {
    this.targetted = isTarget;
    if (isTarget) {
      this.body.setStrokeStyle(3, 0x38bdf8);
    } else if (this.state === 'descending') {
      this.body.setStrokeStyle(2, 0x94a3b8);
    }
  }

  hitByArrow(): void {
    if (this.state !== 'descending') {
      return;
    }
    this.state = 'eliminating';
    this.scene.sound?.play?.('arrow-hit');
    this.scene.tweens.add({
      targets: this,
      y: this.y + 200,
      alpha: 0,
      duration: 320,
      ease: Phaser.Math.Easing.Quadratic.In,
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
      angle: 360,
      scale: 0.2,
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
    this.body.setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(color).color);
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
    this.body.destroy();
    this.progressBar.destroy();
    this.label.destroy();
    super.destroy(fromScene);
  }
}
