export class PlayerStats {
  private wallHealth: number;
  readonly maxWallHealth: number;

  constructor(maxWallHealth: number) {
    this.maxWallHealth = maxWallHealth;
    this.wallHealth = maxWallHealth;
  }

  takeDamage(amount = 1): number {
    this.wallHealth = Math.max(0, this.wallHealth - amount);
    return this.wallHealth;
  }

  getWallHealth(): number {
    return this.wallHealth;
  }

  repair(amount = 1): number {
    this.wallHealth = Math.min(this.maxWallHealth, this.wallHealth + amount);
    return this.wallHealth;
  }

  isDefeated(): boolean {
    return this.wallHealth <= 0;
  }

  reset(): void {
    this.wallHealth = this.maxWallHealth;
  }
}
