import { EventBus, Events, BombStatus } from '../core/EventBus';

export interface BombConfig {
  initial: number;
  max: number;
  cooldown: number;
  comboThreshold: number;
}

export class BombSystem {
  private charges: number;
  private readonly maxCharges: number;
  private readonly cooldown: number;
  private cooldownRemaining = 0;
  private readonly comboThreshold: number;
  private lastAwardedCombo = 0;

  constructor(config: BombConfig) {
    this.charges = config.initial;
    this.maxCharges = config.max;
    this.cooldown = config.cooldown;
    this.comboThreshold = Math.max(1, config.comboThreshold);
    this.publishStatus();
  }

  update(delta: number): void {
    if (this.cooldownRemaining <= 0) {
      return;
    }

    this.cooldownRemaining = Math.max(0, this.cooldownRemaining - delta);
    if (this.cooldownRemaining === 0 && this.charges < this.maxCharges) {
      this.charges += 1;
      this.publishStatus();
    } else {
      this.publishStatus();
    }
  }

  canActivate(): boolean {
    return this.charges > 0;
  }

  getCharges(): number {
    return this.charges;
  }

  getMaxCharges(): number {
    return this.maxCharges;
  }

  activate(): boolean {
    if (!this.canActivate()) {
      return false;
    }

    this.charges -= 1;
    this.cooldownRemaining = this.cooldown;
    this.publishStatus();
    EventBus.emit(Events.BombActivated);
    return true;
  }

  addCharge(amount = 1): boolean {
    if (amount <= 0) {
      return false;
    }

    const previous = this.charges;
    this.charges = Math.min(this.maxCharges, this.charges + amount);
    if (this.charges !== previous) {
      this.cooldownRemaining = 0;
      this.publishStatus();
      return true;
    }

    this.publishStatus();
    return false;
  }

  registerCombo(combo: number): void {
    if (combo === 0) {
      this.lastAwardedCombo = 0;
      return;
    }

    if (combo % this.comboThreshold !== 0) {
      return;
    }

    if (combo === this.lastAwardedCombo) {
      return;
    }

    this.lastAwardedCombo = combo;
    this.grantCharge();
  }

  private grantCharge(): void {
    if (this.charges >= this.maxCharges) {
      return;
    }

    this.charges += 1;
    this.cooldownRemaining = 0;
    this.publishStatus();
  }

  private publishStatus(): void {
    const status: BombStatus = {
      charges: this.charges,
      maxCharges: this.maxCharges,
      cooldownRemaining: this.cooldownRemaining,
      cooldown: this.cooldown,
    };
    EventBus.emit(Events.BombStatusUpdated, status);
  }
}
