import Phaser from 'phaser';
import wordPool from '../config/wordPools/easy.json';
import { defaultStage, StageConfig } from '../config/stageConfig';
import { EventBus, Events } from '../core/EventBus';
import { ScoreSystem } from '../systems/ScoreSystem';
import { TypingProgress, TypingSystem } from '../systems/TypingSystem';
import { BombSystem } from '../systems/BombSystem';
import { Enemy, EnemyEliminationCause } from '../entities/Enemy';
import { EnemySpawner } from '../systems/EnemySpawner';
import { TrajectorySystem } from '../systems/TrajectorySystem';
import { PlayerStats } from '../entities/PlayerStats';
import { ICON_TEXTURE_KEYS } from '../core/IconTextureLoader';

interface WordPoolData {
  language: string;
  difficulty: string;
  words: string[];
}

interface BombClearSummary {
  total: number;
}

export class PlayScene extends Phaser.Scene {
  private typingSystem!: TypingSystem;
  private scoreSystem!: ScoreSystem;
  private bombSystem!: BombSystem;
  private enemySpawner!: EnemySpawner;
  private trajectorySystem!: TrajectorySystem;
  private playerStats!: PlayerStats;

  private readonly stageConfig: StageConfig = defaultStage;
  private activeEnemies: Enemy[] = [];
  private currentEnemy?: Enemy;
  private defeatedCount = 0;
  private stageFinished = false;
  private breachY = 0;

  private ranger!: Phaser.GameObjects.Image;
  private wall!: Phaser.GameObjects.Image;
  private targetPanel!: Phaser.GameObjects.Rectangle;
  private targetIcon!: Phaser.GameObjects.Image;
  private targetWordText!: Phaser.GameObjects.Text;
  private inputText!: Phaser.GameObjects.Text;

  constructor() {
    super('PlayScene');
  }

