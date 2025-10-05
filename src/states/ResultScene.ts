import Phaser from 'phaser';
import { ScoreSummary } from '../core/EventBus';
import { ICON_TEXTURE_KEYS } from '../core/IconTextureLoader';
import { UI_TEXT, createButton, createPanel, fadeInScene, fadeOutScene } from '../core/UIStyle';
import { getStages, setCurrentStageIndex } from '../core/StageManager';

interface ResultSceneData {
  summary: ScoreSummary;
  success: boolean;
  stageId: number;
  stageIndex: number;
  stageName: string;
  hasNextStage: boolean;
  nextStageUnlocked: boolean;
}

export class ResultScene extends Phaser.Scene {
  private data!: ResultSceneData;

  constructor() {
    super('ResultScene');
  }

  override create(data: ResultSceneData): void {
    this.data = data;

    const { width, height } = this.scale;
    const accuracy = Number.isFinite(data.summary.accuracy)
      ? Math.round(data.summary.accuracy * 100)
      : 100;

    const title = data.success ? '守城成功' : '守城失败';
    const titleColor = data.success ? '#34d399' : '#f87171';

    fadeInScene(this, 220);

    this.add
      .image(width / 2, height / 2, ICON_TEXTURE_KEYS.castle)
      .setDisplaySize(width * 0.95, height * 0.95)
      .setAlpha(0.16)
      .setDepth(-2);

    this.add
      .image(width / 2, height * 0.25, ICON_TEXTURE_KEYS.ranger)
      .setDisplaySize(180, 180)
      .setOrigin(0.5)
      .setAlpha(0.95);

    this.add.text(width / 2, height * 0.1, title, { ...UI_TEXT.title, color: titleColor }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.18, `关卡：${data.stageName}`, { ...UI_TEXT.subtitle, fontSize: '22px', color: '#cbd5f5' }).setOrigin(0.5);

    const panel = createPanel(this, width / 2, height * 0.56, width * 0.68, 260, { alpha: 0.82 });

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
        .setDisplaySize(32, 32)
        .setTint(metric.tint)
        .setOrigin(0.5);
      this.add.text(panel.x - panel.width / 2 + 90, lineY, metric.text, { ...UI_TEXT.body, fontSize: '20px' }).setOrigin(0, 0.5);
    });

    const btnY = height * 0.86;
    const btnGap = 220;
    const buttons: Phaser.GameObjects.Container[] = [];
    const retryBtn = createButton(this, width / 2 - btnGap / 2, btnY, 180, '重试本关', () => this.restartGame());
    buttons.push(retryBtn);
    if (data.success && data.hasNextStage && data.nextStageUnlocked) {
      buttons.push(createButton(this, width / 2 + btnGap / 2, btnY, 180, '下一关', () => this.startNextStage()));
    } else {
      buttons.push(createButton(this, width / 2 + btnGap / 2, btnY, 180, '主菜单', () => this.backToMenu()));
    }

    // Keyboard shortcuts remain
    this.input.keyboard?.once('keydown-SPACE', this.restartGame, this);
    this.input.keyboard?.once('keydown-M', this.backToMenu, this);
    if (data.success && data.hasNextStage && data.nextStageUnlocked) {
      this.input.keyboard?.once('keydown-N', this.startNextStage, this);
    }
    this.input.once('pointerdown', this.restartGame, this);
  }

  private restartGame(): void {
    setCurrentStageIndex(this.data.stageIndex);
    fadeOutScene(this, 220, () => this.scene.start('PlayScene', { stageId: this.data.stageId }));
  }

  private startNextStage(): void {
    if (!this.data.success || !this.data.hasNextStage || !this.data.nextStageUnlocked) {
      return;
    }
    const nextStage = getStages()[this.data.stageIndex + 1];
    setCurrentStageIndex(this.data.stageIndex + 1);
    fadeOutScene(this, 220, () => this.scene.start('PlayScene', { stageId: nextStage.id }));
  }

  private backToMenu(): void {
    fadeOutScene(this, 220, () => this.scene.start('MenuScene'));
  }
}
