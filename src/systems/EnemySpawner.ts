import Phaser from 'phaser';
import { Enemy, EnemyPath, EnemyType } from '../entities/Enemy';
import type { SpawnConfig } from '../config/stageConfig';

export class EnemySpawner extends Phaser.Events.EventEmitter {
  private readonly config: SpawnConfig;
  private readonly scene: Phaser.Scene;
  private readonly breachX: number;
  private readonly dangerZone: number;
  private readonly baseWords: string[];
  private readonly shortWords: string[];
  private readonly longWords: string[];
  private wordBag: string[];
  private spawnTimer = 0;
  private spawnedCount = 0;
  private active = true;

  constructor(
    scene: Phaser.Scene,
    config: SpawnConfig,
    wordPool: string[],
    breachX: number,
    dangerZone: number,
  ) {
    super();
    this.scene = scene;
    this.config = config;
    this.breachX = breachX;
    this.dangerZone = dangerZone;
    this.baseWords = wordPool.length > 0 ? [...wordPool] : ['defend', 'castle', 'arrow'];
    this.shortWords = this.baseWords.filter((w) => w.length <= 6);
    this.longWords = this.baseWords.filter((w) => w.length >= 9);
    this.wordBag = this.shuffleWords(this.baseWords);
    this.spawnTimer = config.interval * 0.5;
  }

  update(delta: number, activeEnemies: number): void {
    if (!this.active) {
      return;
    }

    if (this.spawnedCount >= this.config.total) {
      this.active = false;
      return;
    }

    if (activeEnemies >= this.config.maxConcurrent) {
      return;
    }

    this.spawnTimer -= delta;
    if (this.spawnTimer > 0) {
      return;
    }

    this.spawnTimer = this.config.interval;
    this.spawnEnemy();
  }

  stop(): void {
    this.active = false;
  }

  private spawnEnemy(): void {
    const type = this.pickEnemyType();
    const word = this.pickWordForType(type);
    const path = Phaser.Utils.Array.GetRandom(this.config.paths);
    const spawnOffset = Phaser.Math.Between(80, 140);
    const x = this.scene.scale.width + spawnOffset;
    const y = Phaser.Math.Between(120, this.scene.scale.height - 120);
    const baseSpeed = Phaser.Math.FloatBetween(this.config.speed.min, this.config.speed.max);
    const speedMultiplier = type === 'fast' ? 1.35 : type === 'heavy' ? 0.7 : 1.15;
    const speed = baseSpeed * speedMultiplier;
    const hp = type === 'heavy' ? 2 : 1;

    const enemy = new Enemy(this.scene, x, y, {
      word,
      path: path as EnemyPath,
      speed,
      breachX: this.breachX,
      dangerZone: this.dangerZone,
      type,
      hp,
    });

    this.spawnedCount += 1;
    this.emit('spawn', enemy);
  }

  // Returns how many enemies have been spawned so far
  getSpawnedCount(): number {
    return this.spawnedCount;
  }

  // Returns true when this spawner has emitted all enemies defined by config.total
  isFinished(): boolean {
    return this.spawnedCount >= this.config.total;
  }

  private nextWord(): string {
    if (this.wordBag.length === 0) {
      this.wordBag = this.shuffleWords(this.baseWords);
    }

    return this.wordBag.pop() ?? 'enemy';
  }

  private pickEnemyType(): EnemyType {
    // Weights: fast 35%, heavy 25%, normal 40%
    const r = Math.random();
    if (r < 0.35) return 'fast';
    if (r < 0.60) return 'heavy';
    return 'normal';
  }

  private pickWordForType(type: EnemyType): string {
    const any = () => this.nextWord();
    if (type === 'fast') {
      const pool = this.shortWords.length > 0 ? this.shortWords : this.baseWords;
      return Phaser.Utils.Array.GetRandom(pool);
    }
    if (type === 'heavy') {
      const pool = this.longWords.length > 0 ? this.longWords : this.baseWords;
      return Phaser.Utils.Array.GetRandom(pool);
    }
    // normal prefers longer words too
    const longish = this.baseWords.filter((w) => w.length >= 7);
    const pool = longish.length > 0 ? longish : this.baseWords;
    return Phaser.Utils.Array.GetRandom(pool);
  }

  private shuffleWords(words: string[]): string[] {
    const pool = [...words];
    Phaser.Utils.Array.Shuffle(pool);
    return pool;
  }
}
