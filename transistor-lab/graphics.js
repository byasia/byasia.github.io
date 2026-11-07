import { decimal, devices, regionLabels, solve } from './models.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lead = (x, y1, y2, symbol) => '<path class="lead" d="M' + x + ' ' + y1 + 'V' + y2 + '"/><circle class="contact" cx="' + x + '" cy="' + y1 + '" r="4"/><text class="terminal" x="' + x + '" y="' + (y1 - 13) + '">' + symbol + '</text>';
const label = (x, y, text, kind = '') => '<text class="device-label ' + kind + '" x="' + x + '" y="' + y + '">' + text + '</text>';

function particleShape(type) {
  const mark = type === 'electron' ? 'M-3.3 0h6.6' : 'M-3.3 0h6.6 M0 -3.3v6.6';
  return '<circle r="7.2"/><path d="' + mark + '"/>';
}

function staticParticle(type, x, y) {
  return '<g class="particle ' + type + '" transform="translate(' + x + ' ' + y + ')">' + particleShape(type) + '</g>';
}

function stream(type, path, count, duration) {
  return Array.from({ length: count }, (_, index) => {
    const offset = -(index * duration / count);
    return '<g class="particle ' + type + '">' + particleShape(type)
      + '<animateMotion path="' + path + '" begin="' + offset + 's" dur="' + duration + 's" repeatCount="indefinite"/></g>';
  }).join('');
}

function flowPath(path, type = 'electron') {
  return '<path class="flow-guide ' + type + '" d="' + path + '" marker-end="url(#arrow-' + type + ')"/>';
}

function bjtDiagram(model) {
  const moving = model.region !== 'cutoff';
  const saturated = model.region === 'saturation';
  const width = saturated ? 5 : 11 + clamp(-model.vbc * 5, 0, 27);
  const electronPath = 'M100 157 H535';
  const holePath = 'M288 73 V193 H201';
  const recombinePath = 'M109 181 H246 Q263 181 275 195';
  const body = '<rect class="n-type" x="52" y="108" width="197" height="125"/>'
    + '<rect class="p-type" x="249" y="108" width="77" height="125"/>'
    + '<rect class="n-light" x="326" y="108" width="262" height="125"/>'
    + '<rect class="depletion" x="' + (moving ? 245 : 237) + '" y="109" width="' + (moving ? 8 : 22) + '" height="123"/>'
    + '<rect class="depletion" x="320" y="109" width="' + width + '" height="123"/>'
    + lead(111, 51, 108, 'E') + lead(288, 51, 108, 'B') + lead(525, 51, 108, 'C')
    + label(145, 268, 'N⁺ 发射区') + label(288, 268, 'P 基区') + label(469, 268, 'N 集电区')
    + label(247, 298, 'BE 结', 'fine') + label(340, 298, 'BC 结', 'fine');
  if (!moving) return body + staticParticle('electron', 110, 157) + staticParticle('hole', 287, 183) + staticParticle('electron', 521, 157);
  return body + flowPath(electronPath) + flowPath(holePath, 'hole')
    + stream('electron', electronPath, 7, 4) + stream('hole', holePath, 2, 4.1)
    + stream('electron', recombinePath, 1, 4.6)
    + (saturated ? flowPath('M478 199 H330', 'electron') + stream('electron', 'M478 199 H330', 2, 3.5) : '');
}

