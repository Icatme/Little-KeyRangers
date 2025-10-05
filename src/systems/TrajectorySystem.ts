import { Enemy } from '../entities/Enemy';

export class TrajectorySystem {
  private readonly enemies = new Set<Enemy>();

  register(enemy: Enemy): void {
    this.enemies.add(enemy);
  }

  unregister(enemy: Enemy): void {
    this.enemies.delete(enemy);
  }

  update(delta: number): void {
    this.enemies.forEach((enemy) => enemy.advance(delta));
  }
}
