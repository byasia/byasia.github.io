import { currentText, decimal, devices, regionExplanation, regionLabels, solve } from './models.js';
import { concepts, questions, structures } from './lessons.js';
import { renderCurve, renderDiagram } from './graphics.js';

const byId = id => document.getElementById(id);
const deviceEntries = Object.entries(devices);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const biasByDevice = Object.fromEntries(deviceEntries.map(([id, device]) => [id, { ...device.presets[0] }]));
let deviceId = 'bjt';
let curveMode = 'output';
let conceptId = 'channel';
let playing = !reducedMotion.matches;
let pendingFrame;

function element(tag, text = '', className = '') {
  const result = document.createElement(tag);
  if (text) result.textContent = text;
  if (className) result.className = className;
  return result;
}

function button(text, className, handler) {
  const control = element('button', text, className);
  control.type = 'button';
  control.addEventListener('click', handler);
  return control;
}

function option(value, text) {
  const control = element('option', text);
  control.value = value;
  return control;
}

function setPressed(controls, current) {
  controls.forEach(control => control.setAttribute('aria-pressed', String(control === current)));
}

function renderConcepts() {
  const concept = concepts.find(item => item.id === conceptId);
  const controls = [...byId('concept-tabs').children];
  setPressed(controls, controls.find(control => control.dataset.concept === conceptId));
  byId('concept-title').textContent = concept.title;
  byId('concept-takeaway').textContent = concept.takeaway;
  byId('concept-grid').replaceChildren(...concept.cells.map(([formula, description], index) => {
    const card = element('article', '', 'concept-card');
    card.append(element('p', deviceEntries[index][1].name, 'eyebrow'), element('h4', formula), element('p', description));
    return card;
  }));
}

function renderStructure() {
  const device = devices[deviceId];
  const structure = structures[deviceId];
  byId('device-name').textContent = device.name;
  byId('device-terminals').textContent = device.terminals;
  byId('structure-note-title').textContent = device.type;
  for (const field of ['summary', 'source', 'holes', 'name']) {
    byId('structure-' + field).textContent = structure[field];
  }
  byId('structure-watch').textContent = structure.watch;
}

function renderBiasFields() {
  const { fields, presets } = devices[deviceId];
  byId('bias-fields').replaceChildren(...fields.map(field => {
    const container = element('div', '', 'bias-field');
    const label = element('label', '', 'bias-label');
    const id = 'bias-' + field.key;
    label.htmlFor = id;
    label.append(element('span', field.symbol, 'symbol'), element('span', field.label));
    const value = element('output', '', 'bias-value');
    value.id = 'value-' + field.key;
    value.setAttribute('for', id);
    const slider = element('input');
    slider.id = id;
    slider.type = 'range';
    slider.min = field.min;
    slider.max = field.max;
    slider.step = field.step;
    slider.addEventListener('input', () => {
      biasByDevice[deviceId][field.key] = Number(slider.value);
      updateBiasReadouts();
      cancelAnimationFrame(pendingFrame);
      pendingFrame = requestAnimationFrame(renderWorkingPoint);
    });
    const limits = element('div', '', 'range-limits');
    limits.append(element('span', decimal(field.min, field.digits) + ' ' + field.unit), element('span', decimal(field.max, field.digits) + ' ' + field.unit));
    container.append(label, value, slider, limits);
    return container;
  }));
  byId('presets').replaceChildren(...presets.map(preset => button(preset.name, 'preset', () => {
    biasByDevice[deviceId] = { ...preset };
    syncBiasControls();
    renderWorkingPoint();
  })));
  syncBiasControls();
}

function updateBiasReadouts() {
  const bias = biasByDevice[deviceId];
  const device = devices[deviceId];
  for (const field of device.fields) {
    const display = decimal(bias[field.key], field.digits) + (field.unit ? ' ' + field.unit : '');
    byId('value-' + field.key).textContent = display;
    byId('bias-' + field.key).setAttribute('aria-valuetext', display);
  }
  const controls = [...byId('presets').children];
  const activePreset = device.presets.findIndex(preset => device.fields.every(field => preset[field.key] === bias[field.key]));
  setPressed(controls, controls[activePreset]);
}