function jfetDiagram(bias, model) {
  const left = 8 + 53 * Math.sqrt(clamp(-bias.input / -bias.parameter, 0, 1));
  const right = 8 + 53 * Math.sqrt(clamp(-model.vgd / -bias.parameter, 0, 1));
  const top = 'M148 107 H492 V' + (107 + right) + ' L148 ' + (107 + left) + 'Z';
  const bottom = 'M148 229 H492 V' + (229 - right) + ' L148 ' + (229 - left) + 'Z';
  const path = 'M88 168 H552';
  const device = '<rect class="n-type" x="52" y="107" width="536" height="122"/>'
    + '<path class="depletion" d="' + top + '"/><path class="depletion" d="' + bottom + '"/>'
    + '<rect class="p-type" x="148" y="75" width="344" height="32"/>'
    + '<rect class="p-type" x="148" y="229" width="344" height="32"/>'
    + lead(88, 61, 107, 'S') + lead(320, 45, 75, 'G') + lead(552, 61, 107, 'D')
    + label(320, 98, 'P⁺ 栅区', 'small') + label(320, 252, 'P⁺ 栅区', 'small')
    + label(320, 293, 'N 型沟道 · 上下 P⁺ 同属栅极', 'fine')
    + staticParticle('hole', 186, 91) + staticParticle('hole', 456, 245);
  if (model.region === 'cutoff') return device + staticParticle('electron', 88, 168) + staticParticle('electron', 551, 168);
  if (bias.output === 0) return device + [88, 190, 315, 444, 551].map(x => staticParticle('electron', x, 168)).join('');
  return device + flowPath(path) + stream('electron', path, 5, 4);
}

function mosDiagram(device, bias, model) {
  const preformed = device === 'dmos';
  const conducting = model.region !== 'cutoff';
  const saturated = model.region === 'saturation';
  const thickness = clamp(model.overdrive * 7, 4, 24);
  const endThickness = saturated ? 0 : clamp((model.overdrive - bias.output) * 7, 1, 24);
  const endX = saturated ? 432 : 469;
  const body = '<rect class="p-type" x="52" y="129" width="536" height="114"/>'
    + '<rect class="n-type" x="52" y="129" width="119" height="60"/>'
    + '<rect class="n-type" x="469" y="129" width="119" height="60"/>'
    + '<rect class="oxide" x="171" y="103" width="298" height="26"/>'
    + '<rect class="gate" x="171" y="73" width="298" height="30"/>'
    + lead(109, 61, 129, 'S') + lead(320, 44, 73, 'G') + lead(529, 61, 129, 'D')
    + '<path class="lead" d="M320 243V259"/><circle class="contact" cx="320" cy="259" r="4"/>'
    + label(109, 177, 'N⁺', 'small') + label(529, 177, 'N⁺', 'small')
    + label(320, 122, 'SiO₂ 氧化层', 'small') + label(320, 224, 'P 型体区', 'small')
    + label(320, 291, 'B 体端接 S', 'fine');
  const fixedIons = [210, 259, 310, 361, 413];
  const depletion = preformed && bias.input < 0
    ? '<path class="depletion" d="M172 130H468V157H172Z"/>'
      + fixedIons.map(x => label(x, 153, '+', 'charge')).join('')
    : !preformed && bias.input > 0
      ? '<path class="depletion" d="M172 130H468V153Q360 195 172 161Z"/>'
        + fixedIons.map(x => label(x, 161, '−', 'charge')).join('')
      : '';
  const outline = preformed ? '<rect class="preformed" x="171" y="130" width="298" height="17"/>' : '';
  const channel = conducting ? '<path class="channel" d="M171 130H' + endX + 'V' + (130 + endThickness) + 'L171 ' + (130 + thickness) + 'Z"/>' : '';
  const holes = staticParticle('hole', 228, 212) + staticParticle('hole', 419, 213)
    + (device === 'mos' && bias.input > 0
      ? '<g class="particle hole">' + particleShape('hole') + '<animateMotion path="M343 149 V201" dur="0.9s" fill="freeze"/></g>'
      : staticParticle('hole', 344, 198));
  const path = saturated ? 'M108 142 H405 Q447 140 479 155 H531' : 'M108 141 H531';
  if (!conducting) return body + depletion + outline + holes + staticParticle('electron', 111, 147) + staticParticle('electron', 531, 147);
  if (bias.output === 0) return body + depletion + outline + channel + holes + [110, 188, 254, 322, 395, 459, 530].map(x => staticParticle('electron', x, 140)).join('');
  return body + depletion + outline + channel + holes + flowPath(path) + stream('electron', path, 6, 4);
}

