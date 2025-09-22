import Phaser from 'phaser';
import { ScoreSummary } from '../core/EventBus';
import { ICON_TEXTURE_KEYS } from '../core/IconTextureLoader';

interface ResultSceneData {
  summary: ScoreSummary;
  success: boolean;
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('ResultScene');
  }

  create(data: ResultSceneData): void {
    const { width, height } = this.scale;
    const accuracy = Number.isFinite(data.summary.accuracy)
      ? Math.round(data.summary.accuracy * 100)
      : 100;

    const title = data.success ? '守城成功' : '守城失败';
    const titleColor = data.success ? '#34d399' : '#f87171';

    this.cameras.main.setBackgroundColor('#020617');

    this.add
      .image(width / 2, height / 2, ICON_TEXTURE_KEYS.castle)
      .setDisplaySize(width * 0.95, height * 0.95)
      .setAlpha(0.16)
      .setDepth(-2);

    this.add
      .image(width / 2, height * 0.25, ICON_TEXTURE_KEYS.ranger)
      .setDisplaySize(200, 200)
      .setOrigin(0.5)
      .setAlpha(0.95);

    this.add
      .text(width / 2, height * 0.1, title, {
        fontFamily: '"Cinzel", "Noto Serif SC", serif',
        fontSize: '52px',
        color: titleColor,
      })
      .setOrigin(0.5);

    const panel = this.add
      .rectangle(width / 2, height * 0.58, width * 0.68, 260, 0x0b1220, 0.76)
      .setStrokeStyle(2, 0x1e293b);

    const metrics: Array<{ icon: string; tint: number; text: string }> = [
      { icon: ICON_TEXTURE_KEYS.target, tint: 0x38bdf8, text: `得分：${data.summary.score}` },
      { icon: ICON_TEXTURE_KEYS.arrow, tint: 0xfacc15, text: `连击：${data.summary.combo}` },
      {
        icon: ICON_TEXTURE_KEYS.enemy,
        tint: 0xf87171,
        text: `击败敌人：${data.summary.enemiesDefeated}（箭矢 ${data.summary.typedEliminations} / 炸弹 ${data.summary.bombEliminations}）`,
      },
      { icon: ICON_TEXTURE_KEYS.ranger, tint: 0xf1f5f9, text: `准确率：${accuracy}%` },
      { icon: ICON_TEXTURE_KEYS.bomb, tint: 0xf97316, text: `炸弹使用：${data.summary.bombsUsed}` },
      { icon: ICON_TEXTURE_KEYS.wallEmblem, tint: 0xcbd5f5, text: `城墙受损：${data.summary.breaches}` },
    ];

    const startY = panel.y - (metrics.length - 1) * 24;
    metrics.forEach((metric, index) => {
      const lineY = startY + index * 48;
      this.add
        .image(panel.x - panel.width / 2 + 50, lineY, metric.icon)
        .setDisplaySize(36, 36)
        .setTint(metric.tint)
        .setOrigin(0.5);
      this.add
        .text(panel.x - panel.width / 2 + 90, lineY, metric.text, {
          fontFamily: '"Noto Sans SC", sans-serif',
          fontSize: '22px',
          color: '#e2e8f0',
        })
        .setOrigin(0, 0.5);
    });


    const actionHint = this.add
      .text(width / 2, height * 0.88, '按空格重新开始，或按 M 返回主菜单', {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#facc15',
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: actionHint,
      alpha: { from: 0.4, to: 1 },
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    this.input.keyboard?.once('keydown-SPACE', this.restartGame, this);
    this.input.keyboard?.once('keydown-M', this.backToMenu, this);
    this.input.once('pointerdown', this.restartGame, this);
  }

  private restartGame(): void {
    this.scene.start('PlayScene');
  }

  private backToMenu(): void {
    this.scene.start('MenuScene');
  }
}
