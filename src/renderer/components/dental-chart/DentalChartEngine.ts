// ============================================================================
// PROFESSIONAL DENTAL CHART ENGINE
// Dynamic interactive dental charting system with FDI notation
// Adapted for React integration - no patient bar, callback-based persistence
// ============================================================================

export interface ChartCallbacks {
  onSurfaceChange?: (fdiNum: number, surface: string, condition: string) => void;
  onWholeToothChange?: (fdiNum: number, condition: string | null) => void;
  onMobilityChange?: (fdiNum: number, mobility: number) => void;
  onNoteChange?: (fdiNum: number, note: string) => void;
  onResetTooth?: (fdiNum: number) => void;
}

export interface ChartToothData {
  status: string;
  wholeCondition: string | null;
  surfaces: Record<string, string>;
  mobility: number;
  note: string;
}

export interface ChartData {
  teeth: Record<number, ChartToothData>;
  history: { tooth: number; action: string; time: string }[];
}

export default class DentalChartEngine {
  private container: HTMLElement;
  private svgNS = 'http://www.w3.org/2000/svg';

  // State
  private selectedTooth: number | null = null;
  private selectedSurface: string | null = null;
  private activeCondition = 'caries';
  private activeMode: 'surface' | 'whole' = 'surface';
  private patientData: ChartData;
  private callbacks: ChartCallbacks;

  // Layout constants
  private toothSize = 44;
  private toothGap = 8;
  private colWidth: number;
  private anatomyHeight = 90;
  private chartPadding = 30;

  // FDI tooth order
  private upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  private lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  // Tooth type definitions
  private toothTypes: Record<number, string> = {};

  // Condition definitions
  private conditions: Record<string, { label: string; color: string; category: string }> = {
    healthy:   { label: 'Healthy',        color: '#D4D4D8', category: 'surface' },
    caries:    { label: 'Caries',         color: '#EF4444', category: 'surface' },
    composite: { label: 'Composite',      color: '#60A5FA', category: 'surface' },
    amalgam:   { label: 'Amalgam',        color: '#9CA3AF', category: 'surface' },
    gold:      { label: 'Gold Filling',   color: '#FBBF24', category: 'surface' },
    ceramic:   { label: 'Ceramic',        color: '#E2E8F0', category: 'surface' },
    sealant:   { label: 'Sealant',        color: '#34D399', category: 'surface' },
    rct:       { label: 'Root Canal',     color: '#FB923C', category: 'surface' },
    crown:     { label: 'Crown',          color: '#A78BFA', category: 'whole' },
    veneer:    { label: 'Veneer',         color: '#22D3EE', category: 'whole' },
    missing:   { label: 'Missing',        color: '#52525B', category: 'whole' },
    implant:   { label: 'Implant',        color: '#2DD4BF', category: 'whole' },
    pontic:    { label: 'Pontic',         color: '#818CF8', category: 'whole' },
    fracture:  { label: 'Fracture',       color: '#DC2626', category: 'whole' },
    impacted:  { label: 'Impacted',       color: '#78716C', category: 'whole' },
  };

  private surfaceLabels: Record<string, string> = {
    buccal: 'B', lingual: 'L', mesial: 'M', distal: 'D', occlusal: 'O'
  };

  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(container: HTMLElement, callbacks: ChartCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.colWidth = this.toothSize + this.toothGap;

    // Set up tooth types
    [18, 17, 16, 28, 27, 26, 38, 37, 36, 48, 47, 46].forEach(n => this.toothTypes[n] = 'molar');
    [15, 14, 25, 24, 35, 34, 45, 44].forEach(n => this.toothTypes[n] = 'premolar');
    [13, 23, 33, 43].forEach(n => this.toothTypes[n] = 'canine');
    [12, 22, 32, 42].forEach(n => this.toothTypes[n] = 'lateral_incisor');
    [11, 21, 31, 41].forEach(n => this.toothTypes[n] = 'central_incisor');

    this.patientData = this.createEmptyData();
    this.render();
    this.attachGlobalListeners();
  }

  // ── Data Model ──────────────────────────────────────────────────────────

  private createEmptyData(): ChartData {
    const teeth: Record<number, ChartToothData> = {};
    const all = [...this.upperTeeth, ...this.lowerTeeth];
    all.forEach(num => {
      teeth[num] = {
        status: 'present',
        wholeCondition: null,
        surfaces: {
          buccal: 'healthy', lingual: 'healthy',
          mesial: 'healthy', distal: 'healthy',
          occlusal: 'healthy'
        },
        mobility: 0,
        note: ''
      };
    });
    return { teeth, history: [] };
  }

  // ── Public API ────────────────────────────────────────────────────────

  loadTeethData(data: ChartData): void {
    this.patientData = data;
    this.selectedTooth = null;
    this.selectedSurface = null;
    this.render();
  }

  getTeethData(): ChartData {
    return this.patientData;
  }

  destroy(): void {
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
    this.container.innerHTML = '';
  }

  // ── Initialization ──────────────────────────────────────────────────────

