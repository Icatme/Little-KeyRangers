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
  private textLayouts = new Map<Phaser.GameObjects.Text, () => void>();

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
    this.textLayouts.clear();

    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: '"Noto Sans SC", sans-serif',
      fontSize: '16px',
      color: '#f8fafc',
    };

    const spacing = 6;
    const { width, height } = this.scale;

    const createBadge = (
      x: number,
      y: number,
      texture: string,
      tint: number,
      initialText: string,
      alignment: 'left' | 'center' | 'right',
    ): { text: Phaser.GameObjects.Text; icon: Phaser.GameObjects.Image } => {
      const container = this.add.container(x, y);
      container.setDepth(30);
      const icon = this.add
        .image(0, 0, texture)
        .setDisplaySize(20, 20)
        .setTint(tint);
      const label = this.add.text(0, 0, initialText, style);
      container.add([icon, label]);

      const applyLayout = () => {
        const iconWidth = icon.displayWidth;
        const textWidth = label.displayWidth;
        switch (alignment) {
          case 'left':
            icon.setOrigin(0, 0.5);
            icon.setPosition(0, 0);
            label.setOrigin(0, 0.5);
            label.setPosition(iconWidth + spacing, 0);
            break;
          case 'right':
            icon.setOrigin(1, 0.5);
            icon.setPosition(0, 0);
            label.setOrigin(1, 0.5);
            label.setPosition(-iconWidth - spacing, 0);
            break;
          default: {
            const totalWidth = iconWidth + spacing + textWidth;
            icon.setOrigin(0.5, 0.5);
            label.setOrigin(0.5, 0.5);
            icon.setPosition(-totalWidth / 2 + iconWidth / 2, 0);
            label.setPosition(icon.x + iconWidth / 2 + spacing + textWidth / 2, 0);
            break;
          }
        }
      };

      this.textLayouts.set(label, applyLayout);
      applyLayout();
      return { text: label, icon };
    };

    this.scoreText = createBadge(18, 26, ICON_TEXTURE_KEYS.target, 0x38bdf8, 'Score: 0', 'left').text;
    this.comboText = createBadge(width - 18, 26, ICON_TEXTURE_KEYS.arrow, 0xfacc15, 'Combo: 0', 'right').text;
    this.enemyText = createBadge(width / 2, 26, ICON_TEXTURE_KEYS.enemy, 0xf87171, 'Enemies: 0', 'center').text;

    this.accuracyText = createBadge(18, height - 132, ICON_TEXTURE_KEYS.ranger, 0xf8fafc, 'Accuracy: 100%', 'left').text;

    const bombBadge = createBadge(18, height - 92, ICON_TEXTURE_KEYS.bomb, 0xf97316, 'Bombs: 0', 'left');
    this.bombIcon = bombBadge.icon;
    this.bombText = bombBadge.text;

    const wallBadge = createBadge(
      width - 18,
      height - 92,
      ICON_TEXTURE_KEYS.wallEmblem,
      0xcbd5f5,
      'Wall Integrity: 0/0',
      'right',
    );
    this.wallIcon = wallBadge.icon;
    this.wallText = wallBadge.text;

    this.messageText = this.add
      .text(this.scale.width / 2, this.scale.height - 44, '', {
        ...style,
        fontSize: '16px',
        color: '#e2e8f0',
      })
      .setOrigin(0.5);
  }

  private refreshBadgeLayout(text: Phaser.GameObjects.Text): void {
    const layout = this.textLayouts.get(text);
    layout?.();
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
      this.bombText.setText(`Bombs: recharging (${seconds}s)`);
      this.bombIcon.setTint(0x94a3b8);
    } else {
      this.bombText.setText(`Bombs: ${status.charges}/${status.maxCharges}`);
      this.bombIcon.setTint(status.charges > 0 ? 0xf97316 : 0x64748b);
    }
    this.refreshBadgeLayout(this.bombText);
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
    this.refreshBadgeLayout(this.wallText);
  }

  private handleBombActivated(): void {
    this.showMessage('炸弹爆裂，敌人被清除！');
  }
}