function syncBiasControls() {
  for (const field of devices[deviceId].fields) {
    byId('bias-' + field.key).value = biasByDevice[deviceId][field.key];
  }
  updateBiasReadouts();
}

function renderWorkingPoint() {
  const bias = biasByDevice[deviceId];
  const model = solve(deviceId, bias);
  const isBjt = deviceId === 'bjt';
  const region = byId('live-region');
  region.dataset.region = model.region;
  if (region.textContent !== regionLabels[model.region]) region.textContent = regionLabels[model.region];
  const gmText = decimal(model.gm * 1e3, 2) + ' mS';
  const metrics = isBjt
    ? [
      ['IC 集电极电流', currentText(model.current)],
      ['IB 基极电流', currentText(model.ib)],
      ['VBC 基–集电压', decimal(model.vbc, 3) + ' V'],
      ['gm 跨导', gmText],
      ['IC / IB 实际比值', model.region === 'cutoff' || model.betaActual === null ? '—' : decimal(model.betaActual, 1)]
    ]
    : [
      ['ID 漏极电流', currentText(model.current)],
      ['VDS 漏–源电压', decimal(bias.output) + ' V'],
      ['VGD 栅–漏电压', decimal(model.vgd) + ' V'],
      ['gm 跨导', gmText],
      ['U 过驱动电压', decimal(model.overdrive) + ' V']
    ];
  byId('live-metrics').replaceChildren(...metrics.map(([label, value]) => {
    const metric = element('div');
    metric.append(element('dt', label), element('dd', value));
    return metric;
  }));
  byId('region-explanation').textContent = regionExplanation(deviceId, bias, model);
  const field = devices[deviceId].fields[curveMode === 'output' ? 0 : 1];
  byId('curve-caption').textContent = '固定 ' + field.symbol + ' = ' + decimal(bias[field.key], field.digits)
    + ' V。圆点为当前偏置。' + (curveMode === 'transfer' ? '这一点的斜率是 gm。' : '');
  byId('diagram-note').textContent = isBjt
    ? '蓝点表示发射区注入的电子，橙点表示空穴运动。切换「双结正偏」可看到集电区也向基区注入。'
    : '电子净漂移方向是 S → D，常规漏极电流方向相反。' + (deviceId === 'mos' ? '橙点向下的短动画表示加正栅压后空穴重新分布。' : '');
  renderDiagram(deviceId, bias, model, playing);
  renderCurve(deviceId, bias, model, curveMode);
}

function selectDevice(id) {
  deviceId = id;
  const controls = [...document.querySelectorAll('[data-device]')];
  setPressed(controls, controls.find(control => control.dataset.device === id));
  byId('lab-device').value = id;
  renderStructure();
  renderBiasFields();
  renderWorkingPoint();
}

function setAnimation(shouldPlay) {
  playing = shouldPlay;
  const control = byId('animation-toggle');
  control.textContent = playing ? '暂停动画' : '播放动画';
  control.setAttribute('aria-pressed', String(!playing));
  const svg = byId('device-figure').firstElementChild;
  if (playing) svg?.unpauseAnimations?.();
  else svg?.pauseAnimations?.();
}

const storagePrefix = 'asia-transistor-lab-v1:';
const emptyRecord = { attempts: 0, wrong: 0, solved: false, lastCorrect: null };
const recordByQuestion = new Map();
const questionById = new Map(questions.map(question => [question.id, question]));
let storageAvailable = true;

function parseRecord(value) {
  if (!value) return emptyRecord;
  try {
    const record = JSON.parse(value);
    if (record && Number.isSafeInteger(record.attempts) && record.attempts >= 0
      && Number.isSafeInteger(record.wrong) && record.wrong >= 0 && record.wrong <= record.attempts
      && typeof record.solved === 'boolean' && [null, true, false].includes(record.lastCorrect)) return record;
  } catch {
    return emptyRecord;
  }
  return emptyRecord;
}

