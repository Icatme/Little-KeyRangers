import Phaser from 'phaser';
import { BombStatus, EventBus, Events, ScoreSummary, WallStatus } from './EventBus';

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private accuracyText!: Phaser.GameObjects.Text;
  private enemyText!: Phaser.GameObjects.Text;
  private bombText!: Phaser.GameObjects.Text;
  private wallText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private messageTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.setupTexts();

    EventBus.on(Events.ScoreUpdated, this.handleScoreUpdated, this);
    EventBus.on(Events.DisplayMessage, this.showMessage, this);
    EventBus.on(Events.BombStatusUpdated, this.updateBombStatus, this);
    EventBus.on(Events.WallStatusUpdated, this.updateWallStatus, this);
    EventBus.on(Events.BombActivated, this.handleBombActivated, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off(Events.ScoreUpdated, this.handleScoreUpdated, this);
      EventBus.off(Events.DisplayMessage, this.showMessage, this);
      EventBus.off(Events.BombStatusUpdated, this.updateBombStatus, this);
      EventBus.off(Events.WallStatusUpdated, this.updateWallStatus, this);
      EventBus.off(Events.BombActivated, this.handleBombActivated, this);
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
    this.enemyText = this.add.text(16, 100, 'Enemies: 0', style);
    this.bombText = this.add.text(16, 128, 'Bombs: 0', style);
    this.wallText = this.add.text(16, 156, 'Wall Integrity: 0/0', style);

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
    this.enemyText.setText(
      `Enemies: ${summary.enemiesDefeated} (Typed ${summary.typedEliminations} / Bomb ${summary.bombEliminations})`,
    );
  }

  private showMessage(message: string): void {
    this.messageText.setText(message);
    this.messageTimer?.remove(false);
    this.messageTimer = this.time.delayedCall(2500, () => {
      this.messageText.setText('');
    });
  }

  private updateBombStatus(status: BombStatus): void {
    if (status.cooldownRemaining > 0 && status.charges === 0) {
      const seconds = Math.ceil(status.cooldownRemaining / 1000);
      this.bombText.setText(`Bombs: recharging (${seconds}s)`);
    } else {
      this.bombText.setText(`Bombs: ${status.charges}/${status.maxCharges}`);
    }
  }

  private updateWallStatus(status: WallStatus): void {
    this.wallText.setText(`Wall Integrity: ${status.current}/${status.max}`);
    if (status.current / status.max <= 0.34) {
      this.wallText.setColor('#f87171');
    } else if (status.current / status.max <= 0.67) {
      this.wallText.setColor('#facc15');
    } else {
      this.wallText.setColor('#f8fafc');
    }
  }

  private handleBombActivated(): void {
    this.showMessage('炸弹爆裂，敌人被清除！');
  }
}
