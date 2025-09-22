import Phaser from 'phaser';

export interface TypingProgress {
  input: string;
  isMistake: boolean;
}

export class TypingSystem extends Phaser.Events.EventEmitter {
  private targetWord = '';
  private inputBuffer = '';
  private isMistake = false;
  private keyboardPlugin: Phaser.Input.Keyboard.KeyboardPlugin;

  constructor(scene: Phaser.Scene) {
    super();
    if (!scene.input.keyboard) {
      throw new Error('Keyboard plugin is not available.');
    }

    this.keyboardPlugin = scene.input.keyboard;
    this.keyboardPlugin.on('keydown', this.handleKeyDown, this);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.destroy();
    });
  }

  setTarget(word: string): void {
    this.targetWord = word;
    this.inputBuffer = '';
    this.isMistake = false;
    this.emit('progress', { input: this.inputBuffer, isMistake: false });
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.targetWord) {
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      if (this.inputBuffer.length > 0) {
        this.inputBuffer = this.inputBuffer.slice(0, -1);
      }
      this.isMistake = false;
      this.emit('progress', { input: this.inputBuffer, isMistake: this.isMistake });
      return;
    }

    if (event.key.length > 1) {
      return;
    }

    event.preventDefault();
    const nextInput = this.inputBuffer + event.key.toLowerCase();
    const normalizedTarget = this.targetWord.toLowerCase();

    if (normalizedTarget.startsWith(nextInput)) {
      this.inputBuffer = nextInput;
      this.isMistake = false;
      this.emit('progress', { input: this.inputBuffer, isMistake: false });

      if (this.inputBuffer.length === this.targetWord.length) {
        const completedWord = this.targetWord;
        this.emit('complete', completedWord);
      }
      return;
    }

    this.isMistake = true;
    this.emit('mistake');
    this.emit('progress', { input: this.inputBuffer, isMistake: true });
  }

  override destroy(): void {
    this.keyboardPlugin.off('keydown', this.handleKeyDown, this);
    super.destroy();
  }
}
