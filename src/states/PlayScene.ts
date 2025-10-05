import Phaser from 'phaser';
import { StageConfig } from '../config/stageConfig';
import { EventBus, Events } from '../core/EventBus';
import { ScoreSystem } from '../systems/ScoreSystem';
import { TypingProgress, TypingSystem } from '../systems/TypingSystem';
import { BombSystem } from '../systems/BombSystem';
import { Enemy, EnemyEliminationCause } from '../entities/Enemy';
import { EnemySpawner } from '../systems/EnemySpawner';
import { TrajectorySystem } from '../systems/TrajectorySystem';
import { PlayerStats } from '../entities/PlayerStats';
import { ICON_TEXTURE_KEYS } from '../core/IconTextureLoader';
import { Boss } from '../entities/Boss';
import { Powerup, PowerupCollectTrigger, PowerupType } from '../entities/Powerup';
import { getStageContext, getStages, isStageUnlocked, markStageCompleted } from '../core/StageManager';
import { StageDefinition } from '../config/stages';
import { WordBankManager } from '../core/WordBankManager';
import { SettingsManager } from '../core/SettingsManager';

interface PlaySceneData {
  stageId?: number;
}

interface BombClearSummary {
  total: number;
}

type WordTarget = Enemy | Boss | Powerup;

export class PlayScene extends Phaser.Scene {
  private typingSystem!: TypingSystem;
  private scoreSystem!: ScoreSystem;
  private bombSystem!: BombSystem;
  private enemySpawner!: EnemySpawner;
  private trajectorySystem!: TrajectorySystem;
  private playerStats!: PlayerStats;

  private stageDefinition!: StageDefinition;
  private stageConfig!: StageConfig;
  private stageIndex = 0;
  private dropRate = 0;
  private bossTriggerCount = 0;

  private activeEnemies: Enemy[] = [];
  private currentTarget?: WordTarget;
  private boss?: Boss;
  private bossSpawned = false;
  private bossDefeated = false;
  private defeatedCount = 0;
  private stageFinished = false;
  private breachX = 0;

  private powerups: Powerup[] = [];

  private pauseMenuOpen = false;

  private ranger!: Phaser.GameObjects.Image;
  private wall!: Phaser.GameObjects.Image;
  private stageBanner!: Phaser.GameObjects.Text;
  private stageDetailText!: Phaser.GameObjects.Text;

  constructor() {
    super('PlayScene');
  }

  override init(data: PlaySceneData): void {
    const context = getStageContext(data?.stageId);
    this.stageDefinition = context.stage;
    this.stageConfig = this.stageDefinition.stageConfig;
    this.stageIndex = context.index;
    this.dropRate = this.stageDefinition.dropRate;
  }

