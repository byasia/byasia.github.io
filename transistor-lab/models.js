export const VT = 0.02585;
export const IS = 1e-15;
export const REVERSE_BETA = 2;
export const JFET_IDSS = 0.006;
export const CUTOFF_CURRENT = 1e-6;

const fetFields = (input, parameter) => [
  { key: 'input', symbol: 'VGS', label: '栅–源电压', unit: 'V', step: 0.05, digits: 2, ...input },
  { key: 'output', symbol: 'VDS', label: '漏–源电压', unit: 'V', min: 0, max: 8, step: 0.05, digits: 2 },
  { key: 'parameter', unit: 'V', step: 0.05, digits: 2, ...parameter }
];

export const devices = {
  bjt: {
    name: 'NPN BJT', short: 'BJT', type: '双极型晶体管',
    terminals: 'E 发射极 · B 基极 · C 集电极',
    fields: [
      { key: 'input', symbol: 'VBE', label: '基–射电压', unit: 'V', min: 0, max: 0.77, step: 0.001, digits: 3 },
      { key: 'output', symbol: 'VCE', label: '集–射电压', unit: 'V', min: 0.05, max: 5, step: 0.01, digits: 2 },
      { key: 'parameter', symbol: 'βF', label: '正向放大区模型参数', unit: '', min: 30, max: 250, step: 1, digits: 0 }
    ],
    presets: [
      { name: '正向放大', input: 0.70, output: 2.5, parameter: 100 },
      { name: '双结正偏', input: 0.70, output: 0.12, parameter: 100 },
      { name: '近似截止', input: 0.50, output: 2.5, parameter: 100 }
    ]
  },
  jfet: {
    name: 'N 沟道 JFET', short: 'JFET', type: '结型场效应晶体管',
    terminals: 'S 源极 · G 栅极 · D 漏极',
    fields: fetFields({ min: -6, max: 0 }, { symbol: 'VGS(off)', label: '栅–源截止电压', min: -5, max: -1 }),
    presets: [
      { name: '反偏调流', input: -1, output: 4, parameter: -3 },
      { name: '零栅压', input: 0, output: 5, parameter: -3 },
      { name: '欧姆区', input: -1, output: 0.5, parameter: -3 },
      { name: '负栅压截止', input: -3.5, output: 4, parameter: -3 }
    ]
  },
  mos: {
    name: '增强型 NMOS', short: '增强型', type: '绝缘栅 · 零栅压常关',
    terminals: 'S 源极 · G 栅极 · D 漏极 · B 体端',
    fields: fetFields({ min: -2, max: 6 }, { symbol: 'VTH', label: '阈值电压', min: 0.5, max: 4 }),
    presets: [
      { name: '形成反型沟道', input: 3.5, output: 0.8, parameter: 2 },
      { name: '漏端夹断', input: 3.5, output: 3, parameter: 2 },
      { name: '零栅压', input: 0, output: 3, parameter: 2 },
      { name: '有沟道，零漏压', input: 3.5, output: 0, parameter: 2 }
    ]
  },
  dmos: {
    name: '耗尽型 NMOS', short: '耗尽型', type: '绝缘栅 · 零栅压常开',
    terminals: 'S 源极 · G 栅极 · D 漏极 · B 体端',
    fields: fetFields({ min: -6, max: 4 }, { symbol: 'VTH', label: '负阈值电压', min: -5, max: -0.5 }),
    presets: [
      { name: '零栅压导通', input: 0, output: 4, parameter: -2 },
      { name: '负压耗尽', input: -1, output: 4, parameter: -2 },
      { name: '负压截止', input: -2.5, output: 4, parameter: -2 },
      { name: '正压增强', input: 1, output: 4, parameter: -2 }
    ]
  }
};

export const regionLabels = {
  cutoff: '截止区',
  ohmic: '欧姆区',
  active: '正向放大区',
  saturation: '饱和区'
};

function solveBjt({ input: vbe, output: vce, parameter: beta }) {
  const vbc = vbe - vce;
  const forward = Math.expm1(vbe / VT);
  const reverse = Math.expm1(vbc / VT);
  const alphaR = REVERSE_BETA / (1 + REVERSE_BETA);
  const ic = IS * (forward - reverse / alphaR);
  const ib = IS * (forward / beta + reverse / REVERSE_BETA);
  const gm = (IS / VT) * (Math.exp(vbe / VT) - Math.exp(vbc / VT) / alphaR);
  const region = ic < CUTOFF_CURRENT ? 'cutoff' : vbc > 1e-9 ? 'saturation' : 'active';
  return { current: ic, ib, gm, vbc, betaActual: ib > 0 ? ic / ib : null, region };
}

function solveFet(device, { input: vgs, output: vds, parameter: threshold }) {
  const overdrive = vgs - threshold;
  const k = device === 'jfet' ? (2 * JFET_IDSS) / (threshold * threshold) : 0.002;
  const effectiveVds = Math.max(0, Math.min(vds, overdrive));
  const current = k * (overdrive * effectiveVds - effectiveVds ** 2 / 2);
  const region = overdrive <= 1e-9 ? 'cutoff' : vds + 1e-9 < overdrive ? 'ohmic' : 'saturation';
  return { current: region === 'cutoff' ? 0 : current, gm: region === 'cutoff' ? 0 : k * effectiveVds, overdrive, vgd: vgs - vds, region };
}

export function solve(device, bias) {
  return device === 'bjt' ? solveBjt(bias) : solveFet(device, bias);
}

export function decimal(number, digits = 2) {
  return (Math.abs(number) < 0.5 * 10 ** -digits ? 0 : number).toFixed(digits).replace('-', '−');
}

export function currentText(value) {
  if (value === 0) return '0 mA';
  if (Math.abs(value) < 1e-6) return decimal(value * 1e9, 2) + ' nA';
  if (Math.abs(value) < 1e-3) return decimal(value * 1e6, 2) + ' μA';
  return decimal(value * 1e3, 2) + ' mA';
}

export function regionExplanation(device, bias, model) {
  if (device === 'bjt') {
    if (model.region === 'cutoff') return '此处 IC 小于 1 μA，实验标为近似截止。硅管的电流随 VBE 连续变化，严格截止时两个结均未正偏。';
    if (model.region === 'saturation') return 'VBC = ' + decimal(model.vbc, 3) + ' V，基–集结也被正向偏置。观察实际 IC/IB 已低于设定的 βF。';
    return '基–射结注入电子，基–集结未正偏。正向放大时 IC/IB 接近 βF，gm 约为 IC / VT。';
  }
  if (model.region === 'cutoff') {
    return device === 'mos'
      ? 'VGS 没有超过 VTH，强反型沟道尚未形成。本模型把亚阈值漏电近似为零。'
      : 'VGS 已到达或低于截止边界，可供漂移的沟道电子显著减少，本模型取 ID = 0。';
  }
  if (bias.output === 0) return '源漏之间已有可导电的通路。此刻 VDS = 0，没有横向电场，所以净漏极电流为零。';
  if (model.region === 'ohmic') return 'VDS 小于过驱动电压 ' + decimal(model.overdrive) + ' V，漏端仍有沟道。小 VDS 下，器件近似电压控制的电阻。';
  return 'VDS 已达到过驱动电压 ' + decimal(model.overdrive) + ' V，漏端夹断。电子仍由源端补入，并被漏端附近的电场收集。';
}
