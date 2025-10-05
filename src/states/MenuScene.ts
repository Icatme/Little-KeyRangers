import Phaser from 'phaser';
import { ICON_TEXTURE_KEYS } from '../core/IconTextureLoader';
import { UI_TEXT, createButton, createPanel, fadeInScene } from '../core/UIStyle';
import { getStages, getCurrentStageIndex, isStageUnlocked, setCurrentStageIndex } from '../core/StageManager';

interface StageOption {
  name: string;
  description: string;
  difficulty: string;
  id: number;
}

export class MenuScene extends Phaser.Scene {
  private selectedStageIndex = 0;
  private readonly stages = getStages();
  private stageTexts: Phaser.GameObjects.Text[] = [];
  private stageInfoText!: Phaser.GameObjects.Text;
  private startHint!: Phaser.GameObjects.Text;
  private hintTween?: Phaser.Tweens.Tween;

  constructor() {
    super('MenuScene');
  }

  override create(): void {
    const { width, height } = this.scale;
    this.selectedStageIndex = getCurrentStageIndex();
    fadeInScene(this, 240);

    this.add
      .image(width / 2, height / 2, ICON_TEXTURE_KEYS.castle)
      .setDisplaySize(width * 0.95, height * 0.95)
      .setAlpha(0.18)
      .setDepth(-2);

    const banner = createPanel(this, width / 2, height * 0.2, width * 0.72, 116, { alpha: 0.85 });

    this.add.text(banner.x, banner.y - 18, 'Little Key Rangers', UI_TEXT.title).setOrigin(0.5);

    this.add.text(banner.x, banner.y + 40, '守护城墙的键盘游侠', { ...UI_TEXT.subtitle, fontSize: '22px' }).setOrigin(0.5);

    this.add
      .image(width / 2, height * 0.42, ICON_TEXTURE_KEYS.ranger)
      .setDisplaySize(220, 220)
      .setOrigin(0.5, 0.9)
      .setAlpha(0.95);

    // Settings entry
    createButton(this, width * 0.85, height * 0.2, 120, '设置', () => this.scene.start('SettingsScene'), { height: 40 });

    const stagePanel = createPanel(this, width / 2, height * 0.7, width * 0.68, 240, { alpha: 0.78 });

    this.add.text(stagePanel.x, stagePanel.y - stagePanel.height / 2 + 26, '选择关卡', { ...UI_TEXT.label, fontSize: '22px' }).setOrigin(0.5, 0);

    const optionLeft = stagePanel.x - stagePanel.width / 2 + 40;
    const optionTop = stagePanel.y - stagePanel.height / 2 + 66;

    this.stageTexts = this.stages.map((stage, index) => {
      const locked = !isStageUnlocked(index);
      const option = this.add
        .text(optionLeft, optionTop + index * 54, this.formatStageLabel(stage, locked), {
          ...UI_TEXT.label,
          fontSize: '20px',
          color: locked ? '#64748b' : '#cbd5f5',
        })
        .setOrigin(0, 0.5)
        .setAlpha(0);

      if (!locked) {
        option.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          this.updateSelection(index);
        });
      }

      return option;
    });

    this.stageInfoText = this.add
      .text(stagePanel.x, stagePanel.y + stagePanel.height / 2 - 52, '', {
        ...UI_TEXT.body,
        color: '#94a3b8',
        fontSize: '18px',
        wordWrap: { width: stagePanel.width - 80 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.startHint = this.add
      .text(stagePanel.x, stagePanel.y + stagePanel.height / 2 - 16, '', {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: '#facc15',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.startGame())
      .setAlpha(0);

    this.hintTween = this.tweens.add({
      targets: this.startHint,
      alpha: { from: 0.4, to: 1 },
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    this.add
      .image(width * 0.88, height * 0.85, ICON_TEXTURE_KEYS.target)
      .setDisplaySize(110, 110)
      .setAlpha(0.22)
      .setDepth(-1);

    this.input.keyboard?.on('keydown-SPACE', this.startGame, this);
    this.input.keyboard?.on('keydown-ENTER', this.startGame, this);
    this.input.keyboard?.on('keydown-UP', () => this.changeSelection(-1));
    this.input.keyboard?.on('keydown-DOWN', () => this.changeSelection(1));

    // Gentle fade-in for options/hints
    this.stageTexts.forEach((t, i) => {
      this.tweens.add({ targets: t, alpha: 1, duration: 260, delay: i * 60 });
    });
    this.updateSelection(this.selectedStageIndex);
    this.tweens.add({ targets: [this.stageInfoText, this.startHint], alpha: 1, duration: 240, delay: 240 });
  }

  private formatStageLabel(stage: StageOption, locked: boolean): string {
    const difficulty = this.difficultyShort(stage.difficulty);
    return locked ? `${stage.name} · ${difficulty}（未解锁）` : `${stage.name} · ${difficulty}`;
  }

  private difficultyShort(level: string): string {
    switch (level) {
      case 'easy':
        return '入门';
      case 'normal':
        return '进阶';
      case 'hard':
        return '终极';
      default:
        return level;
    }
  }

  private updateSelection(index: number): void {
    if (index < 0 || index >= this.stages.length) {
      return;
    }

    if (!isStageUnlocked(index)) {
      this.flashLockedHint();
      return;
    }

    this.selectedStageIndex = index;

    this.stageTexts.forEach((text, i) => {
      const locked = !isStageUnlocked(i);
      if (locked) {
        text.setColor('#64748b');
        text.setFontStyle('normal');
      } else if (i === this.selectedStageIndex) {
        text.setColor('#f8fafc');
        text.setFontStyle('bold');
      } else {
        text.setColor('#cbd5f5');
        text.setFontStyle('normal');
      }
    });

    const stage = this.stages[this.selectedStageIndex];
    this.stageInfoText.setText(stage.description);
    this.startHint.setText(`按空格/回车或点击开始（当前：${stage.name}）`);
  }

  private changeSelection(direction: number): void {
    let nextIndex = this.selectedStageIndex;
    const steps = this.stages.length;
    for (let i = 0; i < steps; i += 1) {
      nextIndex = (nextIndex + direction + this.stages.length) % this.stages.length;
      if (isStageUnlocked(nextIndex)) {
        this.updateSelection(nextIndex);
        return;
      }
    }
    this.flashLockedHint();
  }

  private flashLockedHint(): void {
    this.stageInfoText.setText('尚未解锁该关卡，请先完成前一关。');
    this.time.delayedCall(1200, () => {
      const stage = this.stages[this.selectedStageIndex];
      this.stageInfoText.setText(stage.description);
    });
  }

  private startGame(): void {
    if (!isStageUnlocked(this.selectedStageIndex)) {
      this.flashLockedHint();
      return;
    }

    const stage = this.stages[this.selectedStageIndex];
    setCurrentStageIndex(this.selectedStageIndex);
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('PlayScene', { stageId: stage.id });
    });
  }
}
