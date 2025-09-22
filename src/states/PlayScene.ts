import Phaser from 'phaser';
import wordPool from '../config/wordPools/easy.json';
import { EventBus, Events } from '../core/EventBus';
import { ScoreSystem } from '../systems/ScoreSystem';
import { TypingProgress, TypingSystem } from '../systems/TypingSystem';

interface WordPoolData {
  language: string;
  difficulty: string;
  words: string[];
}

export class PlayScene extends Phaser.Scene {
  private typingSystem!: TypingSystem;
  private scoreSystem!: ScoreSystem;
  private activeWord = '';
  private wordQueue: string[] = [];
  private wordText!: Phaser.GameObjects.Text;
  private inputText!: Phaser.GameObjects.Text;

  constructor() {
    super('PlayScene');
  }

  create(): void {
    this.scoreSystem = new ScoreSystem();
    this.ensureUIScene();
    this.setupTexts();

    this.typingSystem = new TypingSystem(this);
    this.typingSystem.on('progress', this.handleTypingProgress, this);
    this.typingSystem.on('complete', this.handleTypingComplete, this);
    this.typingSystem.on('mistake', this.handleTypingMistake, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.typingSystem.off('progress', this.handleTypingProgress, this);
      this.typingSystem.off('complete', this.handleTypingComplete, this);
      this.typingSystem.off('mistake', this.handleTypingMistake, this);
      this.typingSystem.destroy();
      this.input.keyboard?.off('keydown-ESC', this.returnToMenu, this);
    });

    this.wordQueue = this.shuffleWords(wordPool as WordPoolData);
    EventBus.emit(Events.ScoreUpdated, this.scoreSystem.summary());
    EventBus.emit(Events.DisplayMessage, '保持专注，准备迎战！');
    this.nextWord();

    this.input.keyboard?.on('keydown-ESC', this.returnToMenu, this);
  }

  private ensureUIScene(): void {
    if (this.scene.isActive('UIScene')) {
      this.scene.run('UIScene');
    } else {
      this.scene.launch('UIScene');
    }
  }

  private setupTexts(): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, 120, '输入出现的单词并按顺序击败所有敌人', {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#cbd5f5',
      })
      .setOrigin(0.5);

    this.wordText = this.add
      .text(width / 2, height / 2 - 30, '', {
        fontFamily: 'monospace',
        fontSize: '64px',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    this.inputText = this.add
      .text(width / 2, height / 2 + 40, '', {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: '#38bdf8',
      })
      .setOrigin(0.5);
  }

  private shuffleWords(data: WordPoolData): string[] {
    const pool = [...data.words];
    Phaser.Utils.Array.Shuffle(pool);
    return pool;
  }

  private nextWord(): void {
    if (this.wordQueue.length === 0) {
      this.finishRound();
      return;
    }

    this.activeWord = this.wordQueue.pop() ?? '';
    this.wordText.setText(this.activeWord);
    this.inputText.setText('');
    this.typingSystem.setTarget(this.activeWord);
    EventBus.emit(Events.WordChanged, this.activeWord);
  }

  private handleTypingProgress(progress: TypingProgress): void {
    this.inputText.setText(progress.input);
    this.inputText.setColor(progress.isMistake ? '#f87171' : '#38bdf8');
  }

  private handleTypingComplete(word: string): void {
    this.scoreSystem.registerSuccess(word.length);
    EventBus.emit(Events.DisplayMessage, `击败敌人：${word}`);
    this.nextWord();
  }

  private handleTypingMistake(): void {
    this.scoreSystem.registerMistake();
    EventBus.emit(Events.DisplayMessage, '输入错误，连击已重置');
  }

  private finishRound(): void {
    this.typingSystem.setTarget('');
    EventBus.emit(Events.DisplayMessage, '所有敌人被击败，干得好！');
    const summary = this.scoreSystem.summary();
    this.time.delayedCall(1200, () => {
      this.scene.stop('UIScene');
      this.scene.start('ResultScene', { summary });
    });
  }

  private returnToMenu(): void {
    this.scene.stop('UIScene');
    this.scene.start('MenuScene');
  }
}
