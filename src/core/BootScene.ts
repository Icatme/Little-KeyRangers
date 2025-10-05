import Phaser from 'phaser';
import { ICON_TEXTURE_KEYS, loadIconTextures } from './IconTextureLoader';
// Tiny Swords assets (imported so Vite resolves URLs correctly)
import ARCHER_BLUE from '../assets/Tiny Swords/Factions/Knights/Troops/Archer/Blue/Archer_Blue.png';
import BARREL_YELLOW from '../assets/Tiny Swords/Factions/Goblins/Troops/Barrel/Yellow/Barrel_Yellow.png';
import TORCH_RED from '../assets/Tiny Swords/Factions/Goblins/Troops/Torch/Red/Torch_Red.png';
import TNT_RED from '../assets/Tiny Swords/Factions/Goblins/Troops/TNT/Red/TNT_Red.png';
import TOWER_RED from '../assets/Tiny Swords/Factions/Goblins/Buildings/Wood_Tower/Wood_Tower_Red.png';
import CASTLE_BLUE from '../assets/Tiny Swords/Factions/Knights/Buildings/Castle/Castle_Blue.png';
import ARROW_IMG from '../assets/Tiny Swords/Factions/Knights/Troops/Archer/Arrow/Arrow.png';
import DYNAMITE_IMG from '../assets/Tiny Swords/Factions/Goblins/Troops/TNT/Dynamite/Dynamite.png';
import UI_ICON_05 from '../assets/Tiny Swords/UI/Icons/Regular_05.png';
import UI_ICON_09 from '../assets/Tiny Swords/UI/Icons/Regular_09.png';
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
    // If a texture key already exists, Phaser keeps the first; our create() fallback only adds when missing.
    this.load.image(ICON_TEXTURE_KEYS.ranger, ARCHER_BLUE);
    this.load.image(ICON_TEXTURE_KEYS.enemyFast, BARREL_YELLOW);
    this.load.image(ICON_TEXTURE_KEYS.enemyNormal, TORCH_RED);
    this.load.image(ICON_TEXTURE_KEYS.enemyHeavy, TNT_RED);
    this.load.image(ICON_TEXTURE_KEYS.boss, TOWER_RED);
    this.load.image(ICON_TEXTURE_KEYS.castle, CASTLE_BLUE);
    this.load.image(ICON_TEXTURE_KEYS.arrow, ARROW_IMG);
    this.load.image(ICON_TEXTURE_KEYS.bomb, DYNAMITE_IMG);
    this.load.image(ICON_TEXTURE_KEYS.wallEmblem, UI_ICON_05);
    this.load.image(ICON_TEXTURE_KEYS.target, UI_ICON_09);

    // Background image served from /public
    this.load.image('bg-castle', '/assets/castle.png');
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