  create(): void {
    this.stageFinished = false;
    this.defeatedCount = 0;
    this.activeEnemies = [];

    this.scoreSystem = new ScoreSystem();
    this.playerStats = new PlayerStats(this.stageConfig.wall.maxHp);
    this.bombSystem = new BombSystem(this.stageConfig.bombs);
    this.trajectorySystem = new TrajectorySystem();

    this.ensureUIScene();
    this.cameras.main.setBackgroundColor('#020617');
    this.breachY = this.scale.height - 120;
    this.setupBattlefield();
    this.setupTexts();

    this.typingSystem = new TypingSystem(this);
    this.typingSystem.on('progress', this.handleTypingProgress, this);
    this.typingSystem.on('complete', this.handleTypingComplete, this);
    this.typingSystem.on('mistake', this.handleTypingMistake, this);

    const pool = wordPool as WordPoolData;
    this.enemySpawner = new EnemySpawner(
      this,
      this.stageConfig.spawn,
      pool.words,
      this.breachY,
      this.stageConfig.dangerZone,
    );
    this.enemySpawner.on('spawn', this.handleEnemySpawn, this);

    EventBus.emit(Events.ScoreUpdated, this.scoreSystem.summary());
    EventBus.emit(Events.DisplayMessage, '敌人来袭，保卫城墙！');
    EventBus.emit(Events.WallStatusUpdated, {
      current: this.playerStats.getWallHealth(),
      max: this.playerStats.maxWallHealth,
    });

    this.input.keyboard?.on('keydown-ESC', this.returnToMenu, this);
    this.input.keyboard?.on('keydown-SPACE', this.tryActivateBomb, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.typingSystem.off('progress', this.handleTypingProgress, this);
      this.typingSystem.off('complete', this.handleTypingComplete, this);
      this.typingSystem.off('mistake', this.handleTypingMistake, this);
      this.typingSystem.destroy();
      this.enemySpawner.off('spawn', this.handleEnemySpawn, this);
      this.input.keyboard?.off('keydown-ESC', this.returnToMenu, this);
      this.input.keyboard?.off('keydown-SPACE', this.tryActivateBomb, this);
    });
  }

  update(_: number, delta: number): void {
    if (this.stageFinished) {
      return;
    }

    this.enemySpawner.update(delta, this.activeEnemies.length);
    this.trajectorySystem.update(delta);
    this.bombSystem.update(delta);
    this.checkForStageCompletion();
  }

  private ensureUIScene(): void {
    if (this.scene.isActive('UIScene')) {
      this.scene.run('UIScene');
    } else {
      this.scene.launch('UIScene');
    }
  }

  private setupBattlefield(): void {
    const { width, height } = this.scale;

    this.add
      .image(width / 2, height / 2 - 24, ICON_TEXTURE_KEYS.castle)
      .setDisplaySize(width * 1.1, height * 1.1)
      .setAlpha(0.18)
      .setDepth(-6);

    this.add
      .rectangle(width / 2, height / 2, width, height, 0x061125, 0.6)
      .setDepth(-5);

    this.add
      .rectangle(width / 2, this.breachY + 90, width, 180, 0x111827, 0.82)
      .setDepth(-4)
      .setStrokeStyle(2, 0x1e293b);

    this.wall = this.add
      .image(width / 2, this.breachY + 58, ICON_TEXTURE_KEYS.wallEmblem)
      .setDisplaySize(width * 0.62, 180)
      .setAlpha(0.82)
      .setDepth(-3);

    for (let i = 0; i < width; i += 80) {
      this.add
        .rectangle(40 + i, this.breachY - 28, 58, 24, 0x0f172a, 0.9)
        .setStrokeStyle(2, 0x1e293b)
        .setDepth(-2);
    }

    this.ranger = this.add
      .image(width / 2, this.breachY - 24, ICON_TEXTURE_KEYS.ranger)
      .setDisplaySize(140, 140)
      .setOrigin(0.5, 0.92)
      .setDepth(-1);

    this.add
      .rectangle(width / 2, 64, width * 0.7, 50, 0x0f172a, 0.72)
      .setStrokeStyle(2, 0x1e293b)
      .setDepth(-2);

    this.add
      .text(width / 2, 64, '输入目标敌人单词发射箭矢，空格键释放炸弹', {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: '#cbd5f5',
      })
      .setOrigin(0.5)
      .setDepth(-1);
  }

  private setupTexts(): void {
    const { width } = this.scale;

    this.targetPanel = this.add
      .rectangle(width / 2, 156, width * 0.62, 150, 0x0b1220, 0.72)
      .setStrokeStyle(2, 0x1e293b);

    this.targetIcon = this.add
      .image(width / 2, this.targetPanel.y - 58, ICON_TEXTURE_KEYS.target)
      .setDisplaySize(88, 88)
      .setDepth(1)
      .setVisible(false);

    this.targetWordText = this.add
      .text(width / 2, this.targetPanel.y + 6, '', {
        fontFamily: '"Noto Sans Mono", monospace',
        fontSize: '56px',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    this.inputText = this.add
      .text(width / 2, this.targetPanel.y + 58, '', {
        fontFamily: '"Noto Sans Mono", monospace',
        fontSize: '40px',
        color: '#38bdf8',
      })
      .setOrigin(0.5);
  }

  private handleEnemySpawn(enemy: Enemy): void {
    enemy.setDepth(5);
    enemy.setProgress(0);
    this.activeEnemies.push(enemy);
    this.trajectorySystem.register(enemy);

    enemy.once('eliminated', ({ cause }: { cause: EnemyEliminationCause }) => {
      this.handleEnemyEliminated(enemy, cause);
    });
    enemy.once('breached', () => {
      this.handleEnemyBreach(enemy);
    });

    this.refreshTargetSelection();
  }

  private handleEnemyEliminated(enemy: Enemy, cause: EnemyEliminationCause): void {
    this.removeEnemy(enemy);
    this.defeatedCount += 1;

    if (cause === 'arrow') {
      EventBus.emit(Events.DisplayMessage, '箭矢命中，敌人坠落！');
    }

    this.refreshTargetSelection();
    this.checkForStageCompletion();
  }

  private handleEnemyBreach(enemy: Enemy): void {
    if (this.stageFinished) {
      return;
    }

    this.removeEnemy(enemy);
    const remaining = this.playerStats.takeDamage(1);
    this.scoreSystem.registerBreach();
    this.bombSystem.registerCombo(this.scoreSystem.getCombo());
    EventBus.emit(Events.WallStatusUpdated, {
      current: remaining,
      max: this.playerStats.maxWallHealth,
    });
    EventBus.emit(Events.DisplayMessage, '敌人撞击城墙，注意防守！');

    if (this.playerStats.isDefeated()) {
      this.finishRound(false);
      return;
    }

    this.refreshTargetSelection();
  }

  private refreshTargetSelection(): void {
    const nextTarget = this.pickNextTarget();
    if (nextTarget === this.currentEnemy) {
      return;
    }

    if (this.currentEnemy) {
      this.currentEnemy.markAsTargeted(false);
    }

    this.currentEnemy = nextTarget;

    if (!nextTarget) {
      this.typingSystem.setTarget('');
      this.targetWordText.setText('');
      this.inputText.setText('');
      this.inputText.setColor('#38bdf8');
      this.targetPanel.setAlpha(0.55);
      this.targetIcon.setVisible(false);
      return;
    }

    nextTarget.markAsTargeted(true);
    nextTarget.setProgress(0);
    this.typingSystem.setTarget(nextTarget.word);
    this.targetWordText.setText(nextTarget.word);
    this.inputText.setText('');
    this.inputText.setColor('#38bdf8');
    this.targetPanel.setAlpha(0.9);
    this.targetPanel.setStrokeStyle(2, 0x1e293b);
    this.targetIcon.setVisible(true);
    this.targetIcon.setTint(0xffffff);
    EventBus.emit(Events.WordChanged, nextTarget.word);
  }

  private pickNextTarget(): Enemy | undefined {
    if (this.activeEnemies.length === 0) {
      return undefined;
    }

    const sorted = [...this.activeEnemies];
    sorted.sort((a, b) => b.y - a.y);
    return sorted[0];
  }

  private handleTypingProgress(progress: TypingProgress): void {
    this.inputText.setText(progress.input);
    this.inputText.setColor(progress.isMistake ? '#f87171' : '#38bdf8');
    if (progress.isMistake) {
      this.targetIcon.setTint(0xf87171);
      this.targetPanel.setStrokeStyle(3, 0xf87171);
    } else {
      this.targetIcon.setTint(0xffffff);
      this.targetPanel.setStrokeStyle(2, 0x1e293b);
    }
    if (this.currentEnemy) {
      this.currentEnemy.setProgress(progress.input.length);
    }
  }

  private handleTypingComplete(word: string): void {
    if (!this.currentEnemy) {
      return;
    }

    const target = this.currentEnemy;
    this.scoreSystem.registerSuccess(word.length);
    this.bombSystem.registerCombo(this.scoreSystem.getCombo());
    target.setProgress(word.length);
    this.typingSystem.setTarget('');
    this.targetIcon.setTint(0xffffff);
    this.launchArrow(target);
  }

  private handleTypingMistake(): void {
    this.scoreSystem.registerMistake();
    this.bombSystem.registerCombo(this.scoreSystem.getCombo());
    this.targetIcon.setTint(0xf87171);
    this.targetPanel.setStrokeStyle(3, 0xf87171);
    EventBus.emit(Events.DisplayMessage, '输入错误，连击已重置');
  }

  private launchArrow(target: Enemy): void {
    const startX = this.ranger.x;
    const startY = this.ranger.y - this.ranger.displayHeight * 0.82;
    const arrow = this.add
      .image(startX, startY, ICON_TEXTURE_KEYS.arrow)
      .setDisplaySize(54, 54)
      .setDepth(12);

    const updateRotation = () => {
      const angle = Phaser.Math.Angle.Between(arrow.x, arrow.y, target.x, target.y - 28);
      arrow.setRotation(angle);
    };

    updateRotation();

    this.tweens.add({
      targets: arrow,
      x: target.x,
      y: target.y - 28,
      duration: 220,
      ease: Phaser.Math.Easing.Cubic.Out,
      onUpdate: updateRotation,
      onComplete: () => {
        target.hitByArrow();
        arrow.destroy();
      },
    });
  }

  private tryActivateBomb(event: KeyboardEvent): void {
    event.preventDefault();
    if (this.activeEnemies.length === 0) {
      EventBus.emit(Events.DisplayMessage, '暂时没有敌人，炸弹保持待命');
      return;
    }

    if (!this.bombSystem.canActivate() || !this.bombSystem.activate()) {
      EventBus.emit(Events.DisplayMessage, '炸弹尚在冷却中');
      return;
    }

    const explosion = this.add
      .image(this.scale.width / 2, this.breachY - 160, ICON_TEXTURE_KEYS.bomb)
      .setDisplaySize(220, 220)
      .setAlpha(0.85)
      .setDepth(20)
      .setScale(0.6);

    this.tweens.add({
      targets: explosion,
      alpha: 0,
      scale: 1.4,
      duration: 360,
      ease: Phaser.Math.Easing.Cubic.Out,
      onComplete: () => explosion.destroy(),
    });

    const targets = [...this.activeEnemies];
    this.currentEnemy?.markAsTargeted(false);
    this.currentEnemy = undefined;
    this.typingSystem.setTarget('');
    this.targetWordText.setText('');
    this.inputText.setText('');
    this.targetIcon.setVisible(false);

    targets.forEach((enemy) => enemy.eliminateByBomb());

    const summary: BombClearSummary = { total: targets.length };
    this.scoreSystem.registerBombClear(summary.total);
    EventBus.emit(Events.DisplayMessage, `炸弹清除了 ${summary.total} 名敌人！`);
  }

  private removeEnemy(enemy: Enemy): void {
    this.trajectorySystem.unregister(enemy);
    this.activeEnemies = this.activeEnemies.filter((active) => active !== enemy);
    if (this.currentEnemy === enemy) {
      this.currentEnemy = undefined;
    }
  }

  private checkForStageCompletion(): void {
    if (this.stageFinished) {
      return;
    }

    if (this.defeatedCount >= this.stageConfig.spawn.total && this.activeEnemies.length === 0) {
      this.finishRound(true);
    }
  }

  private finishRound(success: boolean): void {
    if (this.stageFinished) {
      return;
    }

    this.stageFinished = true;
    this.enemySpawner.stop();
    this.typingSystem.setTarget('');
    this.targetIcon.setVisible(false);

    const summary = this.scoreSystem.summary();
    EventBus.emit(Events.DisplayMessage, success ? '胜利！城墙安然无恙。' : '城墙沦陷，守城失败。');

    this.time.delayedCall(900, () => {
      this.scene.stop('UIScene');
      this.scene.start('ResultScene', { summary, success });
    });
  }

  private returnToMenu(): void {
    this.stageFinished = true;
    this.enemySpawner.stop();
    this.scene.stop('UIScene');
    this.scene.start('MenuScene');
  }
}
