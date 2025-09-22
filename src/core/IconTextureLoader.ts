import Phaser from 'phaser';
import {
  SvgArcheryTarget,
  SvgBarbedArrow,
  SvgBowman,
  SvgCastle,
  SvgElvenCastle,
  SvgEvilMinion,
  SvgFireBomb,
  type SvgPathDefinition,
} from '../assets/iconPaths';

export const ICON_TEXTURE_KEYS = {
  ranger: 'icon-ranger',
  enemy: 'icon-enemy',
  castle: 'icon-castle',
  wallEmblem: 'icon-wall-emblem',
  arrow: 'icon-arrow',
  bomb: 'icon-bomb',
  target: 'icon-target',
} as const;

type IconTextureKey = (typeof ICON_TEXTURE_KEYS)[keyof typeof ICON_TEXTURE_KEYS];

interface IconDescriptor {
  key: IconTextureKey;
  path: SvgPathDefinition;
  fill: string;
  backgroundFill?: string;
  viewBox?: number;
}

const ICON_DEFINITIONS: IconDescriptor[] = [
  {
    key: ICON_TEXTURE_KEYS.ranger,
    path: SvgBowman,
    fill: '#f8fafc',
    backgroundFill: '#0f172a',
  },
  {
    key: ICON_TEXTURE_KEYS.enemy,
    path: SvgEvilMinion,
    fill: '#f87171',
    backgroundFill: '#020617',
  },
  {
    key: ICON_TEXTURE_KEYS.castle,
    path: SvgElvenCastle,
    fill: '#cbd5f5',
    backgroundFill: '#0b1220',
  },
  {
    key: ICON_TEXTURE_KEYS.wallEmblem,
    path: SvgCastle,
    fill: '#94a3b8',
    backgroundFill: '#111827',
  },
  {
    key: ICON_TEXTURE_KEYS.arrow,
    path: SvgBarbedArrow,
    fill: '#facc15',
  },
  {
    key: ICON_TEXTURE_KEYS.bomb,
    path: SvgFireBomb,
    fill: '#fb7185',
    backgroundFill: '#1f2937',
  },
  {
    key: ICON_TEXTURE_KEYS.target,
    path: SvgArcheryTarget,
    fill: '#38bdf8',
    backgroundFill: '#111827',
  },
];

function createSvgDataUri({
  path,
  fill,
  backgroundFill,
  viewBox = 512,
}: Pick<IconDescriptor, 'path' | 'fill' | 'backgroundFill' | 'viewBox'>): string {
  const attributes: string[] = [`d=\"${path.d}\"`, `fill=\"${fill}\"`];
  if (path.fillRule) {
    attributes.push(`fill-rule=\"${path.fillRule}\"`);
  }

  const backgroundElement = backgroundFill
    ? `<rect x=\"0\" y=\"0\" width=\"${viewBox}\" height=\"${viewBox}\" fill=\"${backgroundFill}\" />`
    : '';

  const pathAttributes = attributes.join(' ');
  const svg = `<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 ${viewBox} ${viewBox}\">${backgroundElement}<path ${pathAttributes} /></svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function textureLoaded(scene: Phaser.Scene, key: string): Promise<void> {
  return new Promise((resolve) => {
    if (scene.textures.exists(key)) {
      resolve();
      return;
    }

    const handler = (addedKey: string) => {
      if (addedKey === key) {
        scene.textures.off(Phaser.Textures.Events.ADD, handler);
        resolve();
      }
    };

    scene.textures.on(Phaser.Textures.Events.ADD, handler);
  });
}

export async function loadIconTextures(
  scene: Phaser.Scene,
  onProgress?: (loaded: number, total: number) => void,
): Promise<void> {
  const total = ICON_DEFINITIONS.length;
  let loaded = 0;

  const increment = () => {
    loaded += 1;
    onProgress?.(loaded, total);
  };

  await Promise.all(
    ICON_DEFINITIONS.map(async (icon) => {
      if (!scene.textures.exists(icon.key)) {
        const dataUri = createSvgDataUri(icon);
        const waitForTexture = textureLoaded(scene, icon.key);
        scene.textures.addBase64(icon.key, dataUri);
        await waitForTexture;
      }

      increment();
    }),
  );
}
