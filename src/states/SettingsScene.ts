import Phaser from 'phaser';
import { ICON_TEXTURE_KEYS } from '../core/IconTextureLoader';
import { SettingsManager } from '../core/SettingsManager';
import { getStages } from '../core/StageManager';
import { WordBankManager, WordBank } from '../core/WordBankManager';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('SettingsScene');
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
      .rectangle(width / 2, height * 0.12, width * 0.82, 74, 0x0f172a, 0.85)
      .setStrokeStyle(2, 0x1e293b);

    this.add
      .text(banner.x, banner.y, '游戏设置', {
        fontFamily: '"Noto Sans SC", sans-serif',
        fontSize: '28px',
        color: '#e2e8f0',
      })
      .setOrigin(0.5);

    const panel = this.add
      .rectangle(width / 2, height * 0.56, width * 0.86, height * 0.76, 0x0b1220, 0.82)
      .setStrokeStyle(2, 0x1e293b);

    // DOM UI container
    const host = document.createElement('div');
    host.style.width = `${Math.floor(width * 0.82)}px`;
    host.style.height = `${Math.floor(height * 0.72)}px`;
    host.style.display = 'grid';
    host.style.gridTemplateColumns = '1fr 1fr';
    host.style.gridTemplateRows = 'auto auto 1fr auto';
    host.style.gap = '12px';
    host.style.padding = '8px';
    host.style.color = '#e2e8f0';
    host.style.fontFamily = 'Noto Sans SC, sans-serif';
    host.style.fontSize = '14px';

    const backBtn = document.createElement('button');
    backBtn.textContent = '返回主菜单';
    Object.assign(backBtn.style, {
      justifySelf: 'end',
      width: '110px',
      height: '30px',
      background: '#0f172a',
      color: '#93c5fd',
      border: '1px solid #1e293b',
      borderRadius: '4px',
      cursor: 'pointer',
    } as CSSStyleDeclaration);
    backBtn.onclick = () => this.scene.start('MenuScene');

    // Word bank selection
    const bankWrap = document.createElement('div');
    bankWrap.style.gridColumn = '1 / span 2';
    const bankTitle = document.createElement('div');
    bankTitle.textContent = '词库选择';
    bankTitle.style.fontWeight = 'bold';
    bankWrap.appendChild(bankTitle);

    const bankRow = document.createElement('div');
    bankRow.style.display = 'flex';
    bankRow.style.alignItems = 'center';
    bankRow.style.gap = '8px';
    const bankSelect = document.createElement('select');
    Object.assign(bankSelect.style, {
      width: '320px',
      height: '28px',
      background: '#0f172a',
      color: '#e2e8f0',
      border: '1px solid #1e293b',
      borderRadius: '4px',
    } as CSSStyleDeclaration);

    const banks = WordBankManager.getBanks();
    const current = WordBankManager.getSelectedBank();
    function refreshSelectOptions(items: WordBank[], selectedId: string) {
      bankSelect.innerHTML = '';
      items.forEach((b) => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.name;
        if (b.id === selectedId) opt.selected = true;
        bankSelect.appendChild(opt);
      });
    }
    refreshSelectOptions(banks, current.id);
    bankSelect.onchange = () => {
      WordBankManager.selectBank(bankSelect.value);
    };

    const editBtn = document.createElement('button');
    editBtn.textContent = '编辑词库…';
    Object.assign(editBtn.style, {
      width: '100px',
      height: '28px',
      background: '#0f172a',
      color: '#facc15',
      border: '1px solid #1e293b',
      borderRadius: '4px',
      cursor: 'pointer',
    } as CSSStyleDeclaration);
    editBtn.onclick = () => this.scene.start('WordBankScene');

    bankRow.appendChild(bankSelect);
    bankRow.appendChild(editBtn);
    bankWrap.appendChild(bankRow);

    // Stage mixes editor
    const mixesWrap = document.createElement('div');
    mixesWrap.style.gridColumn = '1 / span 2';
    const mixesTitle = document.createElement('div');
    mixesTitle.textContent = '关卡单词比例设定（g1/g2/g3, 总和=100%）';
    mixesTitle.style.fontWeight = 'bold';
    mixesWrap.appendChild(mixesTitle);

    const stageList = getStages();
    const rows: Array<{ id: number; inputs: [HTMLInputElement, HTMLInputElement, HTMLInputElement] }>[] = [] as any;

    function makePercentInput(): HTMLInputElement {
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.max = '100';
      input.step = '1';
      Object.assign(input.style, {
        width: '76px',
        height: '26px',
        padding: '2px 6px',
        background: '#0f172a',
        color: '#e2e8f0',
        border: '1px solid #1e293b',
        borderRadius: '4px',
      } as CSSStyleDeclaration);
      return input;
    }

    const table = document.createElement('div');
    table.style.display = 'grid';
    table.style.gridTemplateColumns = '180px repeat(3, 90px)';
    table.style.rowGap = '8px';
    table.style.columnGap = '12px';
    function addHeaderCell(text: string) {
      const el = document.createElement('div');
      el.textContent = text;
      el.style.color = '#94a3b8';
      table.appendChild(el);
    }
    addHeaderCell('关卡');
    addHeaderCell('g1%');
    addHeaderCell('g2%');
    addHeaderCell('g3%');

    stageList.forEach((stage) => {
      const name = document.createElement('div');
      name.textContent = `${stage.id}. ${stage.name}`;
      table.appendChild(name);
      const mix = SettingsManager.getStageWordMix(stage.id, stage.wordMix);
      const i1 = makePercentInput();
      const i2 = makePercentInput();
      const i3 = makePercentInput();
      i1.value = String(Math.round(mix.g1 * 100));
      i2.value = String(Math.round(mix.g2 * 100));
      i3.value = String(Math.round(mix.g3 * 100));
      table.appendChild(i1);
      table.appendChild(i2);
      table.appendChild(i3);
      (rows as any).push({ id: stage.id, inputs: [i1, i2, i3] });
    });

    mixesWrap.appendChild(table);

    const saveMixBtn = document.createElement('button');
    saveMixBtn.textContent = '保存比例设置';
    Object.assign(saveMixBtn.style, {
      gridColumn: '1 / span 2',
      width: '160px',
      height: '32px',
      background: '#0f172a',
      color: '#34d399',
      border: '1px solid #1e293b',
      borderRadius: '4px',
      cursor: 'pointer',
    } as CSSStyleDeclaration);

    const status = document.createElement('div');
    status.style.gridColumn = '1 / span 2';
    status.style.color = '#94a3b8';
    status.style.minHeight = '20px';

    saveMixBtn.onclick = () => {
      (rows as any as Array<{ id: number; inputs: [HTMLInputElement, HTMLInputElement, HTMLInputElement] }>).forEach(
        (row) => {
          const g1 = (Number(row.inputs[0].value) || 0) / 100;
          const g2 = (Number(row.inputs[1].value) || 0) / 100;
          const g3 = (Number(row.inputs[2].value) || 0) / 100;
          SettingsManager.setStageWordMix(row.id, { g1, g2, g3 });
        },
      );
      status.textContent = '已保存关卡单词比例设置';
    };

    host.appendChild(bankWrap);
    host.appendChild(backBtn);
    host.appendChild(mixesWrap);
    host.appendChild(saveMixBtn);
    host.appendChild(status);

    const dom = this.add.dom(width / 2, panel.y, host);
    dom.setOrigin(0.5);
  }
}