  override create(): void {
    // Smooth scene entry
    this.cameras.main.fadeIn(220, 0, 0, 0);
    this.stageFinished = false;
    this.defeatedCount = 0;
    this.activeEnemies = [];
    this.currentTarget = undefined;
    this.boss = undefined;
    this.bossSpawned = false;
    this.bossDefeated = false;
    this.powerups = [];

    this.pauseMenuOpen = false;
    this.scoreSystem = new ScoreSystem();
    this.playerStats = new PlayerStats(this.stageConfig.wall.maxHp);
    this.bombSystem = new BombSystem(this.stageConfig.bombs);
    this.trajectorySystem = new TrajectorySystem();

    this.ensureUIScene();
    this.cameras.main.setBackgroundColor('#020617');
    // Add castle background image (covers whole screen)
    const { width, height } = this.scale;
    const bg = this.add.image(width / 2, height / 2, 'bg-castle').setDepth(-10).setScrollFactor(0);
    const tex = this.textures.get('bg-castle').getSourceImage() as HTMLImageElement | undefined;
    if (tex && (tex as any).width && (tex as any).height) {
      const sw = (tex as any).width as number;
      const sh = (tex as any).height as number;
      const scale = Math.max(width / sw, height / sh);
      bg.setScale(scale);
    } else {
      bg.setDisplaySize(width, height);
    }
    const breachPadding = Phaser.Math.Clamp(this.scale.width * 0.22, 160, 280);
    this.breachX = breachPadding;
    this.setupBattlefield();

    this.typingSystem = new TypingSystem(this);
    this.typingSystem.on('progress', this.handleTypingProgress, this);
    this.typingSystem.on('complete', this.handleTypingComplete, this);
    this.typingSystem.on('mistake', this.handleTypingMistake, this);
    // New: dynamic targeting hooks
    this.typingSystem.on('freeType', this.handleFreeType, this);
    this.typingSystem.on('mismatch', this.handleTypingMismatch, this);
    this.typingSystem.on('clear', this.handleTypingClear, this);

    // Build a word bag from the selected Word Bank and stage wordMix (allow settings override)
    const totalEnemies = this.stageConfig.spawn.total;
    const stageMix = SettingsManager.getStageWordMix(this.stageDefinition.id, this.stageDefinition.wordMix);
    const bag = WordBankManager.makeWordBag(totalEnemies, stageMix);
    this.bossTriggerCount = Math.ceil(totalEnemies * 0.6);

    this.enemySpawner = new EnemySpawner(
      this,
      this.stageConfig.spawn,
      bag,
      this.breachX,
      this.stageConfig.dangerZone,
      true, // use fixed sequence from our mixed bag to respect proportions
    );
    this.enemySpawner.on('spawn', this.handleEnemySpawn, this);

    EventBus.emit(Events.ScoreUpdated, this.scoreSystem.summary());
    EventBus.emit(Events.DisplayMessage, this.stageDefinition.description);
    EventBus.emit(Events.WallStatusUpdated, {
      current: this.playerStats.getWallHealth(),
      max: this.playerStats.maxWallHealth,
    });

    this.input.keyboard?.on('keydown-ESC', this.handlePauseRequest, this);
    this.input.keyboard?.on('keydown-SPACE', this.tryActivateBomb, this);

    this.events.on(Phaser.Scenes.Events.RESUME, this.handleResume, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.typingSystem.off('progress', this.handleTypingProgress, this);
      this.typingSystem.off('complete', this.handleTypingComplete, this);
      this.typingSystem.off('mistake', this.handleTypingMistake, this);
      this.typingSystem.off('freeType', this.handleFreeType, this);
      this.typingSystem.off('mismatch', this.handleTypingMismatch, this);
      this.typingSystem.off('clear', this.handleTypingClear, this);
      this.typingSystem.destroy();
      this.enemySpawner.off('spawn', this.handleEnemySpawn, this);
      this.input.keyboard?.off('keydown-ESC', this.handlePauseRequest, this);
      this.input.keyboard?.off('keydown-SPACE', this.tryActivateBomb, this);
      this.events.off(Phaser.Scenes.Events.RESUME, this.handleResume, this);
    });
  }

  override update(_: number, delta: number): void {
    if (this.stageFinished) {
      return;
    }

    this.enemySpawner.update(delta, this.activeEnemies.length);
    this.trajectorySystem.update(delta);
    this.bombSystem.update(delta);
    if (this.boss && !this.boss.isDefeated()) {
      this.boss.advance(delta);
    }
    this.powerups.forEach((powerup) => powerup.update(delta));
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
      .image(width / 2, height / 2, ICON_TEXTURE_KEYS.castle)
      .setDisplaySize(width * 1.02, height * 1.04)
      .setAlpha(0.16)
      .setDepth(-6);

    this.add.rectangle(width / 2, height / 2, width, height, 0x061125, 0.6).setDepth(-5);

    const laneWidth = width - this.breachX;

    this.add
      .rectangle(this.breachX + laneWidth / 2, height / 2, laneWidth, height * 0.82, 0x0b1220, 0.72)
      .setDepth(-4)
      .setStrokeStyle(2, 0x1e293b);

    this.wall = this.add
      .image(this.breachX * 0.55, height / 2, ICON_TEXTURE_KEYS.wallEmblem)
      .setDisplaySize(this.breachX * 0.78, height * 0.56)
      .setAlpha(0.8)
      .setDepth(-3);

    for (let y = 80; y < height - 40; y += 72) {
      this.add
        .rectangle(this.breachX + 18, y, 22, 52, 0x0f172a, 0.9)
        .setStrokeStyle(2, 0x1e293b)
        .setDepth(-2);
    }

    this.ranger = this.add
      .image(this.breachX * 0.56, height / 2 + 6, ICON_TEXTURE_KEYS.ranger)
      .setDisplaySize(96, 96)
      .setOrigin(0.46, 0.92)
      .setDepth(-1);

    const banner = this.add.rectangle(width / 2, 64, width * 0.7, 60, 0x0f172a, 0.72).setStrokeStyle(2, 0x1e293b).setDepth(-2);

    this.stageBanner = this.add.text(banner.x, banner.y - 10, `${this.stageDefinition.name}`, {
      fontFamily: '"Cinzel", "Noto Serif SC", serif',
      fontSize: '30px',
      color: '#f8fafc',
    }).setOrigin(0.5).setDepth(-1).setAlpha(0);

    this.stageDetailText = this.add.text(banner.x, banner.y + 16, `${this.difficultyLabel()} · ${this.stageDefinition.description}`, {
      fontFamily: '"Noto Sans SC", sans-serif',
      fontSize: '18px',
      color: '#cbd5f5',
    }).setOrigin(0.5).setDepth(-1).setAlpha(0);

    this.tweens.add({ targets: [this.stageBanner, this.stageDetailText], alpha: 1, duration: 260, delay: 180 });

    this.add
      .text(width / 2, 116, '输入敌人单词发射箭矢 · 空格键释放炸弹', {
        fontFamily: '"Noto Sans SC", sans-serif',
        fontSize: '18px',
        color: '#94a3b8',
      })
      .setOrigin(0.5)
      .setDepth(-1);
  }

  private difficultyLabel(): string {
    switch (this.stageDefinition.difficulty) {
      case 'easy':
        return '难度：入门';
      case 'normal':
        return '难度：进阶';
      case 'hard':
        return '难度：终极';
      default:
        return '难度：未知';
    }
  }

  private handleEnemySpawn(enemy: Enemy): void {
    enemy.setDepth(5);
    enemy.setProgress(0);
    enemy.resetTypingState();
    this.activeEnemies.push(enemy);
    this.trajectorySystem.register(enemy);

    enemy.once('eliminated', ({ cause }: { cause: EnemyEliminationCause }) => {
      this.handleEnemyEliminated(enemy, cause);
    });
    enemy.once('breached', () => {
      this.handleEnemyBreach(enemy);
    });

    // Multi-HP: when damaged, change its word
    enemy.on('damaged', () => {
      const next = this.enemySpawner.replacementWord(enemy.enemyType);
      enemy.updateWord(next);
      if (this.currentTarget === enemy) {
        this.typingSystem.setTarget(enemy.word);
        EventBus.emit(Events.WordChanged, enemy.word);
      }
    });

    this.refreshTargetSelection();
  }

  private handleEnemyEliminated(enemy: Enemy, cause: EnemyEliminationCause): void {
    this.removeEnemy(enemy);
    this.defeatedCount += 1;

    if (cause === 'arrow') {
      EventBus.emit(Events.DisplayMessage, '箭矢命中，敌人坠落！');
      this.maybeSpawnPowerup(enemy.x);
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
    if (nextTarget === this.currentTarget) {
      return;
    }

    if (this.currentTarget) {
      this.currentTarget.markAsTargeted(false);
    }

    this.currentTarget = nextTarget;

    if (!nextTarget) {
      this.typingSystem.setTarget('');
      EventBus.emit(Events.WordChanged, '');
      return;
    }

    if (nextTarget instanceof Powerup) {
      if (nextTarget.requiresTyping) {
        nextTarget.resetTypingState();
      }
    } else {
      nextTarget.resetTypingState();
    }

    nextTarget.markAsTargeted(true);

    if (nextTarget instanceof Powerup && !nextTarget.requiresTyping) {
      this.typingSystem.setTarget('');
      EventBus.emit(Events.WordChanged, '');
      return;
    }

    this.typingSystem.setTarget(nextTarget.word);
    EventBus.emit(Events.WordChanged, nextTarget.word);
  }

  private pickNextTarget(): WordTarget | undefined {
    if (this.boss && !this.bossDefeated) {
      return this.boss;
    }

    if (this.activeEnemies.length > 0) {
      const sortedEnemies = [...this.activeEnemies];
      sortedEnemies.sort((a, b) => a.x - b.x);
      return sortedEnemies[0];
    }

    const typingPowerups = this.powerups.filter((powerup) => powerup.isTypingActive());
    if (typingPowerups.length > 0) {
      typingPowerups.sort((a, b) => b.y - a.y);
      return typingPowerups[0];
    }

    return undefined;
  }

  private handleTypingProgress(progress: TypingProgress): void {
    if (!this.currentTarget) {
      return;
    }

    // Update all targets with identical words simultaneously
    const targets = this.getSameWordTargets(this.currentTarget);
    targets.forEach((t) => {
      t.updateTypingPreview(progress.input, progress.isMistake);
      t.setProgress(progress.input.length);
    });
  }

  // When there is no input yet, first letter can match any word with the same first letter
  private handleFreeType = (initialInput: string): void => {
    const prefix = (initialInput || '').toLowerCase();
    if (!prefix) {
      return;
    }

    // If current target still matches, keep it
    if (this.currentTarget && this.currentTarget.word.toLowerCase().startsWith(prefix)) {
      return;
    }

    const candidate = this.pickMatchingTarget(prefix);
    if (!candidate) {
      return;
    }

    if (this.currentTarget && this.currentTarget !== candidate) {
      this.currentTarget.markAsTargeted(false);
      // Clear any partial preview on previous target
      this.currentTarget.resetTypingState();
    }

    this.currentTarget = candidate;
    this.currentTarget.markAsTargeted(true);
    this.typingSystem.setTargetWithInput(candidate.word, prefix);
    EventBus.emit(Events.WordChanged, candidate.word);
  };

  // When current target mismatches, try to route input to a target that still matches
  private handleTypingMismatch = (payload: any): void => {
    const prefix = (typeof payload === 'object' && payload)
      ? String(payload.nextInput || '').toLowerCase()
      : String(payload || '').toLowerCase();
    const currentLen = (typeof payload === 'object' && payload && typeof payload.currentLength === 'number')
      ? payload.currentLength as number
      : undefined;
    if (!prefix) {
      return;
    }

    // Rule: if already have >1 correct characters on current target, do not switch
    // Do not auto-switch once player has started a word (>=1 typed)
    if (typeof currentLen === 'number' && currentLen > 0) {
      return;
    }

    const candidate = this.pickMatchingTarget(prefix, this.currentTarget);
    if (!candidate) {
      return;
    }

    if (this.currentTarget && this.currentTarget !== candidate) {
      this.currentTarget.markAsTargeted(false);
      this.currentTarget.resetTypingState();
    }

    this.currentTarget = candidate;
    this.currentTarget.markAsTargeted(true);
    this.typingSystem.setTargetWithInput(candidate.word, prefix);
    EventBus.emit(Events.WordChanged, candidate.word);
  };

  private handleTypingClear = (): void => {
    // Clear previews/progress for all potential targets without changing selection
    if (this.boss && !this.bossDefeated) {
      this.boss.resetTypingState();
    }
    this.activeEnemies.forEach((e) => e.resetTypingState());
    this.powerups.filter((p) => p.isTypingActive()).forEach((p) => p.resetTypingState());
  };

  private getSameWordTargets(base: WordTarget): WordTarget[] {
    const word = base.word.toLowerCase();
    if (base instanceof Boss) {
      return [base];
    }
    if (base instanceof Powerup) {
      if (!base.requiresTyping) {
        return [base];
      }
      const matches = this.powerups.filter((p) => p.isTypingActive() && p.word.toLowerCase() === word);
      return matches.length > 0 ? matches : [base];
    }
    // Enemy: include all active enemies with identical word
    const matches = this.activeEnemies.filter((e) => e.word.toLowerCase() === word);
    return matches.length > 0 ? matches : [base];
  }

  private pickMatchingTarget(prefix: string, exclude?: WordTarget): WordTarget | undefined {
    const normalized = prefix.toLowerCase();

    // Collect candidates: enemies, boss, and typed powerups
    const enemyMatches = this.activeEnemies
      .filter((e) => (!exclude || e !== exclude) && e.word.toLowerCase().startsWith(normalized))
      .sort((a, b) => a.x - b.x); // leftmost first

    const bossMatch = this.boss && !this.bossDefeated && (!exclude || this.boss !== exclude)
      && this.boss.word.toLowerCase().startsWith(normalized)
      ? this.boss
      : undefined;

    const typingPowerupMatches = this.powerups
      .filter((p) => p.isTypingActive() && (!exclude || p !== exclude) && p.word.toLowerCase().startsWith(normalized))
      .sort((a, b) => b.y - a.y); // closest to ground first

    // Priority: boss > enemies (leftmost) > typed powerups (closest to ground)
    if (bossMatch) {
      return bossMatch;
    }
    if (enemyMatches.length > 0) {
      return enemyMatches[0];
    }
    if (typingPowerupMatches.length > 0) {
      return typingPowerupMatches[0];
    }
    return undefined;
  }

  private handleTypingComplete(word: string): void {
    if (!this.currentTarget) {
      return;
    }

    const target = this.currentTarget;

    if (target instanceof Powerup) {
      if (target.requiresTyping) {
        target.updateTypingPreview(word, false);
        target.setProgress(word.length);
        target.markAsTargeted(false);
        this.typingSystem.setTarget('');
        EventBus.emit(Events.WordChanged, '');
        this.currentTarget = undefined;
        target.completeByTyping();
        this.refreshTargetSelection();
      }
      return;
    }

    this.scoreSystem.registerSuccess(word.length);
    this.bombSystem.registerCombo(this.scoreSystem.getCombo());

    // Complete all identical-word targets together
    const targets = this.getSameWordTargets(target);
    targets.forEach((t) => {
      t.updateTypingPreview(word, false);
      t.setProgress(word.length);
    });
    this.typingSystem.setTarget('');

    if (target instanceof Boss) {
      target.handleWordCompleted();
      return;
    }

    // Eliminate all identical-word enemies
    const enemyTargets = targets.filter((t): t is Enemy => t instanceof Enemy);
    if (enemyTargets.length > 0) {
      // Keep currentTarget targeted until first arrow launches
      enemyTargets.forEach((e) => this.launchArrow(e));
    }
  }

  private handleTypingMistake(): void {
    if (this.currentTarget instanceof Powerup && this.currentTarget.requiresTyping) {
      EventBus.emit(Events.DisplayMessage, '补给输入错误，请重新输入');
      return;
    }
    this.scoreSystem.registerMistake();
    this.bombSystem.registerCombo(this.scoreSystem.getCombo());
    EventBus.emit(Events.DisplayMessage, '输入错误，连击已重置');
  }

  private launchArrow(target: Enemy): void {
    const startX = this.ranger.x + this.ranger.displayWidth * 0.38;
    const startY = this.ranger.y - this.ranger.displayHeight * 0.18;
    const targetWidth = target.displayWidth || target.width || 140;
    const targetHeight = target.displayHeight || target.height || 120;
    const impactX = target.x - targetWidth * 0.35;
    const impactY = target.y - targetHeight * 0.22;
    const arrow = this.add
      .image(startX, startY, ICON_TEXTURE_KEYS.arrow)
      .setDisplaySize(46, 46)
      .setDepth(12);

    const updateRotation = () => {
      const angle = Phaser.Math.Angle.Between(arrow.x, arrow.y, impactX, impactY);
      arrow.setRotation(angle);
    };

    updateRotation();

    this.tweens.add({
      targets: arrow,
      x: impactX,
      y: impactY,
      duration: 240,
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
      if (this.boss && !this.bossDefeated) {
        EventBus.emit(Events.DisplayMessage, 'Boss 不惧怕炸弹，专注打字击退他！');
      } else {
        EventBus.emit(Events.DisplayMessage, '暂时没有敌人，炸弹保持待命');
      }
      return;
    }

    if (!this.bombSystem.canActivate() || !this.bombSystem.activate()) {
      EventBus.emit(Events.DisplayMessage, '炸弹尚在冷却中');
      return;
    }

    const explosionX = this.breachX + (this.scale.width - this.breachX) / 2;
    const explosion = this.add
      .image(explosionX, this.scale.height / 2, ICON_TEXTURE_KEYS.bomb)
      .setDisplaySize(200, 200)
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
    this.currentTarget?.markAsTargeted(false);
    this.currentTarget = this.boss && !this.bossDefeated ? this.boss : undefined;
    this.typingSystem.setTarget(this.currentTarget ? this.currentTarget.word : '');

    targets.forEach((enemy) => enemy.eliminateByBomb());

    const summary: BombClearSummary = { total: targets.length };
    this.scoreSystem.registerBombClear(summary.total);
    EventBus.emit(Events.DisplayMessage, `炸弹清除了 ${summary.total} 名敌人！`);
  }

  private handlePauseRequest(event: KeyboardEvent): void {
    event.preventDefault();
    if (this.stageFinished || this.pauseMenuOpen) {
      return;
    }
    this.openPauseMenu();
  }

  private openPauseMenu(): void {
    if (this.stageFinished || this.pauseMenuOpen || this.scene.isActive('PauseScene')) {
      return;
    }

    this.pauseMenuOpen = true;
    this.scene.launch('PauseScene', {
      stageId: this.stageDefinition.id,
      stageName: this.stageDefinition.name,
    });
    if (this.scene.isActive('UIScene')) {
      this.scene.pause('UIScene');
    }
    this.scene.pause();
  }

  private handleResume(): void {
    this.pauseMenuOpen = false;
    EventBus.emit(Events.DisplayMessage, '战斗继续！');
  }

  private maybeSpawnPowerup(sourceX?: number): void {
    if (this.stageFinished || this.dropRate <= 0) {
      return;
    }

    if (Math.random() > this.dropRate) {
      return;
    }

    const laneWidth = this.scale.width - this.breachX;
    const randomX = this.breachX + laneWidth * Phaser.Math.FloatBetween(0.2, 0.9);
    const spawnX = Phaser.Math.Clamp(sourceX ?? randomX, this.breachX + 48, this.scale.width - 48);
    const type = this.choosePowerupType();
    const requiresTyping = type === 'bomb';
    const powerup = new Powerup(this, spawnX, {
      type,
      // Reduce drop speed by 20%
      fallSpeed: Math.round(Phaser.Math.Between(120, 170) * 0.8),
      groundY: this.scale.height - 88,
      requiresTyping,
      word: requiresTyping ? this.pickPowerupWord() : undefined,
    });
    this.powerups.push(powerup);

    powerup.once('collected', ({ type: powerupType, trigger }: { type: PowerupType; trigger: PowerupCollectTrigger }) => {
      this.handlePowerupCollected(powerup, powerupType, trigger);
    });
    powerup.once('missed', (powerupType: PowerupType) => {
      this.handlePowerupMissed(powerup, powerupType);
    });
    powerup.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.powerups = this.powerups.filter((entry) => entry !== powerup);
    });
  }

  private pickPowerupWord(): string {
    // Sample one word from current bank using this stage's mix
    try {
      const mix = SettingsManager.getStageWordMix(this.stageDefinition.id, this.stageDefinition.wordMix);
      const bag = WordBankManager.makeWordBag(1, mix);
      return bag[0] ?? 'supply';
    } catch {
      return 'supply';
    }
  }

  private choosePowerupType(): PowerupType {
    const wallNeedsRepair = this.playerStats.getWallHealth() < this.playerStats.maxWallHealth;
    const bombsNeedCharge = this.bombSystem.getCharges() < this.bombSystem.getMaxCharges();

    if (bombsNeedCharge && !wallNeedsRepair) {
      return 'bomb';
    }
    if (wallNeedsRepair && !bombsNeedCharge) {
      return 'repair';
    }
    return Math.random() < 0.5 ? 'bomb' : 'repair';
  }

  private handlePowerupCollected(
    powerup: Powerup,
    type: PowerupType,
    trigger: PowerupCollectTrigger,
  ): void {
    if (this.currentTarget === powerup) {
      this.currentTarget = undefined;
    }

    if (type === 'bomb') {
      if (trigger !== 'typed') {
        this.refreshTargetSelection();
        return;
      }
      const gained = this.bombSystem.addCharge(1);
      if (gained) {
        EventBus.emit(Events.DisplayMessage, '补给字码完成，炸弹+1！');
      } else {
        EventBus.emit(Events.DisplayMessage, '炸弹仓已满，补给暂存。');
      }
      this.refreshTargetSelection();
      return;
    }

    const before = this.playerStats.getWallHealth();
    const after = this.playerStats.repair(1);
    EventBus.emit(Events.WallStatusUpdated, {
      current: after,
      max: this.playerStats.maxWallHealth,
    });
    if (after > before) {
      EventBus.emit(Events.DisplayMessage, '维修完成，城墙耐久+1！');
    } else {
      EventBus.emit(Events.DisplayMessage, '城墙完好，备用材料入库。');
    }
    this.refreshTargetSelection();
  }

  private handlePowerupMissed(powerup: Powerup, type: PowerupType): void {
    if (this.currentTarget === powerup) {
      this.currentTarget = undefined;
    }

    if (type === 'bomb') {
      EventBus.emit(Events.DisplayMessage, '补给坠毁，未能补充炸弹');
    } else {
      EventBus.emit(Events.DisplayMessage, '维修物资散落，未能修复城墙');
    }

    this.refreshTargetSelection();
  }

  private removeEnemy(enemy: Enemy): void {
    this.trajectorySystem.unregister(enemy);
    this.activeEnemies = this.activeEnemies.filter((active) => active !== enemy);
    if (this.currentTarget === enemy) {
      this.currentTarget = undefined;
    }
  }

  private checkForStageCompletion(): void {
    if (this.stageFinished) {
      return;
    }

    // Spawn boss once enough of the wave has been deployed
    if (!this.bossSpawned && this.enemySpawner.getSpawnedCount() >= this.bossTriggerCount) {
      this.spawnBoss();
    }

    // Finish round once boss is defeated, all enemies are cleared, and spawner finished
    if (this.bossSpawned && this.bossDefeated && this.enemySpawner.isFinished() && this.activeEnemies.length === 0) {
      this.finishRound(true);
    }
  }

  private spawnBoss(): void {
    if (this.bossSpawned) {
      return;
    }
    this.bossSpawned = true;

    const spawnX = this.scale.width + 160;
    const spawnY = this.scale.height / 2;
    // Boss words: use next-stage difficulty mix
    const nextMix = SettingsManager.getNextDifficultyMix(this.stageDefinition.id);
    const desiredCount = Math.max(5, this.stageDefinition.boss.words.length || 5);
    const bossBag = WordBankManager.makeWordBag(desiredCount, nextMix);
    this.boss = new Boss(this, spawnX, spawnY, {
      words: bossBag,
      speed: this.stageDefinition.boss.speed,
      pushback: this.stageDefinition.boss.pushback,
      damage: this.stageDefinition.boss.damage,
      breachX: this.breachX,
      dangerZone: this.stageConfig.dangerZone,
      spriteScale: this.stageDefinition.boss.spriteScale,
    });
    this.boss.setDepth(9);

    this.boss.on('breached', () => this.handleBossBreach());
    this.boss.on('defeated', () => this.handleBossDefeated());
    this.boss.on('word:changed', (nextWord: string) => {
      if (this.stageFinished) {
        return;
      }
      this.typingSystem.setTarget(nextWord);
      EventBus.emit(Events.WordChanged, nextWord);
      EventBus.emit(Events.DisplayMessage, 'Boss 被击退，单词更新！');
      this.currentTarget = this.boss ?? undefined;
      this.currentTarget?.markAsTargeted(true);
    });

    EventBus.emit(Events.DisplayMessage, `${this.stageDefinition.boss.name} 出现！打完全部单词才能击败它。`);
    this.currentTarget?.markAsTargeted(false);
    this.currentTarget = this.boss;
    this.boss.resetTypingState();
    this.boss.markAsTargeted(true);
    this.typingSystem.setTarget(this.boss.word);
    EventBus.emit(Events.WordChanged, this.boss.word);
  }

  private handleBossBreach(): void {
    if (this.stageFinished || !this.boss) {
      return;
    }

    const remaining = this.playerStats.takeDamage(this.boss.damage);
    this.scoreSystem.registerBreach();
    EventBus.emit(Events.WallStatusUpdated, {
      current: remaining,
      max: this.playerStats.maxWallHealth,
    });
    EventBus.emit(Events.DisplayMessage, `${this.stageDefinition.boss.name} 突破了城墙！`);
    this.finishRound(false);
  }

  private handleBossDefeated(): void {
    if (!this.boss || this.bossDefeated) {
      return;
    }
    this.bossDefeated = true;
    EventBus.emit(Events.DisplayMessage, `${this.stageDefinition.boss.name} 被完全击退！`);
    this.currentTarget = undefined;
    this.boss = undefined;
    this.refreshTargetSelection();
    this.checkForStageCompletion();
  }

  private finishRound(success: boolean): void {
    if (this.stageFinished) {
      return;
    }

    this.stageFinished = true;
    this.enemySpawner.stop();
    this.boss?.stop();
    this.typingSystem.setTarget('');
    this.currentTarget = undefined;

    this.powerups.forEach((powerup) => powerup.destroy());
    this.powerups = [];

    const summary = this.scoreSystem.summary();
    if (success) {
      markStageCompleted(this.stageIndex);
    }

    this.pauseMenuOpen = false;

    const stageList = getStages();
    const hasNextStage = this.stageIndex < stageList.length - 1;
    const nextStageUnlocked = hasNextStage && isStageUnlocked(this.stageIndex + 1);

    EventBus.emit(Events.DisplayMessage, success ? '胜利！城墙安然无恙。' : '城墙沦陷，守城失败。');

    this.time.delayedCall(900, () => {
      this.scene.stop('UIScene');
      this.scene.start('ResultScene', {
        summary,
        success,
        stageId: this.stageDefinition.id,
        stageIndex: this.stageIndex,
        stageName: this.stageDefinition.name,
        hasNextStage,
        nextStageUnlocked,
      });
    });
  }
}
