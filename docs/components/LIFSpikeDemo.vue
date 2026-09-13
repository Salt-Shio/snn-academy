<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { LIFNeuron } from '../../src/lib/snn/neurons'
import { getVoltagePath } from '../../src/lib/snn/visual/utils/chartUtils'
import renderMathInElement from 'katex/dist/contrib/auto-render'

const demoRef = ref<HTMLElement | null>(null)

const renderMath = () => {
  if (demoRef.value) {
    renderMathInElement(demoRef.value, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ]
    })
  }
}

const SIM_DURATION = 300 // ms
const DT = 0.1 // ms
const STEPS = SIM_DURATION / DT

// 固定錨點：對應課文「V_reset = V_rest」的設定，不開放調整，避免跟課文敘述打架
const V_REST = -70

// 可調參數，皆對應 LIFNeuron 的 LIFParams
const injectedCurrent = ref(250) // pA，外部刺激電流 I(t)
const vTh = ref(-55)             // mV，閾值
const gL = ref(10)               // nS，漏電導
const cM = ref(100)              // pF，膜電容
const tauRef = ref(2)            // ms，不應期

// 對應課文 tau_m = C_m / g_L 的公式
const tauM = computed(() => cM.value / gL.value)

const simulation = computed(() => {
  const neuron = new LIFNeuron({
    V_th: vTh.value,
    V_reset: V_REST,
    V_L: V_REST,
    g_L: gL.value,
    C_m: cM.value,
    tref: tauRef.value,
  })

  const history: number[] = []
  const spikeTimes: number[] = []

  for (let i = 0; i < STEPS; i++) {
    const t = i * DT
    const spiked = neuron.step(DT, t, 0, injectedCurrent.value)
    history.push(neuron.v)
    if (spiked) spikeTimes.push(t)
  }

  return { history, spikeTimes }
})

const voltagePath = computed(() => getVoltagePath(simulation.value.history))

// 跟 getVoltagePath 用同一套換算，讓參考線/座標軸對得上曲線的座標系
// (chartUtils.getVoltagePath 假設繪圖區固定 800x200，電壓定義域固定 -85 ~ +5 mV)
const PLOT_WIDTH = 800
const PLOT_HEIGHT = 200
const MARGIN_LEFT = 46
const MARGIN_RIGHT = 34
const MARGIN_TOP = 14
const MARGIN_BOTTOM = 26
const VIEWBOX_WIDTH = MARGIN_LEFT + PLOT_WIDTH + MARGIN_RIGHT
const VIEWBOX_HEIGHT = MARGIN_TOP + PLOT_HEIGHT + MARGIN_BOTTOM

const scaleV = (v: number) => PLOT_HEIGHT - ((v + 85) / 90) * PLOT_HEIGHT
const scaleT = (t: number) => (t / SIM_DURATION) * PLOT_WIDTH

const restY = computed(() => scaleV(V_REST))
const thY = computed(() => scaleV(vTh.value))

// Y 軸固定只有 4 個刻度(下限/V_rest/V_th/上限)，直接展開成獨立元素而不是 v-for。
// 原本用 v-for 綁 V_th 的動態 value，拖曳滑桿時該項目的排序位置會變動，
// Vue 的 keyed-diff 在此情境下會誤判節點對應關係，實測會直接讓 patch 拋錯。
// X 軸的 xTicks 是固定不變的陣列，不受任何 ref 影響，v-for 沒有這個問題。
const xTicks = [0, 75, 150, 225, 300]

// spike 事件改成單一 path 字串(多段 M...L 各自獨立的垂直線)，不用 v-for 逐條 <line> 綁 key。
// 原因同上：spikeTimes 每次都整批換新，用單一路徑徹底避開 keyed-diff。
const spikeMarksPath = computed(() =>
  simulation.value.spikeTimes
    .map((t) => `M ${scaleT(t).toFixed(2)} 0 L ${scaleT(t).toFixed(2)} ${PLOT_HEIGHT}`)
    .join(' ')
)

onMounted(() => {
  nextTick(renderMath)
})
</script>