export function renderDiagram(device, bias, model, playing) {
  const details = device === 'bjt' ? bjtDiagram(model) : device === 'jfet' ? jfetDiagram(bias, model) : mosDiagram(device, bias, model);
  const svg = '<svg viewBox="0 0 640 315" role="img" aria-labelledby="device-figure-title">'
    + '<title id="device-figure-title">' + devices[device].name + '剖面示意 · ' + regionLabels[model.region] + '</title>'
    + '<defs><marker id="arrow-electron" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0l10 5-10 5z" fill="#2053a3"/></marker>'
    + '<marker id="arrow-hole" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0l10 5-10 5z" fill="#a14c28"/></marker></defs>'
    + details + '</svg>';
  const panel = document.getElementById('device-figure');
  panel.innerHTML = svg;
  if (!playing) panel.firstElementChild.pauseAnimations?.();
}

function axisScale(peak) {
  const [factor, unit] = peak >= 1e-3 ? [1e3, 'mA'] : peak >= 1e-6 ? [1e6, 'μA'] : [1e9, 'nA'];
  const top = Math.max(peak * factor, 0.1);
  const magnitude = 10 ** Math.floor(Math.log10(top));
  return { factor, unit, max: Math.ceil(top / magnitude) * magnitude };
}

export function renderCurve(device, bias, model, mode) {
  const isOutput = mode === 'output';
  const field = devices[device].fields[isOutput ? 1 : 0];
  const values = Array.from({ length: 81 }, (_, index) => {
    const value = field.min + (field.max - field.min) * (index / 80);
    return { value, current: Math.max(0, solve(device, { ...bias, [field.key]: value }).current) };
  });
  const yScale = axisScale(Math.max(...values.map(point => point.current), model.current));
  const box = { left: 64, right: 503, top: 29, bottom: 212 };
  const x = value => box.left + (value - field.min) / (field.max - field.min) * (box.right - box.left);
  const y = current => box.bottom - (current * yScale.factor / yScale.max) * (box.bottom - box.top);
  const line = values.map((point, index) => (index === 0 ? 'M' : 'L') + x(point.value).toFixed(2) + ' ' + y(point.current).toFixed(2)).join(' ');
  const yTicks = Array.from({ length: 4 }, (_, index) => {
    const value = (index / 3) * yScale.max;
    const py = y(value / yScale.factor);
    return '<path class="gridline" d="M' + box.left + ' ' + py + 'H' + box.right + '"/><text x="53" y="' + (py + 4) + '" text-anchor="end">' + decimal(value, value > 9 ? 1 : 2) + '</text>';
  }).join('');
  const xTicks = Array.from({ length: 5 }, (_, index) => {
    const value = field.min + (index / 4) * (field.max - field.min);
    const px = x(value);
    return '<text x="' + px + '" y="233" text-anchor="middle">' + decimal(value, device === 'bjt' ? 2 : 1) + '</text>';
  }).join('');
  const boundary = device === 'bjt' ? (isOutput ? bias.input : bias.output) : (isOutput ? model.overdrive : bias.parameter);
  const boundaryText = device === 'bjt' ? 'BC 零偏' : isOutput ? '夹断边界' : device === 'jfet' ? 'VGS(off)' : 'VTH';
  const boundaryLine = boundary > field.min && boundary < field.max
    ? '<path class="boundary" d="M' + x(boundary) + ' 29V212"/><text class="chart-boundary" x="' + clamp(x(boundary), 102, 460) + '" y="23" text-anchor="middle">' + boundaryText + '</text>'
    : '';
  const currentAxis = device === 'bjt' ? 'IC' : 'ID';
  const markerX = x(bias[field.key]);
  const markerY = y(Math.max(0, model.current));
  document.getElementById('curve-figure').innerHTML = '<svg viewBox="0 0 532 265" role="img" aria-label="' + currentAxis + ' 随 ' + field.symbol + ' 变化，圆点为当前工作点">'
    + yTicks + xTicks + boundaryLine
    + '<path class="axis" d="M64 29V212H503"/><path class="curve" d="' + line + '"/>'
    + '<circle class="operating-point" cx="' + markerX + '" cy="' + markerY + '" r="6"/>'
    + '<text class="axis-label" x="64" y="15">' + currentAxis + ' / ' + yScale.unit + '</text>'
    + '<text class="axis-label" x="503" y="255" text-anchor="end">' + field.symbol + ' / V</text></svg>';
}
