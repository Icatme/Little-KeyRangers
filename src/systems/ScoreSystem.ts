import { EventBus, Events, ScoreSummary } from '../core/EventBus';

export class ScoreSystem {
  private score = 0;
  private combo = 0;
  private totalTypedChars = 0;
  private mistakes = 0;
  private wordsCompleted = 0;

  registerSuccess(wordLength: number): void {
    this.wordsCompleted += 1;
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

  summary(): ScoreSummary {
    return {
      score: this.score,
      combo: this.combo,
      accuracy: this.calculateAccuracy(),
      wordsCompleted: this.wordsCompleted,
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