function loadRecords() {
  try {
    for (const { id } of questions) {
      recordByQuestion.set(id, parseRecord(localStorage.getItem(storagePrefix + id)));
    }
  } catch {
    storageAvailable = false;
  }
}

function getRecord(id) {
  return recordByQuestion.get(id) ?? emptyRecord;
}

function logAnswer(id, correct) {
  let prior = getRecord(id);
  if (storageAvailable) {
    try {
      prior = parseRecord(localStorage.getItem(storagePrefix + id));
    } catch {
      storageAvailable = false;
    }
  }
  const record = {
    attempts: prior.attempts + 1,
    wrong: prior.wrong + Number(!correct),
    solved: prior.solved || correct,
    lastCorrect: correct
  };
  recordByQuestion.set(id, record);
  if (storageAvailable) {
    try {
      localStorage.setItem(storagePrefix + id, JSON.stringify(record));
    } catch {
      storageAvailable = false;
    }
  }
  renderReview();
}

function renderReview() {
  const mastered = questions.filter(question => getRecord(question.id).solved).length;
  const pending = questions.filter(question => getRecord(question.id).lastCorrect === false).length;
  const mistakes = questions.filter(question => getRecord(question.id).wrong > 0);
  byId('hero-count').textContent = mastered;
  byId('hero-progress').value = mastered;
  byId('hero-wrong').textContent = pending + ' 题待复习';
  byId('progress-total').textContent = mastered + ' / ' + questions.length;
  byId('mistakes-total').textContent = mistakes.length + ' 道曾答错 · ' + pending + ' 道待复习';
  byId('retry-mistakes').disabled = pending === 0;
  if (!storageAvailable) byId('storage-note').textContent = '浏览器无法保存数据。本次练习的记录会保留到页面关闭。';
  byId('device-progress').replaceChildren(...deviceEntries.map(([id, device]) => {
    const set = questions.filter(question => question.device === id);
    const count = set.filter(question => getRecord(question.id).solved).length;
    const row = element('div', '', 'progress-row');
    const head = element('div');
    const meter = element('progress');
    head.append(element('strong', device.name), element('span', count + ' / ' + set.length));
    meter.max = set.length;
    meter.value = count;
    meter.setAttribute('aria-label', device.name + '已答对题数');
    row.append(head, meter);
    return row;
  }));
  byId('mistake-list').replaceChildren(...(mistakes.length === 0
    ? [element('p', '这里会列出答错过的题目。做完一次练习再回来看看。', 'empty-note')]
    : mistakes.map(question => {
      const record = getRecord(question.id);
      const row = element('article', '', 'mistake-row');
      const copy = element('div');
      const status = record.lastCorrect ? '已纠正' : '待复习';
      copy.append(element('p', devices[question.device].name + ' · 错 ' + record.wrong + ' 次 · ' + status, 'eyebrow'), element('h4', question.title));
      const retry = button('重做', 'button small-button', () => startQuiz(question.device, question.id, true));
      retry.setAttribute('aria-label', '重做：' + question.title);
      row.append(copy, retry);
      return row;
    })));
}

let queue = [];
let questionIndex = 0;
let submitted = false;
let scope = 'all';

function startQuiz(nextScope, startAt, focus = false) {
  scope = nextScope;
  byId('quiz-scope').value = scope;
  queue = questions.filter(question => scope === 'all' || question.device === scope
    || (scope === 'wrong' && getRecord(question.id).lastCorrect === false));
  const first = startAt ? queue.findIndex(question => question.id === startAt) : -1;
  questionIndex = Math.max(0, first);
  renderQuestion(focus);
}

