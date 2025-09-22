import Phaser from 'phaser';
import { ScoreSummary } from '../core/EventBus';

interface ResultSceneData {
  summary: ScoreSummary;
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

    this.add
      .text(width / 2, height / 2 - 100, '战斗总结', {
        fontFamily: 'sans-serif',
        fontSize: '42px',
        color: '#f1f5f9',
      })
      .setOrigin(0.5);

    const lines = [
      `得分：${data.summary.score}`,
      `连击：${data.summary.combo}`,
      `击败敌人：${data.summary.wordsCompleted}`,
      `准确率：${accuracy}%`,
    ];

    this.add
      .text(width / 2, height / 2, lines.join('\n'), {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        color: '#cbd5f5',
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 140, '按空格重新开始，或按 M 返回主菜单', {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#94a3b8',
      })
      .setOrigin(0.5);

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