<template>
  <div class="lif-demo" ref="demoRef">
    <div class="params-grid">
      <div class="param-row">
        <label for="lif-demo-current"><span class="label-static">注入電流 $I(t)$：</span><span class="value-readout">{{ injectedCurrent }}</span> pA</label>
        <input id="lif-demo-current" type="range" min="0" max="500" step="10" v-model.number="injectedCurrent" />
      </div>
      <div class="param-row">
        <label for="lif-demo-vth"><span class="label-static">閾值 $V_{th}$：</span><span class="value-readout">{{ vTh }}</span> mV</label>
        <input id="lif-demo-vth" type="range" min="-65" max="-40" step="1" v-model.number="vTh" />
      </div>
      <div class="param-row">
        <label for="lif-demo-gl"><span class="label-static">漏電導 $g_L$：</span><span class="value-readout">{{ gL }}</span> nS</label>
        <input id="lif-demo-gl" type="range" min="2" max="30" step="1" v-model.number="gL" />
      </div>
      <div class="param-row">
        <label for="lif-demo-cm"><span class="label-static">膜電容 $C_m$：</span><span class="value-readout">{{ cM }}</span> pF</label>
        <input id="lif-demo-cm" type="range" min="20" max="300" step="10" v-model.number="cM" />
      </div>
      <div class="param-row">
        <label for="lif-demo-tref"><span class="label-static">不應期 $\tau_{ref}$：</span><span class="value-readout">{{ tauRef }}</span> ms</label>
        <input id="lif-demo-tref" type="range" min="0" max="10" step="0.5" v-model.number="tauRef" />
      </div>
      <div class="tau-readout">
        <span class="label-static">$\tau_m = C_m / g_L$ =</span> {{ tauM.toFixed(1) }} ms
      </div>
    </div>

    <div class="chart-wrap">
      <svg :viewBox="`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`" class="chart-svg">
        <g :transform="`translate(${MARGIN_LEFT},${MARGIN_TOP})`">
          <!-- Y 軸：固定 4 個刻度，直接展開 -->
          <line x1="0" x2="0" y1="0" :y2="PLOT_HEIGHT" class="axis-line" />
          <g>
            <line x1="-4" x2="0" :y1="scaleV(-85)" :y2="scaleV(-85)" class="axis-tick" />
            <text x="-8" :y="scaleV(-85)" class="axis-label axis-label-y">-85</text>
          </g>
          <g>
            <line x1="-4" x2="0" :y1="restY" :y2="restY" class="axis-tick" />
            <text x="-8" :y="restY" class="axis-label axis-label-y">{{ V_REST }}</text>
          </g>
          <g>
            <line x1="-4" x2="0" :y1="thY" :y2="thY" class="axis-tick" />
            <text x="-8" :y="thY" class="axis-label axis-label-y">{{ vTh }}</text>
          </g>
          <g>
            <line x1="-4" x2="0" :y1="scaleV(5)" :y2="scaleV(5)" class="axis-tick" />
            <text x="-8" :y="scaleV(5)" class="axis-label axis-label-y">+5</text>
          </g>

          <!-- X 軸 -->
          <line x1="0" :x2="PLOT_WIDTH" :y1="PLOT_HEIGHT" :y2="PLOT_HEIGHT" class="axis-line" />
          <g v-for="t in xTicks" :key="'x-' + t">
            <line :x1="scaleT(t)" :x2="scaleT(t)" :y1="PLOT_HEIGHT" :y2="PLOT_HEIGHT + 4" class="axis-tick" />
            <text :x="scaleT(t)" :y="PLOT_HEIGHT + 16" class="axis-label axis-label-x">{{ t }}</text>
          </g>
          <text :x="PLOT_WIDTH + 10" :y="PLOT_HEIGHT + 16" class="axis-unit axis-unit-x">ms</text>
          <text x="0" y="-4" class="axis-unit axis-unit-y">mV</text>

          <!-- 參考線：V_rest / V_th -->
          <line x1="0" :x2="PLOT_WIDTH" :y1="restY" :y2="restY" class="ref-line rest-line" />
          <line x1="0" :x2="PLOT_WIDTH" :y1="thY" :y2="thY" class="ref-line th-line" />

          <!-- 電壓曲線 -->
          <path :d="'M ' + voltagePath" fill="none" class="v-path" />

          <!-- spike 事件：貫穿整個繪圖區的細垂線，單一 path 畫出所有事件 -->
          <path :d="spikeMarksPath" fill="none" class="spike-mark" />
        </g>
      </svg>
    </div>

    <p class="hint">
      拉動滑桿改變 $I(t)$、$V_{th}$、$g_L$、$C_m$、$\tau_{ref}$ 這幾個參數，觀察膜電位怎麼被推向閾值——電流越大、閾值越低、$\tau_m$ 越小，
      $V_m$ 就爬升得越快，橘色垂線（spike 事件）就越密集。電位一旦碰到閾值就會立刻被重置，這正是課文說的「spike 是一個事件，不是把電位真的畫到 $V_{spike}$」。
    </p>
  </div>
</template>

<style scoped>
.lif-demo {
  margin: 1.5rem 0;
  padding: 1.25rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
}

.params-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem 1.5rem;
  margin-bottom: 1rem;
}

.param-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-1);
}

.param-row label {
  font-variant-numeric: tabular-nums;
}

.param-row input[type='range'] {
  accent-color: #10b981;
}

.tau-readout {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  font-variant-numeric: tabular-nums;
}

.chart-wrap {
  position: relative;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.5rem;
}

.chart-svg {
  width: 100%;
  height: 240px;
  display: block;
}

.axis-line {
  stroke: var(--vp-c-text-3);
  stroke-width: 1;
}

.axis-tick {
  stroke: var(--vp-c-text-3);
  stroke-width: 1;
}

.axis-label {
  font-size: 9px;
  fill: var(--vp-c-text-2);
}

.axis-label-y {
  text-anchor: end;
  dominant-baseline: middle;
}

.axis-label-x {
  text-anchor: middle;
  dominant-baseline: hanging;
}

.axis-unit {
  font-size: 9px;
  fill: var(--vp-c-text-3);
}

.axis-unit-x {
  text-anchor: end;
  dominant-baseline: hanging;
}

.axis-unit-y {
  text-anchor: start;
  dominant-baseline: auto;
}

.ref-line {
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.rest-line {
  stroke: var(--vp-c-text-3);
}

.th-line {
  stroke: #f59e0b;
}

.v-path {
  stroke: #10b981;
  stroke-width: 2;
}

.spike-mark {
  stroke: #f59e0b;
  stroke-width: 1.25;
  opacity: 0.7;
}

.hint {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}
</style>
