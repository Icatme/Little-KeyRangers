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

  // Set a new target and seed input buffer with a prefix that must match the word
  setTargetWithInput(word: string, input: string): void {
    this.targetWord = word || '';
    const normalizedTarget = (this.targetWord || '').toLowerCase();
    const normalizedInput = (input || '').toLowerCase();

    if (!this.targetWord || !normalizedTarget.startsWith(normalizedInput)) {
      // Fallback: clear buffer if the provided input does not match the target word
      this.inputBuffer = '';
      this.isMistake = false;
      this.emit('progress', { input: this.inputBuffer, isMistake: false });
      return;
    }

    this.inputBuffer = normalizedInput;
    this.isMistake = false;
    this.emit('progress', { input: this.inputBuffer, isMistake: false });

    if (this.inputBuffer.length === this.targetWord.length) {
      const completedWord = this.targetWord;
      this.emit('complete', completedWord);
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Backspace') {
      event.preventDefault();
      // Clear all input at once
      this.inputBuffer = '';
      this.isMistake = false;
      this.emit('progress', { input: this.inputBuffer, isMistake: this.isMistake });
      // Notify scene to clear all typing previews if needed
      this.emit('clear');
      return;
    }

    if (event.key.length > 1) {
      if (event.key === 'Escape') {
        return;
      }
      return;
    }

    if (event.key.trim().length === 0) {
      return;
    }

    if (!/^[a-z0-9]$/i.test(event.key)) {
      return;
    }

    event.preventDefault();
    const char = event.key.toLowerCase();

    // When there is no input yet, allow scene to choose a target among all candidates
    if (this.inputBuffer.length === 0) {
      const initialInput = char;
      this.emit('freeType', initialInput);
      // If the scene accepted and seeded the input, it will have updated the buffer
      if (this.inputBuffer.length > 0) {
        return;
      }
    }

    if (!this.targetWord) {
      return;
    }

    const nextInput = this.inputBuffer + char;
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

    // Offer the scene a chance to re-target to another word matching the new input
    this.emit('mismatch', { nextInput, currentLength: this.inputBuffer.length });
    // If the scene re-targeted and seeded the buffer, it will equal nextInput now
    if (this.inputBuffer === nextInput) {
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
