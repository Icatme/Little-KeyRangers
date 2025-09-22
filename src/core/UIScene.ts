import Phaser from 'phaser';
import { EventBus, Events, ScoreSummary } from './EventBus';

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private accuracyText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private messageTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.setupTexts();

    EventBus.on(Events.ScoreUpdated, this.handleScoreUpdated, this);
    EventBus.on(Events.DisplayMessage, this.showMessage, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off(Events.ScoreUpdated, this.handleScoreUpdated, this);
      EventBus.off(Events.DisplayMessage, this.showMessage, this);
    });
  }

  private setupTexts(): void {
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#f8fafc',
    };

    this.scoreText = this.add.text(16, 16, 'Score: 0', style);
    this.comboText = this.add.text(16, 44, 'Combo: 0', style);
    this.accuracyText = this.add.text(16, 72, 'Accuracy: 100%', style);

    this.messageText = this.add
      .text(this.scale.width / 2, this.scale.height - 40, '', {
        ...style,
        fontSize: '18px',
        color: '#e2e8f0',
      })
      .setOrigin(0.5);
  }

  private handleScoreUpdated(summary: ScoreSummary): void {
    this.scoreText.setText(`Score: ${summary.score}`);
    this.comboText.setText(`Combo: ${summary.combo}`);
    const accuracy = Number.isFinite(summary.accuracy)
      ? Math.round(summary.accuracy * 100)
      : 100;
    this.accuracyText.setText(`Accuracy: ${accuracy}%`);
  }

  private showMessage(message: string): void {
    this.messageText.setText(message);
    this.messageTimer?.remove(false);
    this.messageTimer = this.time.delayedCall(2500, () => {
      this.messageText.setText('');
    });
  }
}
