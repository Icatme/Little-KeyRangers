import Phaser from 'phaser';
import { Enemy, EnemyPath } from '../entities/Enemy';
import type { SpawnConfig } from '../config/stageConfig';

export class EnemySpawner extends Phaser.Events.EventEmitter {
  private readonly config: SpawnConfig;
  private readonly scene: Phaser.Scene;
  private readonly breachX: number;
  private readonly dangerZone: number;
  private readonly baseWords: string[];
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
    const word = this.nextWord();
    const path = Phaser.Utils.Array.GetRandom(this.config.paths);
    const spawnOffset = Phaser.Math.Between(80, 140);
    const x = this.scene.scale.width + spawnOffset;
    const y = Phaser.Math.Between(120, this.scene.scale.height - 120);
    const speed = Phaser.Math.FloatBetween(this.config.speed.min, this.config.speed.max);

    const enemy = new Enemy(this.scene, x, y, {
      word,
      path: path as EnemyPath,
      speed,
      breachX: this.breachX,
      dangerZone: this.dangerZone,
    });

    this.spawnedCount += 1;
    this.emit('spawn', enemy);
  }

  private nextWord(): string {
    if (this.wordBag.length === 0) {
      this.wordBag = this.shuffleWords(this.baseWords);
    }

    return this.wordBag.pop() ?? 'enemy';
  }

  private shuffleWords(words: string[]): string[] {
    const pool = [...words];
    Phaser.Utils.Array.Shuffle(pool);
    return pool;
  }
}
