import Phaser from 'phaser';
import { ICON_TEXTURE_KEYS, loadIconTextures } from './IconTextureLoader';
import { createPanel, fadeInScene, fadeOutScene, UI_TEXT } from './UIStyle';

export class BootScene extends Phaser.Scene {
  private loadingText!: Phaser.GameObjects.Text;
  private barBg!: Phaser.GameObjects.Rectangle;
  private barFill!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('BootScene');
  }

  override preload(): void {
    fadeInScene(this, 200);
    const { width, height } = this.scale;

    createPanel(this, width / 2, height / 2, width * 0.55, 160, { alpha: 0.88 });

    this.loadingText = this.add.text(width / 2, height / 2 - 12, '正在装配游侠装备...', UI_TEXT.body).setOrigin(0.5);

    this.barBg = this.add.rectangle(width / 2, height / 2 + 26, width * 0.42, 12, 0x0f172a, 0.9).setStrokeStyle(2, 0x1e293b);
    this.barFill = this.add.rectangle(this.barBg.x - this.barBg.width / 2 + 2, this.barBg.y, 0, 8, 0x38bdf8, 0.9).setOrigin(0, 0.5);

    // Preload Tiny Swords PNG assets mapped to our existing icon keys.
    // If a texture fails to load, loadIconTextures() in create() will fall back to SVGs.
    this.load.image(
      ICON_TEXTURE_KEYS.ranger,
      'src/assets/Tiny Swords/Factions/Knights/Troops/Archer/Blue/Archer_Blue.png',
    );
    this.load.image(
      ICON_TEXTURE_KEYS.enemyFast,
      'src/assets/Tiny Swords/Factions/Goblins/Troops/Barrel/Yellow/Barrel_Yellow.png',
    );
    this.load.image(
      ICON_TEXTURE_KEYS.enemyNormal,
      'src/assets/Tiny Swords/Factions/Goblins/Troops/Torch/Red/Torch_Red.png',
    );
    this.load.image(
      ICON_TEXTURE_KEYS.enemyHeavy,
      'src/assets/Tiny Swords/Factions/Goblins/Troops/TNT/Red/TNT_Red.png',
    );
    this.load.image(
      ICON_TEXTURE_KEYS.boss,
      'src/assets/Tiny Swords/Factions/Goblins/Buildings/Wood_Tower/Wood_Tower_Red.png',
    );
    this.load.image(
      ICON_TEXTURE_KEYS.castle,
      'src/assets/Tiny Swords/Factions/Knights/Buildings/Castle/Castle_Blue.png',
    );
    this.load.image(
      ICON_TEXTURE_KEYS.arrow,
      'src/assets/Tiny Swords/Factions/Knights/Troops/Archer/Arrow/Arrow.png',
    );
    this.load.image(
      ICON_TEXTURE_KEYS.bomb,
      'src/assets/Tiny Swords/Factions/Goblins/Troops/TNT/Dynamite/Dynamite.png',
    );
    this.load.image(ICON_TEXTURE_KEYS.wallEmblem, 'src/assets/Tiny Swords/UI/Icons/Regular_05.png');
    this.load.image(ICON_TEXTURE_KEYS.target, 'src/assets/Tiny Swords/UI/Icons/Regular_09.png');
  }

  override async create(): Promise<void> {
    await loadIconTextures(this, (loaded, total) => {
      const progress = Math.round((loaded / total) * 100);
      this.loadingText.setText(`正在装配游侠装备... ${progress}%`);
      this.barFill.setSize((this.barBg.width - 4) * (progress / 100), 8);
    });

    this.loadingText.setText('装配完成，准备出击！');
    fadeOutScene(this, 260, () => this.scene.start('MenuScene'));
  }
}
