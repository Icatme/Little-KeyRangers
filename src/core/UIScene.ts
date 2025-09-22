import Phaser from 'phaser';
import { BombStatus, EventBus, Events, ScoreSummary, WallStatus } from './EventBus';
import { ICON_TEXTURE_KEYS } from './IconTextureLoader';

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private accuracyText!: Phaser.GameObjects.Text;
  private enemyText!: Phaser.GameObjects.Text;
  private bombText!: Phaser.GameObjects.Text;
  private wallText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private messageTimer?: Phaser.Time.TimerEvent;
  private bombIcon!: Phaser.GameObjects.Image;
  private wallIcon!: Phaser.GameObjects.Image;

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
      fontFamily: '"Noto Sans SC", sans-serif',
      fontSize: '20px',
      color: '#f8fafc',
    };

    const panel = this.add
      .rectangle(16, 16, 368, 184, 0x020617, 0.7)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x1e293b);

    const baseX = panel.x + 64;
    let lineY = panel.y + 32;
    const lineGap = 28;

    const makeIcon = (texture: string, tint: number) =>
      this.add
        .image(panel.x + 32, lineY, texture)
        .setDisplaySize(28, 28)
        .setTint(tint)
        .setOrigin(0.5);

    makeIcon(ICON_TEXTURE_KEYS.target, 0x38bdf8);
    this.scoreText = this.add.text(baseX, lineY, 'Score: 0', style).setOrigin(0, 0.5);
    lineY += lineGap;

    makeIcon(ICON_TEXTURE_KEYS.arrow, 0xfacc15);
    this.comboText = this.add.text(baseX, lineY, 'Combo: 0', style).setOrigin(0, 0.5);
    lineY += lineGap;

    makeIcon(ICON_TEXTURE_KEYS.ranger, 0xf8fafc);
    this.accuracyText = this.add.text(baseX, lineY, 'Accuracy: 100%', style).setOrigin(0, 0.5);
    lineY += lineGap;

    this.add
      .image(panel.x + 32, lineY, ICON_TEXTURE_KEYS.enemy)
      .setDisplaySize(28, 28)
      .setTint(0xf87171)
      .setOrigin(0.5);
    this.enemyText = this.add
      .text(baseX, lineY, 'Enemies: 0', style)
      .setOrigin(0, 0.5);
    lineY += lineGap;

    this.bombIcon = this.add
      .image(panel.x + 32, lineY, ICON_TEXTURE_KEYS.bomb)
      .setDisplaySize(28, 28)
      .setTint(0xf97316)
      .setOrigin(0.5);
    this.bombText = this.add
      .text(baseX, lineY, 'Bombs: 0', style)
      .setOrigin(0, 0.5);
    lineY += lineGap;

    this.wallIcon = this.add
      .image(panel.x + 32, lineY, ICON_TEXTURE_KEYS.wallEmblem)
      .setDisplaySize(28, 28)
      .setTint(0xcbd5f5)
      .setOrigin(0.5);
    this.wallText = this.add
      .text(baseX, lineY, 'Wall Integrity: 0/0', style)
      .setOrigin(0, 0.5);

    this.messageText = this.add
      .text(this.scale.width / 2, this.scale.height - 44, '', {
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
      this.bombIcon.setTint(0x94a3b8);
    } else {
      this.bombText.setText(`Bombs: ${status.charges}/${status.maxCharges}`);
      this.bombIcon.setTint(status.charges > 0 ? 0xf97316 : 0x64748b);
    }
  }

  private updateWallStatus(status: WallStatus): void {
    this.wallText.setText(`Wall Integrity: ${status.current}/${status.max}`);
    const ratio = status.max === 0 ? 1 : status.current / status.max;
    if (ratio <= 0.34) {
      this.wallText.setColor('#f87171');
      this.wallIcon.setTint(0xf87171);
    } else if (ratio <= 0.67) {
      this.wallText.setColor('#facc15');
      this.wallIcon.setTint(0xfacc15);
    } else {
      this.wallText.setColor('#f8fafc');
      this.wallIcon.setTint(0xcbd5f5);
    }
  }

  private handleBombActivated(): void {
    this.showMessage('炸弹爆裂，敌人被清除！');
  }
}
