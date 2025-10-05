import Phaser from 'phaser';
import { ICON_TEXTURE_KEYS } from '../core/IconTextureLoader';
import { UI_TEXT, createButton, createPanel, fadeInScene } from '../core/UIStyle';

interface PauseSceneData {
  stageId: number;
  stageName: string;
}

export class PauseScene extends Phaser.Scene {
  private data!: PauseSceneData;

  constructor() {
    super('PauseScene');
  }

  override create(data: PauseSceneData): void {
    this.data = data;

    const { width, height } = this.scale;

    fadeInScene(this, 180);

    createPanel(this, width / 2, height / 2, width * 0.6, height * 0.7, { alpha: 0.9 });

    this.add
      .image(width / 2, height * 0.32, ICON_TEXTURE_KEYS.ranger)
      .setDisplaySize(140, 140)
      .setAlpha(0.9);

    this.add.text(width / 2, height * 0.18, '战斗暂歇', UI_TEXT.title).setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.25, `当前关卡：${data.stageName}`, {
        fontFamily: '"Noto Sans SC", sans-serif',
        fontSize: '20px',
        color: '#cbd5f5',
      })
      .setOrigin(0.5);

    const options: Array<{ label: string; keyHint: string; handler: () => void }> = [
      { label: '继续守城', keyHint: 'Enter / Esc', handler: () => this.resumeGame() },
      { label: '重新挑战本关', keyHint: 'R', handler: () => this.restartStage() },
      { label: '游戏设置', keyHint: 'S', handler: () => this.openSettings() },
      { label: '返回主菜单', keyHint: 'M', handler: () => this.backToMenu() },
    ];

    const startY = height * 0.45;
    const gap = 70;
    options.forEach((option, index) => {
      const y = startY + index * gap;
      const btn = createButton(this, width / 2, y, width * 0.4, option.label, option.handler, { height: 56 });
      const hint = this.add.text(btn.x, btn.y + 18, `快捷键：${option.keyHint}`, { ...UI_TEXT.subtitle, fontSize: '16px' }).setOrigin(0.5);
    });

    const keyboard = this.input.keyboard;
    const bindKey = (code: string, handler: () => void) => {
      keyboard?.once(code, (event: KeyboardEvent) => {
        event.preventDefault();
        handler();
      });
    };

    bindKey('keydown-ESC', () => this.resumeGame());
    bindKey('keydown-ENTER', () => this.resumeGame());
    bindKey('keydown-R', () => this.restartStage());
    bindKey('keydown-M', () => this.backToMenu());
    bindKey('keydown-P', () => this.resumeGame());
    bindKey('keydown-S', () => this.openSettings());

  }

  private resumeGame(): void {
    this.scene.resume('UIScene');
    this.scene.resume('PlayScene');
    this.scene.stop();
  }

  private restartStage(): void {
    this.scene.stop('UIScene');
    this.scene.stop('PlayScene');
    this.scene.stop();
    this.scene.start('PlayScene', { stageId: this.data.stageId });
  }

  private backToMenu(): void {
    this.scene.stop('UIScene');
    this.scene.stop('PlayScene');
    this.scene.stop();
    this.scene.start('MenuScene');
  }

  private openSettings(): void {
    // Go to settings; stop play to avoid input conflicts
    this.scene.stop('UIScene');
    this.scene.stop('PlayScene');
    this.scene.stop();
    this.scene.start('SettingsScene');
  }
}
