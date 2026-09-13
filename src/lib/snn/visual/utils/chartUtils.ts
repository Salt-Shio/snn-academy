/**
 * 產生電壓曲線 SVG Path
 */
export const getVoltagePath = (data: number[]): string => {
  if (data.length === 0) return "0,200";
  const width = 800;
  const height = 200;
  const stepX = width / data.length;
  const scaleV = (v: number) => height - ((v + 85) / 90) * height;
  return data.map((v, i) => `${(i * stepX).toFixed(2)},${scaleV(v).toFixed(2)}`).join(" L ");
};

/**
 * 產生電流曲線 SVG Path
 */
export const getCurrentPath = (data: number[]): string => {
  if (data.length === 0) return "0,60";
  const width = 800;
  const height = 60;
  const stepX = width / data.length;
  const maxI = data.reduce((max, val) => Math.max(max, val), 1000);
  const scaleI = (i: number) => height - (i / maxI) * height;
  return data.map((iVal, idx) => `${(idx * stepX).toFixed(2)},${scaleI(iVal).toFixed(2)}`).join(" L ");
};

/**
 * 產生權重曲線 SVG Path
 */
export const getWeightPath = (data: number[], baseWeight: number): string => {
  if (data.length === 0) return "0,60";
  const width = 400;
  const height = 60;
  const stepX = width / data.length;
  // 動態尋找目前的權重邊界，若數據全為 0 則給予基礎範圍
  const maxW = data.reduce((max, val) => Math.max(max, val), baseWeight * 2);
  const minW = data.reduce((min, val) => Math.min(min, val), 0);
  const range = (maxW - minW) || 1;
  const scaleW = (w: number) => height - ((w - minW) / range) * height;
  return data.map((w, i) => `${(i * stepX).toFixed(2)},${scaleW(w).toFixed(2)}`).join(" L ");
};

/**
 * 產生 F-I 曲線 SVG Path
 */
export const getFIPath = (data: { current: number; freq: number }[], maxI: number): string => {
  if (data.length === 0) return "0,120";
  const width = 300;
  const height = 120;
  const maxF = data.reduce((max, d) => Math.max(max, d.freq), 100);

  return data.map(d => {
    const x = (d.current / maxI) * width;
    const y = height - (d.freq / maxF) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" L ");
};
