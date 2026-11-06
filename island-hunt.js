(() => {
  'use strict';

  const rounds = [
    {
      place: '城市漫游',
      file: 'world-city.webp',
      alt: '城市广场，有水景、步道和远处的高楼。',
      clue: '它一直在广场中央练习下雨，脚下却从来没挪过。找找它。',
      hint: '看广场中间，找一处会让鞋尖变湿的地方。',
      targets: [
        { name: '城市高楼', x: 75, y: 25 },
        { name: '广场喷泉', x: 50, y: 51 },
        { name: '广场长椅', x: 71, y: 59 }
      ],
      answer: 1,
      found: '就是喷泉。它今天的降雨范围依然只有广场中央。'
    },
    {
      place: '林间溪流',
      file: 'world-creek.webp',
      alt: '树木围着溪流，水上有一座桥。',
      clue: '它每天帮人过河，自己却一步都没走。它在哪儿？',
      hint: '沿着水往上游看，找横跨两岸的东西。',
      targets: [
        { name: '林间树木', x: 13, y: 36 },
        { name: '溪水', x: 85, y: 48 },
        { name: '木桥', x: 51, y: 53 }
      ],
      answer: 2,
      found: '找到了木桥。这次过河，鞋袜平安。'
    },
    {
      place: '雪山远行',
      file: 'world-mountain.webp',
      alt: '远处有覆雪的山峰，近处是山坡，天空飘着云。',
      clue: '它把白帽子戴得比周围山头都高。点一下帽子的最高处。',
      hint: '顺着山和天空的交界线找，最高的雪峰就是目标。',
      targets: [
        { name: '雷尼尔雪山山顶', x: 41, y: 33 },
        { name: '山坡', x: 69, y: 73 },
        { name: '天空', x: 79, y: 19 }
      ],
      answer: 0,
      found: '是雷尼尔雪山的山顶。帽子找到了，手套先不用。'
    }
  ];

  const stampKey = 'asia-island-hunt-stamp-v1';
  const board = document.getElementById('hunt-board');
  const finish = document.getElementById('hunt-finish');
  const counter = document.getElementById('hunt-counter');
  const progress = document.getElementById('hunt-progress-track');
  const place = document.getElementById('hunt-place');
  const clue = document.getElementById('hunt-clue');
  const picture = document.getElementById('hunt-picture');
  const image = document.getElementById('hunt-image');
  const targets = document.getElementById('hunt-targets');
  const loading = document.getElementById('hunt-loading');
  const imageError = document.getElementById('hunt-image-error');
  const caption = document.getElementById('hunt-caption');
  const status = document.getElementById('hunt-status');
  const hintToggle = document.getElementById('hunt-hint-toggle');
  const hint = document.getElementById('hunt-hint');
  const next = document.getElementById('hunt-next');
  let roundIndex = 0;
  let found = false;

  function setImageState(state) {
    picture.dataset.state = state;
    loading.hidden = state !== 'loading';
    imageError.hidden = state !== 'error';
    targets.querySelectorAll('button').forEach(button => {
      button.disabled = state !== 'ready' || found;
    });
  }

  function loadPhoto(round) {
    setImageState('loading');
    image.alt = round.alt;
    image.src = './portfolio-media/' + round.file;
    if (image.complete) setImageState(image.naturalWidth ? 'ready' : 'error');
  }

  function renderProgress() {
    counter.textContent = '第 ' + (roundIndex + 1) + ' / ' + rounds.length + ' 关';
    Array.from(progress.children).forEach((marker, index) => {
      marker.classList.toggle('is-found', index < roundIndex || (index === roundIndex && found));
      marker.classList.toggle('is-current', index === roundIndex);
    });
  }

  function chooseTarget(round, index, button) {
    if (found) return;
    if (index !== round.answer) {
      button.dataset.result = 'miss';
      status.dataset.tone = 'try';
      status.textContent = '这里是' + round.targets[index].name + '。再找找看。';
      return;
    }

    found = true;
    button.dataset.result = 'found';
    button.firstElementChild.textContent = '✓';
    button.setAttribute('aria-label', '已找到' + round.targets[index].name);
    status.dataset.tone = 'found';
    status.textContent = round.found;
    next.hidden = false;
    next.focus();
    hintToggle.disabled = true;
    setImageState('ready');
    renderProgress();
  }

  function renderRound(moveFocus = false) {
    const round = rounds[roundIndex];
    found = false;
    renderProgress();
    place.textContent = round.place;
    clue.textContent = round.clue;
    caption.textContent = '《真实世界》实景 · ' + round.place;
    status.dataset.tone = 'neutral';
    status.textContent = '点图里的编号作答。';
    hint.textContent = round.hint;
    hint.hidden = true;
    hintToggle.textContent = '给个提示';
    hintToggle.setAttribute('aria-expanded', 'false');
    hintToggle.disabled = false;
    next.hidden = true;
    next.textContent = roundIndex === rounds.length - 1 ? '领取印章 →' : '下一张实景 →';
    targets.replaceChildren(...round.targets.map((target, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'hunt-target';
      button.style.setProperty('--x', target.x + '%');
      button.style.setProperty('--y', target.y + '%');
      const label = document.createElement('span');
      label.textContent = index + 1;
      label.setAttribute('aria-hidden', 'true');
      button.append(label);
      button.setAttribute('aria-label', (index + 1) + ' 号位置，' + target.name);
      button.addEventListener('click', () => chooseTarget(round, index, button));
      return button;
    }));
    loadPhoto(round);
    if (moveFocus) clue.focus();
  }

  function showFinish() {
    let note = '观察员印章已放进这个浏览器的护照。';
    try {
      localStorage.setItem(stampKey, 'earned');
    } catch {
      note = '你已找到三件物品。当前浏览器无法保存这枚印章。';
    }
    document.getElementById('hunt-result-note').textContent = note;
    board.hidden = true;
    finish.hidden = false;
    document.getElementById('hunt-result-title').focus();
  }

  image.addEventListener('load', () => setImageState('ready'));
  image.addEventListener('error', () => setImageState('error'));
  document.getElementById('hunt-retry').addEventListener('click', () => {
    image.removeAttribute('src');
    loadPhoto(rounds[roundIndex]);
  });
  hintToggle.addEventListener('click', () => {
    hint.hidden = !hint.hidden;
    hintToggle.textContent = hint.hidden ? '给个提示' : '收起提示';
    hintToggle.setAttribute('aria-expanded', String(!hint.hidden));
  });
  next.addEventListener('click', () => {
    if (roundIndex === rounds.length - 1) {
      showFinish();
      return;
    }
    roundIndex += 1;
    renderRound(true);
  });
  document.getElementById('hunt-replay').addEventListener('click', () => {
    roundIndex = 0;
    finish.hidden = true;
    board.hidden = false;
    renderRound(true);
  });

  board.hidden = false;
  renderRound();
})();
