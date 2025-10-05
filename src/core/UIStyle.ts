import Phaser from 'phaser';

export const UI_COLORS = {
  bg: '#020617',
  overlay: 0x0b1220,
  panel: 0x0b1220,
  panelStroke: 0x1e293b,
  textPrimary: '#e2e8f0',
  textMuted: '#94a3b8',
  accentBlue: 0x38bdf8,
  accentGold: 0xfacc15,
};

export const UI_TEXT = {
  title: { fontFamily: '"Cinzel", "Noto Serif SC", serif', fontSize: '48px', color: UI_COLORS.textPrimary },
  subtitle: { fontFamily: '"Noto Sans SC", sans-serif', fontSize: '20px', color: UI_COLORS.textMuted },
  label: { fontFamily: '"Noto Sans SC", sans-serif', fontSize: '20px', color: UI_COLORS.textPrimary },
  body: { fontFamily: '"Noto Sans SC", sans-serif', fontSize: '18px', color: UI_COLORS.textPrimary },
};

export function createPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  options?: { alpha?: number; depth?: number; stroke?: number; rounded?: number },
): Phaser.GameObjects.Rectangle {
  const rect = scene.add
    .rectangle(x, y, width, height, UI_COLORS.panel, options?.alpha ?? 0.82)
    .setStrokeStyle(options?.stroke ?? 2, UI_COLORS.panelStroke)
    .setDepth(options?.depth ?? 0);
  if (options?.rounded && typeof (rect as any).setRadius === 'function') {
    (rect as any).setRadius(options.rounded);
  }
  return rect;
}

export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  label: string,
  onClick: () => void,
  options?: { height?: number; accentTint?: number },
): Phaser.GameObjects.Container {
  const height = options?.height ?? 48;
  const bg = scene.add
    .rectangle(0, 0, width, height, 0x0f172a, 0.9)
    .setStrokeStyle(2, UI_COLORS.panelStroke);
  const text = scene.add.text(0, 0, label, UI_TEXT.label).setOrigin(0.5);
  const container = scene.add.container(x, y, [bg, text]);
  container.setSize(width, height);
  container.setInteractive({ useHandCursor: true })
    .on('pointerdown', onClick)
    .on('pointerover', () => {
      bg.setFillStyle(0x14213a, 0.95);
      text.setColor('#cfe8ff');
    })
    .on('pointerout', () => {
      bg.setFillStyle(0x0f172a, 0.9);
      text.setColor(UI_COLORS.textPrimary);
    });
  return container;
}

export function createBadge(
  scene: Phaser.Scene,
  x: number,
  y: number,
  texture: string,
  tint: number,
  initialText: string,
  alignment: 'left' | 'center' | 'right',
): { container: Phaser.GameObjects.Container; icon: Phaser.GameObjects.Image; text: Phaser.GameObjects.Text; applyLayout: () => void } {
  const spacing = 6;
  const container = scene.add.container(x, y);
  container.setDepth(30);
  const icon = scene.add.image(0, 0, texture).setDisplaySize(20, 20).setTint(tint);
  const text = scene.add.text(0, 0, initialText, { fontFamily: '"Noto Sans SC", sans-serif', fontSize: '16px', color: '#f8fafc' });
  container.add([icon, text]);

  const applyLayout = () => {
    const iconWidth = icon.displayWidth;
    const textWidth = text.displayWidth;
    switch (alignment) {
      case 'left':
        icon.setOrigin(0, 0.5);
        icon.setPosition(0, 0);
        text.setOrigin(0, 0.5);
        text.setPosition(iconWidth + spacing, 0);
        break;
      case 'right':
        icon.setOrigin(1, 0.5);
        icon.setPosition(0, 0);
        text.setOrigin(1, 0.5);
        text.setPosition(-iconWidth - spacing, 0);
        break;
      default: {
        const totalWidth = iconWidth + spacing + textWidth;
        icon.setOrigin(0.5, 0.5);
        text.setOrigin(0.5, 0.5);
        icon.setPosition(-totalWidth / 2 + iconWidth / 2, 0);
        text.setPosition(icon.x + iconWidth / 2 + spacing + textWidth / 2, 0);
        break;
      }
    }
  };

  applyLayout();
  return { container, icon, text, applyLayout };
}

export function fadeInScene(scene: Phaser.Scene, duration = 300): void {
  scene.cameras.main.setBackgroundColor(UI_COLORS.bg);
  scene.cameras.main.fadeIn(duration, 0, 0, 0);
}

export function fadeOutScene(scene: Phaser.Scene, duration = 300, onComplete?: () => void): void {
  scene.cameras.main.fadeOut(duration, 0, 0, 0);
  if (onComplete) {
    scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, onComplete);
  }
}
