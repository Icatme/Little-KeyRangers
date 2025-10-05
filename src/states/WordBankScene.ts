import Phaser from 'phaser';
import { ICON_TEXTURE_KEYS } from '../core/IconTextureLoader';
import { WordBankManager } from '../core/WordBankManager';

export class WordBankScene extends Phaser.Scene {
  constructor() {
    super('WordBankScene');
  }

  override create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#020617');

    this.add
      .image(width / 2, height / 2, ICON_TEXTURE_KEYS.castle)
      .setDisplaySize(width * 0.95, height * 0.95)
      .setAlpha(0.14)
      .setDepth(-2);

    const banner = this.add
      .rectangle(width / 2, height * 0.13, width * 0.82, 74, 0x0f172a, 0.85)
      .setStrokeStyle(2, 0x1e293b);

    this.add
      .text(banner.x, banner.y, '词库管理与编辑', {
        fontFamily: '"Noto Sans SC", sans-serif',
        fontSize: '28px',
        color: '#e2e8f0',
      })
      .setOrigin(0.5);

    const panel = this.add
      .rectangle(width / 2, height * 0.57, width * 0.86, height * 0.75, 0x0b1220, 0.8)
      .setStrokeStyle(2, 0x1e293b);

    // Build DOM UI
    const host = document.createElement('div');
    host.style.width = `${Math.floor(width * 0.82)}px`;
    host.style.height = `${Math.floor(height * 0.7)}px`;
    host.style.display = 'grid';
    host.style.gridTemplateColumns = '1fr 1fr 1fr';
    host.style.gridTemplateRows = 'auto 1fr auto';
    host.style.gap = '12px';
    host.style.padding = '8px';
    host.style.color = '#e2e8f0';
    host.style.fontFamily = 'Noto Sans SC, sans-serif';
    host.style.fontSize = '14px';

    const selected = WordBankManager.getSelectedBank();

    const nameWrap = document.createElement('div');
    nameWrap.style.gridColumn = '1 / span 2';
    nameWrap.style.display = 'flex';
    nameWrap.style.alignItems = 'center';
    nameWrap.innerHTML = `<label style="margin-right:8px">名称</label>`;
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = selected?.name ?? '自定义词库';
    nameInput.placeholder = '输入词库名称';
    Object.assign(nameInput.style, {
      width: '420px',
      height: '28px',
      padding: '4px 8px',
      background: '#0f172a',
      color: '#e2e8f0',
      border: '1px solid #1e293b',
      borderRadius: '4px',
    } as CSSStyleDeclaration);
    nameWrap.appendChild(nameInput);

    const backBtn = document.createElement('button');
    backBtn.textContent = '返回菜单';
    Object.assign(backBtn.style, {
      justifySelf: 'end',
      width: '100px',
      height: '30px',
      background: '#0f172a',
      color: '#93c5fd',
      border: '1px solid #1e293b',
      borderRadius: '4px',
      cursor: 'pointer',
    } as CSSStyleDeclaration);
    backBtn.onclick = () => this.scene.start('MenuScene');

    const bulkArea = document.createElement('textarea');
    bulkArea.placeholder = '在此粘贴单词，支持以空格/换行/逗号分隔';
    bulkArea.value = '';
    Object.assign(bulkArea.style, {
      gridColumn: '1 / span 3',
      width: '100%',
      height: '80px',
      padding: '6px 8px',
      background: '#0f172a',
      color: '#e2e8f0',
      border: '1px solid #1e293b',
      borderRadius: '4px',
    } as CSSStyleDeclaration);

    const splitBtn = document.createElement('button');
    splitBtn.textContent = '按长度分组三组';
    Object.assign(splitBtn.style, {
      gridColumn: '1 / span 3',
      width: '160px',
      height: '32px',
      background: '#0f172a',
      color: '#facc15',
      border: '1px solid #1e293b',
      borderRadius: '4px',
      cursor: 'pointer',
    } as CSSStyleDeclaration);

    const groupTitle = (t: string) => {
      const el = document.createElement('div');
      el.textContent = t;
      el.style.fontWeight = 'bold';
      el.style.marginTop = '2px';
      return el;
    };