  private render(): void {
    this.container.innerHTML = '';
    this.renderConditionToolbar();
    this.renderChart();
    const bottomGrid = document.createElement('div');
    bottomGrid.className = 'dc-bottom-grid';
    bottomGrid.id = 'dc-bottom-grid';
    this.container.appendChild(bottomGrid);
    this.renderDetailPanel();
    this.renderHistoryPanel();
  }

  // ── Condition Toolbar ───────────────────────────────────────────────────

  private renderConditionToolbar(): void {
    const toolbar = document.createElement('div');
    toolbar.className = 'dc-toolbar';

    // Mode toggle
    const modeToggle = document.createElement('div');
    modeToggle.className = 'dc-mode-toggle';
    modeToggle.innerHTML = `
      <button class="dc-mode-btn${this.activeMode === 'surface' ? ' active' : ''}" data-mode="surface">Surface</button>
      <button class="dc-mode-btn${this.activeMode === 'whole' ? ' active' : ''}" data-mode="whole">Whole Tooth</button>
    `;
    toolbar.appendChild(modeToggle);

    // Separator
    const sep = document.createElement('div');
    sep.className = 'dc-toolbar-sep';
    toolbar.appendChild(sep);

    // Condition buttons
    const condWrap = document.createElement('div');
    condWrap.className = 'dc-condition-buttons';
    condWrap.id = 'dc-condition-buttons';

    Object.entries(this.conditions).forEach(([key, cond]) => {
      const btn = document.createElement('button');
      btn.className = `dc-cond-btn${key === this.activeCondition ? ' active' : ''}`;
      btn.dataset.condition = key;
      btn.dataset.category = cond.category;
      btn.innerHTML = `<span class="dc-cond-dot" style="background:${cond.color}"></span>${cond.label}`;
      btn.title = cond.label;
      condWrap.appendChild(btn);
    });
    toolbar.appendChild(condWrap);

    this.container.appendChild(toolbar);

    // Mode toggle listeners
    modeToggle.querySelectorAll('.dc-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modeToggle.querySelectorAll('.dc-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeMode = (btn as HTMLElement).dataset.mode as 'surface' | 'whole';
        this.filterConditionButtons();
      });
    });

    // Condition button listeners
    condWrap.querySelectorAll('.dc-cond-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        condWrap.querySelectorAll('.dc-cond-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeCondition = (btn as HTMLElement).dataset.condition!;
      });
    });

    this.filterConditionButtons();
  }

  private filterConditionButtons(): void {
    const btns = this.container.querySelectorAll('.dc-cond-btn') as NodeListOf<HTMLElement>;
    let firstVisible: HTMLElement | null = null;
    btns.forEach(btn => {
      const cat = btn.dataset.category;
      const show = (this.activeMode === 'surface' && cat === 'surface') ||
                   (this.activeMode === 'whole' && cat === 'whole');
      btn.style.display = show ? '' : 'none';
      if (show && !firstVisible) firstVisible = btn;
    });
    // Auto-select first visible if current selection is hidden
    const activeCond = this.conditions[this.activeCondition];
    if (activeCond) {
      const currentCat = activeCond.category;
      const mismatch = (this.activeMode === 'surface' && currentCat !== 'surface') ||
                       (this.activeMode === 'whole' && currentCat !== 'whole');
      if (mismatch && firstVisible) {
        btns.forEach(b => b.classList.remove('active'));
        firstVisible.classList.add('active');
        this.activeCondition = firstVisible.dataset.condition!;
      }
    }
  }

  // ── Main SVG Chart ──────────────────────────────────────────────────────

  private renderChart(): void {
    const chartWrap = document.createElement('div');
    chartWrap.className = 'dc-chart-wrap';

    const totalW = this.chartPadding * 2 + this.colWidth * 16;
    const totalH = this.chartPadding * 2 + (20 + this.toothSize + 8 + this.anatomyHeight) * 2 + 30;

    const svg = document.createElementNS(this.svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${totalW} ${totalH}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('class', 'dc-chart-svg');
    svg.id = 'dc-chart-svg';

    // Background
    const bg = this.svgEl('rect', {
      x: 0, y: 0, width: totalW, height: totalH,
      fill: '#09090b', rx: 12
    });
    svg.appendChild(bg);

    // Midline
    const midX = this.chartPadding + this.colWidth * 8;
    svg.appendChild(this.svgEl('line', {
      x1: midX, y1: this.chartPadding,
      x2: midX, y2: totalH - this.chartPadding,
      stroke: '#3F3F46', 'stroke-width': 1, 'stroke-dasharray': '4,4'
    }));

    // Center horizontal separator
    const centerY = totalH / 2;
    svg.appendChild(this.svgEl('line', {
      x1: this.chartPadding, y1: centerY,
      x2: totalW - this.chartPadding, y2: centerY,
      stroke: '#3F3F46', 'stroke-width': 2
    }));

    // Arch labels
    svg.appendChild(this.svgText('UPPER ARCH (Maxillary)', totalW / 2, this.chartPadding - 6, {
      'text-anchor': 'middle', fill: '#71717A', 'font-size': 11, 'font-weight': 600, 'letter-spacing': '1px'
    }));
    svg.appendChild(this.svgText('LOWER ARCH (Mandibular)', totalW / 2, totalH - this.chartPadding + 14, {
      'text-anchor': 'middle', fill: '#71717A', 'font-size': 11, 'font-weight': 600, 'letter-spacing': '1px'
    }));

    // Render Upper Teeth
    this.upperTeeth.forEach((num, i) => {
      const x = this.chartPadding + i * this.colWidth + this.toothGap / 2;
      const quadrant = num >= 21 ? 2 : 1;
      const baseY = this.chartPadding + 4;

      // FDI number
      svg.appendChild(this.svgText(String(num), x + this.toothSize / 2, baseY + 10, {
        'text-anchor': 'middle', fill: '#A1A1AA', 'font-size': 11, 'font-weight': 500,
        'font-family': "'Consolas','Monaco',monospace"
      }));

      // Surface diagram
      const diagY = baseY + 18;
      this.renderSurfaceDiagram(svg, num, x, diagY, true, quadrant);

      // Anatomical tooth
      const anatY = diagY + this.toothSize + 6;
      this.renderAnatomicalTooth(svg, num, x, anatY, true);
    });

    // Render Lower Teeth
    this.lowerTeeth.forEach((num, i) => {
      const x = this.chartPadding + i * this.colWidth + this.toothGap / 2;
      const quadrant = num >= 31 && num <= 38 ? 3 : 4;
      const baseY = centerY + 6;

      // Anatomical tooth
      this.renderAnatomicalTooth(svg, num, x, baseY, false);

      // Surface diagram
      const diagY = baseY + this.anatomyHeight + 6;
      this.renderSurfaceDiagram(svg, num, x, diagY, false, quadrant);

      // FDI number
      svg.appendChild(this.svgText(String(num), x + this.toothSize / 2, diagY + this.toothSize + 16, {
        'text-anchor': 'middle', fill: '#A1A1AA', 'font-size': 11, 'font-weight': 500,
        'font-family': "'Consolas','Monaco',monospace"
      }));
    });

    // Right/Left labels
    svg.appendChild(this.svgText('R', this.chartPadding - 16, centerY + 4, {
      'text-anchor': 'middle', fill: '#52525B', 'font-size': 13, 'font-weight': 700
    }));
    svg.appendChild(this.svgText('L', totalW - this.chartPadding + 16, centerY + 4, {
      'text-anchor': 'middle', fill: '#52525B', 'font-size': 13, 'font-weight': 700
    }));

    chartWrap.appendChild(svg);
    this.container.appendChild(chartWrap);
  }

  // ── Surface Diagram (5-surface odontogram) ─────────────────────────────

  private renderSurfaceDiagram(svg: SVGElement, toothNum: number, x: number, y: number, isUpper: boolean, quadrant: number): void {
    const s = this.toothSize;
    const inner = s * 0.3;
    const o = inner;
    const w = s - inner;
    const tooth = this.patientData.teeth[toothNum];
    if (!tooth) return;
    const isMissing = tooth.wholeCondition === 'missing';

    const isRightQuadrant = quadrant === 1 || quadrant === 4;
    const leftSurface = isRightQuadrant ? 'distal' : 'mesial';
    const rightSurface = isRightQuadrant ? 'mesial' : 'distal';
    const topSurface = isUpper ? 'buccal' : 'lingual';
    const bottomSurface = isUpper ? 'lingual' : 'buccal';

    const surfaces: Record<string, { name: string; path: string }> = {
      top:    { name: topSurface,    path: `M 0,0 L ${s},0 L ${w},${o} L ${o},${o} Z` },
      bottom: { name: bottomSurface, path: `M ${o},${w} L ${w},${w} L ${s},${s} L 0,${s} Z` },
      left:   { name: leftSurface,   path: `M 0,0 L ${o},${o} L ${o},${w} L 0,${s} Z` },
      right:  { name: rightSurface,  path: `M ${s},0 L ${s},${s} L ${w},${w} L ${w},${o} Z` },
      center: { name: 'occlusal',    path: `M ${o},${o} L ${w},${o} L ${w},${w} L ${o},${w} Z` }
    };

    const g = document.createElementNS(this.svgNS, 'g');
    g.setAttribute('transform', `translate(${x},${y})`);
    g.setAttribute('class', `dc-tooth-group${this.selectedTooth === toothNum ? ' selected' : ''}`);
    (g as any).dataset.tooth = toothNum;

    // Outer border
    g.appendChild(this.svgEl('rect', {
      x: -1, y: -1, width: s + 2, height: s + 2,
      fill: 'none', stroke: this.selectedTooth === toothNum ? '#818CF8' : 'transparent',
      'stroke-width': 2, rx: 3
    }));

    Object.entries(surfaces).forEach(([pos, surf]) => {
      const cond = tooth.surfaces[surf.name];
      const condDef = this.conditions[cond] || this.conditions.healthy;
      let fillColor = condDef.color;
      let opacity = 1;
      let strokeColor = '#52525B';
      let strokeW = 1;

      if (isMissing) {
        fillColor = '#27272A';
        opacity = 0.4;
        strokeColor = '#3F3F46';
      }

      if (tooth.wholeCondition === 'crown') {
        strokeColor = this.conditions.crown.color;
        strokeW = 2;
      } else if (tooth.wholeCondition === 'veneer' && pos === 'top') {
        fillColor = this.conditions.veneer.color;
      }

      const path = this.svgEl('path', {
        d: surf.path,
        fill: fillColor,
        stroke: strokeColor,
        'stroke-width': strokeW,
        opacity,
        class: 'dc-surface',
        'data-tooth': toothNum,
        'data-surface': surf.name,
        cursor: isMissing ? 'default' : 'pointer'
      });

      path.addEventListener('mouseenter', () => {
        if (isMissing) return;
        path.setAttribute('stroke', '#A1A1AA');
        path.setAttribute('stroke-width', '2');
      });
      path.addEventListener('mouseleave', () => {
        path.setAttribute('stroke', strokeColor);
        path.setAttribute('stroke-width', String(strokeW));
      });

      path.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isMissing && this.activeMode !== 'whole') return;
        this.handleToothClick(toothNum, surf.name);
      });

      g.appendChild(path);

      // Surface label
      const labelPositions: Record<string, { cx: number; cy: number }> = {
        top:    { cx: s / 2, cy: o / 2 + 1 },
        bottom: { cx: s / 2, cy: s - o / 2 - 1 },
        left:   { cx: o / 2, cy: s / 2 },
        right:  { cx: s - o / 2, cy: s / 2 },
        center: { cx: s / 2, cy: s / 2 }
      };
      const lp = labelPositions[pos];
      g.appendChild(this.svgText(
        this.surfaceLabels[surf.name] || surf.name[0].toUpperCase(),
        lp.cx, lp.cy + 3,
        {
          'text-anchor': 'middle', fill: isMissing ? '#3F3F46' : '#18181B',
          'font-size': 8, 'font-weight': 600, 'pointer-events': 'none',
          'font-family': "'Segoe UI',sans-serif"
        }
      ));
    });

    // Missing X overlay
    if (isMissing) {
      g.appendChild(this.svgEl('line', {
        x1: 2, y1: 2, x2: s - 2, y2: s - 2,
        stroke: '#EF4444', 'stroke-width': 2, 'pointer-events': 'none', opacity: 0.7
      }));
      g.appendChild(this.svgEl('line', {
        x1: s - 2, y1: 2, x2: 2, y2: s - 2,
        stroke: '#EF4444', 'stroke-width': 2, 'pointer-events': 'none', opacity: 0.7
      }));
    }

    // Fracture indicator
    if (tooth.wholeCondition === 'fracture') {
      g.appendChild(this.svgEl('line', {
        x1: s * 0.2, y1: s * 0.15, x2: s * 0.8, y2: s * 0.85,
        stroke: '#DC2626', 'stroke-width': 2.5, 'stroke-dasharray': '3,2',
        'pointer-events': 'none'
      }));
    }

    // Implant indicator
    if (tooth.wholeCondition === 'implant') {
      g.appendChild(this.svgEl('circle', {
        cx: s / 2, cy: s / 2, r: s * 0.2,
        fill: 'none', stroke: '#2DD4BF', 'stroke-width': 2,
        'pointer-events': 'none'
      }));
      g.appendChild(this.svgEl('line', {
        x1: s / 2, y1: s * 0.3, x2: s / 2, y2: s * 0.7,
        stroke: '#2DD4BF', 'stroke-width': 2, 'pointer-events': 'none'
      }));
      g.appendChild(this.svgEl('line', {
        x1: s * 0.3, y1: s / 2, x2: s * 0.7, y2: s / 2,
        stroke: '#2DD4BF', 'stroke-width': 2, 'pointer-events': 'none'
      }));
    }

    svg.appendChild(g);
  }

  // ── Anatomical Tooth View ──────────────────────────────────────────────

  private renderAnatomicalTooth(svg: SVGElement, toothNum: number, x: number, y: number, isUpper: boolean): void {
    const type = this.toothTypes[toothNum];
    const tooth = this.patientData.teeth[toothNum];
    if (!tooth) return;
    const isMissing = tooth.wholeCondition === 'missing';
    const w = this.toothSize;
    const h = this.anatomyHeight;

    const g = document.createElementNS(this.svgNS, 'g');
    g.setAttribute('transform', `translate(${x},${y})`);
    g.setAttribute('class', 'dc-anatomy-group');

    let crownFill = '#D4D4D8';
    let rootFill = '#A1A1AA';
    let crownStroke = '#71717A';
    let opacity = 1;

    if (isMissing) {
      crownFill = '#27272A'; rootFill = '#27272A';
      crownStroke = '#3F3F46'; opacity = 0.3;
    } else if (tooth.wholeCondition === 'crown') {
      crownFill = '#C4B5FD'; crownStroke = '#A78BFA';
    } else if (tooth.wholeCondition === 'implant') {
      crownFill = '#99F6E4'; rootFill = '#5EEAD4'; crownStroke = '#2DD4BF';
    } else if (tooth.wholeCondition === 'pontic') {
      crownFill = '#C7D2FE'; crownStroke = '#818CF8'; rootFill = 'transparent';
    } else if (tooth.wholeCondition === 'veneer') {
      crownFill = '#A5F3FC'; crownStroke = '#22D3EE';
    } else if (tooth.wholeCondition === 'impacted') {
      opacity = 0.5; crownStroke = '#78716C';
    }

    // Check for RCT on any surface
    const hasRCT = Object.values(tooth.surfaces).some(s => s === 'rct');
    if (hasRCT) {
      rootFill = '#FDBA74';
    }

    const paths = this.getToothPaths(type, w, h, isUpper);

    // Root(s)
    paths.roots.forEach(rootPath => {
      g.appendChild(this.svgEl('path', {
        d: rootPath, fill: rootFill, stroke: crownStroke, 'stroke-width': 1, opacity
      }));
      if (hasRCT && !isMissing) {
        g.appendChild(this.svgEl('path', {
          d: rootPath, fill: 'none', stroke: '#FB923C',
          'stroke-width': 1.5, 'stroke-dasharray': '2,2', opacity: 0.8, 'pointer-events': 'none'
        }));
      }
    });

    // Crown
    const crownEl = this.svgEl('path', {
      d: paths.crown, fill: crownFill, stroke: crownStroke,
      'stroke-width': 1.2, opacity, cursor: 'pointer'
    });
    crownEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleToothClick(toothNum, null);
    });
    g.appendChild(crownEl);

    // Implant screw threads
    if (tooth.wholeCondition === 'implant' && !isMissing) {
      const screwCenterX = w / 2;
      const screwTop = isUpper ? 2 : h * 0.55;
      const screwBot = isUpper ? h * 0.45 : h - 2;
      for (let ty = screwTop + 5; ty < screwBot - 3; ty += 6) {
        g.appendChild(this.svgEl('line', {
          x1: screwCenterX - 5, y1: ty, x2: screwCenterX + 5, y2: ty,
          stroke: '#0D9488', 'stroke-width': 1, opacity: 0.7, 'pointer-events': 'none'
        }));
      }
    }

    // Missing X
    if (isMissing) {
      g.appendChild(this.svgEl('line', {
        x1: 4, y1: 4, x2: w - 4, y2: h - 4,
        stroke: '#EF4444', 'stroke-width': 1.5, opacity: 0.5, 'pointer-events': 'none'
      }));
      g.appendChild(this.svgEl('line', {
        x1: w - 4, y1: 4, x2: 4, y2: h - 4,
        stroke: '#EF4444', 'stroke-width': 1.5, opacity: 0.5, 'pointer-events': 'none'
      }));
    }

    svg.appendChild(g);
  }

  private getToothPaths(type: string, w: number, h: number, isUpper: boolean): { crown: string; roots: string[] } {
    const cx = w / 2;
    const crownH = h * 0.42;
    const rootH = h * 0.52;

    if (isUpper) {
      const crownTop = h - crownH;
      const rootBot = crownTop;
      switch (type) {
        case 'central_incisor':
          return {
            crown: `M ${cx - 12},${crownTop} Q ${cx - 14},${h} ${cx},${h} Q ${cx + 14},${h} ${cx + 12},${crownTop} Z`,
            roots: [`M ${cx - 4},${rootBot} Q ${cx - 3},4 ${cx},2 Q ${cx + 3},4 ${cx + 4},${rootBot} Z`]
          };
        case 'lateral_incisor':
          return {
            crown: `M ${cx - 10},${crownTop} Q ${cx - 12},${h} ${cx},${h} Q ${cx + 12},${h} ${cx + 10},${crownTop} Z`,
            roots: [`M ${cx - 3},${rootBot} Q ${cx - 2},6 ${cx},3 Q ${cx + 2},6 ${cx + 3},${rootBot} Z`]
          };
        case 'canine':
          return {
            crown: `M ${cx - 10},${crownTop} Q ${cx - 12},${h - 6} ${cx},${h} Q ${cx + 12},${h - 6} ${cx + 10},${crownTop} Z`,
            roots: [`M ${cx - 4},${rootBot} Q ${cx - 3},2 ${cx},0 Q ${cx + 3},2 ${cx + 4},${rootBot} Z`]
          };
        case 'premolar':
          return {
            crown: `M ${cx - 11},${crownTop + 2} L ${cx - 8},${crownTop} L ${cx - 3},${crownTop + 4} L ${cx + 3},${crownTop + 4} L ${cx + 8},${crownTop} L ${cx + 11},${crownTop + 2} Q ${cx + 13},${h} ${cx},${h} Q ${cx - 13},${h} ${cx - 11},${crownTop + 2} Z`,
            roots: [
              `M ${cx - 5},${rootBot} Q ${cx - 6},10 ${cx - 3},4 Q ${cx - 1},10 ${cx - 1},${rootBot} Z`,
              `M ${cx + 1},${rootBot} Q ${cx + 1},10 ${cx + 3},4 Q ${cx + 6},10 ${cx + 5},${rootBot} Z`
            ]
          };
        case 'molar':
          return {
            crown: `M ${cx - 16},${crownTop + 2} L ${cx - 12},${crownTop} L ${cx - 4},${crownTop + 3} L ${cx + 4},${crownTop + 3} L ${cx + 12},${crownTop} L ${cx + 16},${crownTop + 2} Q ${cx + 17},${h} ${cx},${h} Q ${cx - 17},${h} ${cx - 16},${crownTop + 2} Z`,
            roots: [
              `M ${cx - 10},${rootBot} Q ${cx - 12},12 ${cx - 8},4 Q ${cx - 5},12 ${cx - 5},${rootBot} Z`,
              `M ${cx - 2},${rootBot} Q ${cx - 1},14 ${cx},6 Q ${cx + 1},14 ${cx + 2},${rootBot} Z`,
              `M ${cx + 5},${rootBot} Q ${cx + 5},12 ${cx + 8},4 Q ${cx + 12},12 ${cx + 10},${rootBot} Z`
            ]
          };
        default:
          return { crown: `M ${cx - 10},${crownTop} L ${cx + 10},${crownTop} L ${cx + 10},${h} L ${cx - 10},${h} Z`, roots: [] };
      }
    } else {
      const crownBot = crownH;
      const rootTop = crownBot;
      switch (type) {
        case 'central_incisor':
          return {
            crown: `M ${cx - 10},${crownBot} Q ${cx - 12},0 ${cx},0 Q ${cx + 12},0 ${cx + 10},${crownBot} Z`,
            roots: [`M ${cx - 3},${rootTop} Q ${cx - 2},${h - 4} ${cx},${h - 2} Q ${cx + 2},${h - 4} ${cx + 3},${rootTop} Z`]
          };
        case 'lateral_incisor':
          return {
            crown: `M ${cx - 9},${crownBot} Q ${cx - 10},0 ${cx},0 Q ${cx + 10},0 ${cx + 9},${crownBot} Z`,
            roots: [`M ${cx - 3},${rootTop} Q ${cx - 2},${h - 5} ${cx},${h - 3} Q ${cx + 2},${h - 5} ${cx + 3},${rootTop} Z`]
          };
        case 'canine':
          return {
            crown: `M ${cx - 10},${crownBot} Q ${cx - 11},6 ${cx},0 Q ${cx + 11},6 ${cx + 10},${crownBot} Z`,
            roots: [`M ${cx - 4},${rootTop} Q ${cx - 3},${h - 2} ${cx},${h} Q ${cx + 3},${h - 2} ${cx + 4},${rootTop} Z`]
          };
        case 'premolar':
          return {
            crown: `M ${cx - 11},${crownBot - 2} L ${cx - 8},${crownBot} Q ${cx - 13},0 ${cx},0 Q ${cx + 13},0 ${cx + 8},${crownBot} L ${cx + 11},${crownBot - 2} Z`,
            roots: [`M ${cx - 3},${rootTop} Q ${cx - 2},${h - 5} ${cx},${h - 3} Q ${cx + 2},${h - 5} ${cx + 3},${rootTop} Z`]
          };
        case 'molar':
          return {
            crown: `M ${cx - 16},${crownBot - 2} L ${cx - 12},${crownBot} L ${cx - 4},${crownBot - 3} L ${cx + 4},${crownBot - 3} L ${cx + 12},${crownBot} L ${cx + 16},${crownBot - 2} Q ${cx + 17},0 ${cx},0 Q ${cx - 17},0 ${cx - 16},${crownBot - 2} Z`,
            roots: [
              `M ${cx - 8},${rootTop} Q ${cx - 10},${h - 8} ${cx - 6},${h - 3} Q ${cx - 3},${h - 8} ${cx - 3},${rootTop} Z`,
              `M ${cx + 3},${rootTop} Q ${cx + 3},${h - 8} ${cx + 6},${h - 3} Q ${cx + 10},${h - 8} ${cx + 8},${rootTop} Z`
            ]
          };
        default:
          return { crown: `M ${cx - 10},0 L ${cx + 10},0 L ${cx + 10},${crownBot} L ${cx - 10},${crownBot} Z`, roots: [] };
      }
    }
  }

  // ── Detail Panel ────────────────────────────────────────────────────────

  private renderDetailPanel(): void {
    const grid = this.container.querySelector('#dc-bottom-grid');
    if (!grid) return;
    const panel = document.createElement('div');
    panel.className = 'dc-detail-panel';
    panel.id = 'dc-detail-panel';

    if (!this.selectedTooth) {
      panel.innerHTML = `
        <div class="dc-detail-empty">
          <div class="dc-detail-empty-icon">&#9737;</div>
          <p>Click on any tooth to view and edit its details</p>
          <p class="dc-detail-hint"><strong>Surface mode:</strong> Click a surface to set condition &nbsp;|&nbsp; <strong>Whole tooth mode:</strong> Click to set tooth status</p>
        </div>
      `;
    } else {
      const num = this.selectedTooth;
      const tooth = this.patientData.teeth[num];
      const type = this.toothTypes[num];
      const typeName = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const quadrantNames: Record<number, string> = { 1: 'Upper Right', 2: 'Upper Left', 3: 'Lower Left', 4: 'Lower Right' };
      const q = num >= 11 && num <= 18 ? 1 : num >= 21 && num <= 28 ? 2 : num >= 31 && num <= 38 ? 3 : 4;

      const surfaceRows = Object.entries(tooth.surfaces).map(([surf, cond]) => {
        const condDef = this.conditions[cond as string];
        const isActive = this.selectedSurface === surf;
        return `<div class="dc-surf-row${isActive ? ' active' : ''}" data-surface="${surf}">
          <span class="dc-surf-label">${surf.charAt(0).toUpperCase() + surf.slice(1)}</span>
          <span class="dc-surf-cond" style="color:${condDef.color}">
            <span class="dc-cond-dot-sm" style="background:${condDef.color}"></span>
            ${condDef.label}
          </span>
        </div>`;
      }).join('');

      const wholeCond = tooth.wholeCondition ? this.conditions[tooth.wholeCondition] : null;

      panel.innerHTML = `
        <div class="dc-detail-header">
          <div class="dc-detail-tooth-num">${num}</div>
          <div class="dc-detail-tooth-info">
            <h4>Tooth #${num} - ${typeName}</h4>
            <span class="dc-detail-quad">${quadrantNames[q]} Quadrant</span>
          </div>
          <button class="dc-btn dc-btn-outline dc-btn-sm" id="dc-btn-reset-tooth" title="Reset tooth to healthy">Reset</button>
        </div>
        <div class="dc-detail-body">
          <div class="dc-detail-section">
            <h5>Whole Tooth Status</h5>
            <div class="dc-whole-status">
              ${wholeCond ?
                `<span class="dc-cond-dot-sm" style="background:${wholeCond.color}"></span> ${wholeCond.label}` :
                '<span style="color:#71717A">Normal (no whole-tooth condition)</span>'}
              ${wholeCond ? `<button class="dc-btn-clear" id="dc-clear-whole" title="Clear whole tooth condition">&#10005;</button>` : ''}
            </div>
          </div>
          <div class="dc-detail-section">
            <h5>Surface Conditions</h5>
            <div class="dc-surf-list">${surfaceRows}</div>
          </div>
          <div class="dc-detail-section">
            <h5>Mobility</h5>
            <div class="dc-mobility">
              ${[0, 1, 2, 3].map(m =>
                `<button class="dc-mob-btn${tooth.mobility === m ? ' active' : ''}" data-mob="${m}">${m}</button>`
              ).join('')}
            </div>
          </div>
          <div class="dc-detail-section">
            <h5>Notes</h5>
            <textarea class="dc-tooth-note" id="dc-tooth-note" placeholder="Add clinical notes...">${this.esc(tooth.note)}</textarea>
          </div>
        </div>
      `;
    }

    const old = grid.querySelector('#dc-detail-panel');
    if (old) old.replaceWith(panel);
    else grid.appendChild(panel);

    // Attach listeners
    if (this.selectedTooth) {
      const num = this.selectedTooth;
      panel.querySelector('#dc-btn-reset-tooth')?.addEventListener('click', () => this.resetTooth(num));
      panel.querySelector('#dc-clear-whole')?.addEventListener('click', () => {
        this.patientData.teeth[num].wholeCondition = null;
        this.addHistory(num, 'Cleared whole tooth condition');
        this.callbacks.onWholeToothChange?.(num, null);
        this.refreshChart();
      });
      panel.querySelectorAll('.dc-mob-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const mob = parseInt((btn as HTMLElement).dataset.mob!);
          this.patientData.teeth[num].mobility = mob;
          this.addHistory(num, `Mobility set to ${mob}`);
          this.callbacks.onMobilityChange?.(num, mob);
          this.renderDetailPanel();
        });
      });
      panel.querySelector('#dc-tooth-note')?.addEventListener('input', (e) => {
        const note = (e.target as HTMLTextAreaElement).value;
        this.patientData.teeth[num].note = note;
      });
      panel.querySelector('#dc-tooth-note')?.addEventListener('change', (e) => {
        const note = (e.target as HTMLTextAreaElement).value;
        this.callbacks.onNoteChange?.(num, note);
      });
      panel.querySelectorAll('.dc-surf-row').forEach(row => {
        row.addEventListener('click', () => {
          this.selectedSurface = (row as HTMLElement).dataset.surface!;
          this.renderDetailPanel();
        });
      });
    }
  }

  // ── History Panel ───────────────────────────────────────────────────────

  private renderHistoryPanel(): void {
    const grid = this.container.querySelector('#dc-bottom-grid');
    if (!grid) return;
    const panel = document.createElement('div');
    panel.className = 'dc-history-panel';
    panel.id = 'dc-history-panel';

    const entries = this.patientData.history.slice(-20).reverse();
    panel.innerHTML = `
      <div class="dc-history-header">
        <h5>Session History</h5>
        <span class="dc-history-count">${this.patientData.history.length} entries</span>
      </div>
      <div class="dc-history-list">
        ${entries.length === 0 ?
          '<div class="dc-history-empty">No changes recorded this session</div>' :
          entries.map(e => `
            <div class="dc-history-entry">
              <span class="dc-history-tooth">#${e.tooth}</span>
              <span class="dc-history-action">${this.esc(e.action)}</span>
              <span class="dc-history-time">${e.time}</span>
            </div>
          `).join('')
        }
      </div>
    `;

    const old = grid.querySelector('#dc-history-panel');
    if (old) old.replaceWith(panel);
    else grid.appendChild(panel);
  }

  // ── Event Handling ──────────────────────────────────────────────────────

  private handleToothClick(toothNum: number, surfaceName: string | null): void {
    const tooth = this.patientData.teeth[toothNum];
    if (!tooth) return;

    if (this.activeMode === 'whole') {
      this.selectedTooth = toothNum;
      this.selectedSurface = null;
      const cond = this.activeCondition;
      const condDef = this.conditions[cond];

      if (condDef && condDef.category === 'whole') {
        if (tooth.wholeCondition === cond) {
          tooth.wholeCondition = null;
          this.addHistory(toothNum, `Removed ${condDef.label}`);
        } else {
          tooth.wholeCondition = cond;
          this.addHistory(toothNum, `Set ${condDef.label}`);
        }
        this.callbacks.onWholeToothChange?.(toothNum, tooth.wholeCondition);
      }
    } else {
      this.selectedTooth = toothNum;
      if (surfaceName) {
        this.selectedSurface = surfaceName;
        const cond = this.activeCondition;
        const condDef = this.conditions[cond];

        if (condDef && condDef.category === 'surface') {
          const oldCond = tooth.surfaces[surfaceName];
          if (oldCond === cond) {
            tooth.surfaces[surfaceName] = 'healthy';
            this.addHistory(toothNum, `${surfaceName}: cleared (was ${condDef.label})`);
          } else {
            tooth.surfaces[surfaceName] = cond;
            this.addHistory(toothNum, `${surfaceName}: ${condDef.label}`);
          }
          this.callbacks.onSurfaceChange?.(toothNum, surfaceName, tooth.surfaces[surfaceName]);
        }
      }
    }

    this.refreshChart();
  }

  private attachGlobalListeners(): void {
    this.keydownHandler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if (this.selectedTooth && e.key >= '1' && e.key <= '5') {
        const surfaces = ['buccal', 'lingual', 'mesial', 'distal', 'occlusal'];
        this.selectedSurface = surfaces[parseInt(e.key) - 1];
        this.renderDetailPanel();
      }
      if (e.key === 'Escape') {
        this.selectedTooth = null;
        this.selectedSurface = null;
        this.refreshChart();
      }
    };
    document.addEventListener('keydown', this.keydownHandler);
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  private resetTooth(toothNum: number): void {
    this.patientData.teeth[toothNum] = {
      status: 'present',
      wholeCondition: null,
      surfaces: {
        buccal: 'healthy', lingual: 'healthy',
        mesial: 'healthy', distal: 'healthy',
        occlusal: 'healthy'
      },
      mobility: 0,
      note: ''
    };
    this.addHistory(toothNum, 'Reset to healthy');
    this.callbacks.onResetTooth?.(toothNum);
    this.refreshChart();
  }

  private addHistory(toothNum: number, action: string): void {
    this.patientData.history.push({
      tooth: toothNum,
      action,
      time: new Date().toLocaleTimeString()
    });
  }

  private refreshChart(): void {
    const chartWrap = this.container.querySelector('.dc-chart-wrap');
    const detailPanel = this.container.querySelector('#dc-detail-panel');
    const historyPanel = this.container.querySelector('#dc-history-panel');

    if (chartWrap) chartWrap.remove();
    if (detailPanel) detailPanel.remove();
    if (historyPanel) historyPanel.remove();

    this.renderChart();
    this.renderDetailPanel();
    this.renderHistoryPanel();
  }

  // ── SVG Helpers ─────────────────────────────────────────────────────────

  private svgEl(tag: string, attrs: Record<string, any>): SVGElement {
    const el = document.createElementNS(this.svgNS, tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (v !== undefined && v !== null) el.setAttribute(k, String(v));
    });
    return el;
  }

  private svgText(text: string, x: number, y: number, attrs: Record<string, any> = {}): SVGTextElement {
    const el = document.createElementNS(this.svgNS, 'text') as SVGTextElement;
    el.setAttribute('x', String(x));
    el.setAttribute('y', String(y));
    Object.entries(attrs).forEach(([k, v]) => {
      if (v !== undefined && v !== null) el.setAttribute(k, String(v));
    });
    el.textContent = text;
    return el;
  }

  private esc(str: string): string {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