function renderQuestion(focus) {
  const question = queue[questionIndex];
  submitted = false;
  byId('quiz-body').hidden = !question;
  byId('quiz-empty').hidden = Boolean(question);
  byId('quiz-position').textContent = question ? '第 ' + (questionIndex + 1) + ' / ' + queue.length + ' 题' : '0 题待复习';
  if (!question) return;
  byId('quiz-device').textContent = devices[question.device].name;
  byId('quiz-question').textContent = question.title;
  byId('quiz-feedback').hidden = true;
  byId('quiz-feedback').textContent = '';
  byId('quiz-submit').hidden = false;
  byId('quiz-submit').disabled = true;
  byId('quiz-next').hidden = true;
  byId('quiz-restart').hidden = true;
  byId('option-list').replaceChildren(...question.options.map((text, index) => {
    const label = element('label', '', 'quiz-option');
    const input = element('input');
    input.type = 'radio';
    input.name = 'answer';
    input.value = index;
    input.addEventListener('change', () => {
      byId('quiz-submit').disabled = false;
    });
    label.append(input, element('span', 'ABC'[index], 'option-letter'), element('span', text));
    return label;
  }));
  if (focus) byId('quiz-question').focus();
}

function submitAnswer() {
  const question = queue[questionIndex];
  const picked = byId('option-list').querySelector('input:checked');
  if (submitted || !question || !picked) return;
  submitted = true;
  const correct = Number(picked.value) === question.answer;
  const feedback = byId('quiz-feedback');
  const next = byId('quiz-next');
  const restart = byId('quiz-restart');
  logAnswer(question.id, correct);
  byId('option-list').querySelectorAll('input').forEach((input, index) => {
    input.disabled = true;
    if (index === question.answer) input.parentElement.dataset.result = 'correct';
    else if (input === picked) input.parentElement.dataset.result = 'incorrect';
  });
  feedback.dataset.result = correct ? 'correct' : 'incorrect';
  const heading = correct ? '判断正确' : '已记入错题';
  feedback.replaceChildren(element('strong', heading), element('span', '答案 ' + 'ABC'[question.answer] + '。' + question.reason));
  feedback.hidden = false;
  byId('quiz-submit').hidden = true;
  const more = questionIndex + 1 < queue.length;
  next.hidden = !more;
  restart.hidden = more;
  (more ? next : restart).focus({ preventScroll: true });
}

byId('lab-device').append(...deviceEntries.map(([id, device]) => option(id, device.name)));
document.querySelectorAll('[data-device]').forEach(control => {
  control.addEventListener('click', () => selectDevice(control.dataset.device));
});
byId('lab-device').addEventListener('change', event => selectDevice(event.target.value));
byId('animation-toggle').addEventListener('click', () => setAnimation(!playing));
reducedMotion.addEventListener?.('change', event => setAnimation(!event.matches));
byId('concept-tabs').append(...concepts.map(concept => {
  const control = button(concept.tab, '', () => {
    conceptId = concept.id;
    renderConcepts();
  });
  control.dataset.concept = concept.id;
  return control;
}));
const curveControls = [...document.querySelectorAll('[data-curve]')];
curveControls.forEach(control => control.addEventListener('click', () => {
  curveMode = control.dataset.curve;
  setPressed(curveControls, control);
  renderWorkingPoint();
}));

byId('quiz-scope').append(option('all', '全部器件'), ...deviceEntries.map(([id, device]) => option(id, device.name)), option('wrong', '待复习的错题'));
byId('quiz-scope').addEventListener('change', event => startQuiz(event.target.value));
byId('quiz-submit').addEventListener('click', submitAnswer);
byId('quiz-next').addEventListener('click', () => {
  questionIndex += 1;
  renderQuestion(true);
});
byId('quiz-restart').addEventListener('click', () => startQuiz(scope, null, true));
byId('quiz-all').addEventListener('click', () => startQuiz('all', null, true));
byId('retry-mistakes').addEventListener('click', () => startQuiz('wrong', null, true));
window.addEventListener('storage', event => {
  if (event.key === null) loadRecords();
  else if (event.key.startsWith(storagePrefix)) {
    const id = event.key.slice(storagePrefix.length);
    if (!questionById.has(id)) return;
    recordByQuestion.set(id, parseRecord(event.newValue));
  } else return;
  renderReview();
});

loadRecords();
selectDevice(deviceId);
setAnimation(playing);
renderConcepts();
renderReview();
startQuiz('all', questions.find(question => !getRecord(question.id).solved)?.id);
byId('course').hidden = false;
