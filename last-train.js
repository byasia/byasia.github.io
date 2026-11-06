(() => {
  'use strict';

  const scenes = {
    train: {
      place: '末班车',
      time: '23:58',
      title: '车门多开了一次',
      text: [
        '窗外刚下过雨。你记得再过两站就到终点，车却提前慢下来。广播停了半拍，报出一个地图上没有的名字：「无名站」。',
        '对面的座位空着，上面压着一张旧车票。背面有一行手写字：请交给还想回家的人。车门开了，站台只有一盏灯。'
      ],
      choices: [
        { label: '带着车票，下车看看', next: 'platform' },
        { label: '留在车上，问问乘务员', next: 'conductor' }
      ]
    },
    platform: {
      place: '无名站',
      time: '23:59',
      title: '站牌上留着一块空白',
      text: [
        '站台比想象中小。售票窗口的玻璃里有一团暖光，旁边的候车椅上坐着一个人。她反复把一张被雨淋湿的纸折起来，又展开。',
        '车门一直开着。你想起自己曾在一个陌生的车站，等到最后一班车也开过去了。'
      ],
      choices: [
        { label: '去亮着灯的窗口问路', next: 'window' },
        { label: '坐到候车椅上，看看那张纸', next: 'bench' }
      ]
    },
    conductor: {
      place: '车厢连接处',
      time: '23:59',
      title: '乘务员认出了那张票',
      text: [
        '他没有打孔，只用拇指抚平了票角。「这张票有两个用法。写一个想回去的地方，下一站就停在那里。也可以不写，跟车走到天亮。」',
        '他递来一支快没墨的笔。你想起一扇总留着灯的窗，才发觉自己已经很久没回去了。'
      ],
      choices: [
        { label: '写下那个很久没回去的地址', next: 'home' },
        { label: '把票留空，坐到天亮', next: 'dawn' }
      ]
    },
    window: {
      place: '亮灯的窗口',
      time: '00:01',
      title: '售票员问你想去哪里',
      text: [
        '玻璃后的人接过车票，翻过来读了那行字。「我可以给你开回去的门。也可以把这张票挂在窗口，等下一个需要的人来。」',
        '你伸手摸了摸口袋，里面还有一张自己的回程票。'
      ],
      choices: [
        { label: '告诉她一个想回去的地址', next: 'home' },
        { label: '把旧车票留在亮灯的窗口', next: 'station' }
      ]
    },
    bench: {
      place: '站台候车椅',
      time: '00:01',
      title: '她在等一班能回家的车',
      text: [
        '那张纸是手画的地图，雨把终点冲没了。她说自己还记得家门口一棵歪树，可已经说不出站名。',
        '末班车在身后响了一声铃。你看见票背面的字，又看看她手里那片空白。'
      ],
      choices: [
        { label: '把旧车票递给她，陪她找站名', next: 'station' },
        { label: '邀请她一起上车，去看看天亮', next: 'dawn' }
      ]
    },
    home: {
      place: '那扇亮着的窗',
      time: '00:06',
      title: '灯还亮着',
      text: [
        '下一站是一条你以为已经忘记的小路。门廊的灯在雨里亮着，窗台上放着倒扣的杯子。',
        '你在台阶上站了一会儿，终于伸手敲门。屋里传来熟悉的脚步声。'
      ],
      ending: '01'
    },
    station: {
      place: '无名站',
      time: '00:06',
      title: '给无名站留一盏灯',
      text: [
        '雨停的时候，窗口挂起一张新写的牌子：「回家的人，请在这里等。」那张票被放在玻璃后，压住牌子的一角。',
        '你坐回车里。车经过那盏灯时，你看见有人沿着站台跑来。车门又多开了一次。'
      ],
      ending: '02'
    },
    dawn: {
      place: '第一班车',
      time: '05:31',
      title: '给明天留个座位',
      text: [
        '高楼退到身后，窗外慢慢亮起来。车厢里那盏忽明忽暗的灯灭了，玻璃上浮起一层浅金色。',
        '广播报的是一个你从没去过的站。你把包从旁边的座位拿起来，决定在这里开始今天。'
      ],
      fromBench: '坐在对面的她把湿地图翻过来，在背面写下了这一站的名字。',
      ending: '03'
    }
  };

  const endings = Object.entries(scenes).filter(([, scene]) => scene.ending);
  const layout = document.getElementById('train-layout');
  const title = document.getElementById('train-title');
  const choices = document.getElementById('train-choices');
  const tag = document.getElementById('train-ending-tag');
  const replay = document.getElementById('train-replay');
  const back = document.getElementById('train-back');
  const home = document.getElementById('train-home');
  const storageNote = document.getElementById('train-storage-note');
  const seen = new Set();
  let path = ['train'];
  let canSave = true;

  function endingKey(id) {
    return 'asia-last-train-ending-v1-' + id;
  }

  function renderCollection() {
    try {
      endings.forEach(([id]) => {
        if (localStorage.getItem(endingKey(id)) === 'seen') seen.add(id);
      });
    } catch {
      canSave = false;
    }
    document.getElementById('train-collection-count').textContent = '结局收集 ' + seen.size + ' / ' + endings.length;
    document.getElementById('train-endings').replaceChildren(...endings.map(([id, scene]) => {
      const item = document.createElement('li');
      item.textContent = '结局 ' + scene.ending + ' · ' + (seen.has(id) ? scene.title : '尚未走到');
      item.classList.toggle('is-seen', seen.has(id));
      return item;
    }));
    if (!canSave) storageNote.textContent = '结局记录仅保留在本次打开的页面。';
  }

  function renderScene(moveFocus = false) {
    const id = path.at(-1);
    const scene = scenes[id];
    const isEnding = Boolean(scene.ending);
    document.getElementById('train-place').textContent = scene.place;
    document.getElementById('train-clock').textContent = scene.time;
    title.textContent = scene.title;
    const paragraphs = scene.fromBench && path.at(-2) === 'bench' ? [...scene.text, scene.fromBench] : scene.text;
    document.getElementById('train-text').replaceChildren(...paragraphs.map(text => {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      return paragraph;
    }));
    tag.hidden = !isEnding;
    tag.textContent = isEnding ? '结局 ' + scene.ending : '';
    choices.hidden = isEnding;
    choices.replaceChildren(...(scene.choices || []).map(choice => {
      const button = document.createElement('button');
      const arrow = document.createElement('span');
      button.type = 'button';
      button.className = 'train-choice';
      button.textContent = choice.label;
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '→';
      button.append(arrow);
      button.addEventListener('click', () => {
        path.push(choice.next);
        renderScene(true);
      });
      return button;
    }));
    back.hidden = path.length === 1;
    replay.hidden = !isEnding;
    home.hidden = !isEnding;
    document.getElementById('train-route').replaceChildren(...path.map((stop, index) => {
      const item = document.createElement('li');
      item.textContent = scenes[stop].place;
      if (index === path.length - 1) item.setAttribute('aria-current', 'step');
      return item;
    }));
    if (isEnding) {
      seen.add(id);
      try {
        localStorage.setItem(endingKey(id), 'seen');
      } catch {
        canSave = false;
      }
    }
    renderCollection();
    if (moveFocus) title.focus();
  }

  back.addEventListener('click', () => {
    if (path.length <= 1) return;
    path.pop();
    renderScene(true);
  });
  replay.addEventListener('click', () => {
    path = ['train'];
    renderScene(true);
  });
  window.addEventListener('pageshow', renderCollection);
  window.addEventListener('storage', event => {
    if (!event.key || endings.some(([id]) => endingKey(id) === event.key)) renderCollection();
  });

  layout.hidden = false;
  renderScene();
})();