    const g1Area = document.createElement('textarea');
    const g2Area = document.createElement('textarea');
    const g3Area = document.createElement('textarea');

    function styleGroupArea(el: HTMLTextAreaElement) {
      Object.assign(el.style, {
        width: '100%',
        height: '220px',
        padding: '6px 8px',
        background: '#0f172a',
        color: '#e2e8f0',
        border: '1px solid #1e293b',
        borderRadius: '4px',
        whiteSpace: 'pre',
      } as CSSStyleDeclaration);
    }
    styleGroupArea(g1Area);
    styleGroupArea(g2Area);
    styleGroupArea(g3Area);

    // Prefill from selected bank
    const joinLines = (arr: string[]) => arr.join('\n');
    g1Area.value = joinLines(selected.groups.g1);
    g2Area.value = joinLines(selected.groups.g2);
    g3Area.value = joinLines(selected.groups.g3);

    const saveBtn = document.createElement('button');
    saveBtn.textContent = '保存当前词库';
    Object.assign(saveBtn.style, {
      gridColumn: '1 / span 2',
      width: '180px',
      height: '34px',
      background: '#0f172a',
      color: '#34d399',
      border: '1px solid #1e293b',
      borderRadius: '4px',
      cursor: 'pointer',
    } as CSSStyleDeclaration);

    const saveAsBtn = document.createElement('button');
    saveAsBtn.textContent = '另存为新词库';
    Object.assign(saveAsBtn.style, {
      justifySelf: 'end',
      width: '160px',
      height: '34px',
      background: '#0f172a',
      color: '#93c5fd',
      border: '1px solid #1e293b',
      borderRadius: '4px',
      cursor: 'pointer',
    } as CSSStyleDeclaration);

    const status = document.createElement('div');
    status.style.gridColumn = '1 / span 3';
    status.style.height = '20px';
    status.style.color = '#94a3b8';

    splitBtn.onclick = () => {
      const tokens = WordBankManager.parseBulk(bulkArea.value);
      // auto split into thirds by length
      const sorted = [...tokens].sort((a, b) => a.length - b.length);
      const n = sorted.length;
      const s1 = Math.floor(n / 3);
      const s2 = Math.floor((2 * n) / 3);
      g1Area.value = joinLines(sorted.slice(0, s1));
      g2Area.value = joinLines(sorted.slice(s1, s2));
      g3Area.value = joinLines(sorted.slice(s2));
      status.textContent = `已分组：共 ${n} 个词，G1=${s1}，G2=${s2 - s1}，G3=${n - s2}`;
    };

    function extractAreas(): { g1: string[]; g2: string[]; g3: string[] } {
      const split = (s: string) => s.split(/[\s,;]+/g).filter(Boolean);
      return {
        g1: WordBankManager.parseBulk(g1Area.value),
        g2: WordBankManager.parseBulk(g2Area.value),
        g3: WordBankManager.parseBulk(g3Area.value),
      };
    }

    saveBtn.onclick = () => {
      const groups = extractAreas();
      const name = nameInput.value?.trim() || '自定义词库';
      WordBankManager.upsertBank({ id: selected.id, name, groups });
      status.textContent = '已保存并设为当前词库';
    };

    saveAsBtn.onclick = () => {
      const groups = extractAreas();
      const name = nameInput.value?.trim() || '自定义词库';
      WordBankManager.upsertBank({ name, groups });
      status.textContent = '已另存为新词库并设为当前';
    };

    // Compose grid
    host.appendChild(nameWrap);
    host.appendChild(backBtn);
    host.appendChild(bulkArea);
    host.appendChild(splitBtn);
    host.appendChild(groupTitle('难度1（最易）'));
    host.appendChild(groupTitle('难度2（中等）'));
    host.appendChild(groupTitle('难度3（较难）'));
    host.appendChild(g1Area);
    host.appendChild(g2Area);
    host.appendChild(g3Area);
    host.appendChild(saveBtn);
    host.appendChild(saveAsBtn);
    host.appendChild(status);

    const dom = this.add.dom(width / 2, panel.y, host);
    dom.setOrigin(0.5);
  }
}

