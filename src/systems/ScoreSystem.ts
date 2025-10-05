import { EventBus, Events, ScoreSummary } from '../core/EventBus';

export class ScoreSystem {
  private score = 0;
  private combo = 0;
  private totalTypedChars = 0;
  private mistakes = 0;
  private typedEliminations = 0;
  private bombEliminations = 0;
  private bombsUsed = 0;
  private breaches = 0;

  registerSuccess(wordLength: number): void {
    this.typedEliminations += 1;
    this.totalTypedChars += wordLength;
    this.combo += 1;
    const comboMultiplier = 1 + Math.floor(this.combo / 5) * 0.2;
    this.score += Math.floor(wordLength * 10 * comboMultiplier);
    this.publishUpdate();
  }

  registerMistake(): void {
    this.mistakes += 1;
    this.combo = 0;
    this.publishUpdate();
  }

  registerBombClear(eliminated: number): void {
    if (eliminated <= 0) {
      return;
    }

    this.bombsUsed += 1;
    this.bombEliminations += eliminated;
    this.score += eliminated * 15;
    this.publishUpdate();
  }

  registerBreach(): void {
    this.breaches += 1;
    this.mistakes += 1;
    this.combo = 0;
    this.publishUpdate();
  }

  getCombo(): number {
    return this.combo;
  }

  summary(): ScoreSummary {
    return {
      score: this.score,
      combo: this.combo,
      accuracy: this.calculateAccuracy(),
      enemiesDefeated: this.typedEliminations + this.bombEliminations,
      typedEliminations: this.typedEliminations,
      bombEliminations: this.bombEliminations,
      bombsUsed: this.bombsUsed,
      breaches: this.breaches,
    };
  }

  private calculateAccuracy(): number {
    const totalAttempts = this.totalTypedChars + this.mistakes;
    if (totalAttempts === 0) {
      return 1;
    }

    return this.totalTypedChars / totalAttempts;
  }

  private publishUpdate(): void {
    EventBus.emit(Events.ScoreUpdated, this.summary());
  }
}
