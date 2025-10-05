import Phaser from 'phaser';
import { BombStatus, EventBus, Events, ScoreSummary, WallStatus } from './EventBus';
import { ICON_TEXTURE_KEYS } from './IconTextureLoader';
import { createBadge } from './UIStyle';

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
  private textLayouts = new Map<Phaser.GameObjects.Text, () => void>();

  constructor() {
    super('UIScene');
  }

  override create(): void {
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
    this.textLayouts.clear();

    const { width, height } = this.scale;

    const b1 = createBadge(this, 18, 26, ICON_TEXTURE_KEYS.target, 0x38bdf8, '积分：0', 'left');
    this.scoreText = b1.text;
    this.textLayouts.set(this.scoreText, b1.applyLayout);

    const b2 = createBadge(this, width - 18, 26, ICON_TEXTURE_KEYS.arrow, 0xfacc15, '连击：0', 'right');
    this.comboText = b2.text;
    this.textLayouts.set(this.comboText, b2.applyLayout);

    const b3 = createBadge(this, width / 2, 26, ICON_TEXTURE_KEYS.enemy, 0xf87171, '敌人：0', 'center');
    this.enemyText = b3.text;
    this.textLayouts.set(this.enemyText, b3.applyLayout);

    const b4 = createBadge(this, 18, height - 132, ICON_TEXTURE_KEYS.ranger, 0xf8fafc, '准确率：100%', 'left');
    this.accuracyText = b4.text;
    this.textLayouts.set(this.accuracyText, b4.applyLayout);

    const b5 = createBadge(this, 18, height - 92, ICON_TEXTURE_KEYS.bomb, 0xf97316, '炸弹：0', 'left');
    this.bombIcon = b5.icon;
    this.bombText = b5.text;
    this.textLayouts.set(this.bombText, b5.applyLayout);

    const b6 = createBadge(this, width - 18, height - 92, ICON_TEXTURE_KEYS.wallEmblem, 0xcbd5f5, '城墙耐久：0/0', 'right');
    this.wallIcon = b6.icon;
    this.wallText = b6.text;
    this.textLayouts.set(this.wallText, b6.applyLayout);

    this.messageText = this.add.text(this.scale.width / 2, this.scale.height - 44, '', {
      fontFamily: '"Noto Sans SC", sans-serif',
      fontSize: '16px',
      color: '#e2e8f0',
    }).setOrigin(0.5);
  }

  private refreshBadgeLayout(text: Phaser.GameObjects.Text): void {
    const layout = this.textLayouts.get(text);
    layout?.();
  }

  private handleScoreUpdated(summary: ScoreSummary): void {
    this.scoreText.setText(`积分：${summary.score}`);
    this.comboText.setText(`连击：${summary.combo}`);
    const accuracy = Number.isFinite(summary.accuracy)
      ? Math.round(summary.accuracy * 100)
      : 100;
    this.accuracyText.setText(`准确率：${accuracy}%`);
    this.enemyText.setText(`敌人：${summary.enemiesDefeated}（箭矢 ${summary.typedEliminations} / 炸弹 ${summary.bombEliminations}）`);
    this.refreshBadgeLayout(this.scoreText);
    this.refreshBadgeLayout(this.comboText);
    this.refreshBadgeLayout(this.accuracyText);
    this.refreshBadgeLayout(this.enemyText);
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
      this.bombText.setText(`炸弹：充能中（${seconds}s）`);
      this.bombIcon.setTint(0x94a3b8);
    } else {
      this.bombText.setText(`炸弹：${status.charges}/${status.maxCharges}`);
      this.bombIcon.setTint(status.charges > 0 ? 0xf97316 : 0x64748b);
    }
    this.refreshBadgeLayout(this.bombText);
  }

  private updateWallStatus(status: WallStatus): void {
    this.wallText.setText(`城墙耐久：${status.current}/${status.max}`);
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
    this.refreshBadgeLayout(this.wallText);
  }

  private handleBombActivated(): void {
    this.showMessage('炸弹爆裂，敌人被清除！');
  }
}
