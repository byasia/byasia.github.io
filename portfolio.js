(() => {
  'use strict';
  const stops = [
    {name:'真实世界',type:'3D 自由探索',description:'从自己的小家出发，去看城市、森林与雪山。',url:'./earth-universe/'},
    {name:'爱背单词',type:'英语学习',description:'把日常的好奇，变成每天一点点的新知。',url:'./aibei/'},
    {name:'答案之书',type:'随机翻一页',description:'带着一个问题来，让下一页给你一点方向。',url:'./answer-book/'},
    {name:'晚风替我记得',type:'加密故事',description:'私藏的故事，输入暗号后再慢慢读。',url:'./wanfeng/'}
  ];
  let selected=0,toastTimer;
  const toast=document.getElementById('portfolio-toast');
  function notify(message){toast.textContent=message;toast.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),3500);}
  function selectStop(index,fromIsland=false){
    if(!Number.isInteger(index)||index<0||index>=stops.length)return;
    selected=index;const stop=stops[index];
    document.querySelectorAll('[data-stop]').forEach(button=>{const active=Number(button.dataset.stop)===index;button.setAttribute('aria-pressed',String(active));button.classList.toggle('selected',active);});
    document.getElementById('destination-type').textContent=`下一站 · ${stop.type}`;
    document.getElementById('destination-name').textContent=stop.name;
    document.getElementById('destination-description').textContent=stop.description;
    const link=document.getElementById('destination-link');link.href=stop.url;link.dataset.visit=String(index);link.setAttribute('aria-label',`进入${stop.name}`);
    if(!fromIsland)document.dispatchEvent(new CustomEvent('island-select',{detail:index}));
  }
  document.querySelectorAll('[data-stop]').forEach(button=>button.addEventListener('click',()=>selectStop(Number(button.dataset.stop))));
  document.addEventListener('island-picked',event=>selectStop(event.detail,true));
  const randomButton=document.getElementById('random-stop');
  const nonsense=[
    ['收到，你成功无视了按钮上的建议。','今日状态：十分叛逆，允许出发。'],
    ['叮！宇宙刚刚连上了 Wi-Fi。','信号满格，脑洞不限流量。'],
    ['已批准 5 分钟合理摸鱼。超时请自行续杯。','摸鱼证已办妥，挑一扇门溜走吧。'],
    ['恭喜！你点到了一个真的会回应的按钮。','按钮很感动，并决定继续上班。'],
    ['本次点击没有拯救世界，但让小岛抖了一下。','今日任务：出发。截止时间：你开心就好。']
  ];
  let nonsenseIndex=0;
  document.getElementById('nonsense-button').addEventListener('click',()=>{const [message,mood]=nonsense[nonsenseIndex++%nonsense.length];notify(message);document.getElementById('curiosity-mood').textContent=mood;const island=document.getElementById('island-viewport');island.classList.remove('chaos-pop');requestAnimationFrame(()=>island.classList.add('chaos-pop'));setTimeout(()=>island.classList.remove('chaos-pop'),500);});
  randomButton.addEventListener('click',()=>{
    randomButton.disabled=true;randomButton.classList.add('is-choosing');
    const target=(selected+1+Math.floor(Math.random()*3))%4;
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){selectStop(target);randomButton.disabled=false;randomButton.classList.remove('is-choosing');notify(`下一站：${stops[target].name}。小岛上的入口已经为你准备好。`);return;}
    let tick=0;const timer=setInterval(()=>{selectStop((selected+1)%4);if(++tick===7){clearInterval(timer);selectStop(target);randomButton.disabled=false;randomButton.classList.remove('is-choosing');notify(`下一站：${stops[target].name}。点“出发”，开始这段旅程。`);}},95);
  });
  const storageKey='asia-curiosity-passport-v1';let visits=[],storageAvailable=true;
  try{const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(saved))visits=[...new Set(saved.filter(value=>Number.isInteger(value)&&value>=0&&value<4))];}catch{storageAvailable=false;}
  function renderPassport(){
    document.querySelectorAll('.stamp').forEach(stamp=>{const visited=visits.includes(Number(stamp.dataset.visit));stamp.classList.toggle('visited',visited);stamp.querySelector('.stamp-state').textContent=visited?'已开启 ✓':'未开启';stamp.setAttribute('aria-label',`${stops[Number(stamp.dataset.visit)].name}，${visited?'已开启':'尚未开启'}`);});
    document.getElementById('passport-progress').textContent=visits.length===4?'四站都已开启。欢迎随时回来！':`已开启 ${visits.length} / 4 站`;
    document.getElementById('reset-passport').hidden=visits.length===0;
    if(!storageAvailable)document.getElementById('passport-note').firstChild.textContent='当前浏览器无法保存护照，印章会保留到本页关闭。';
  }
  document.addEventListener('click',event=>{const link=event.target.closest('a[data-visit]');if(!link||event.defaultPrevented)return;const index=Number(link.dataset.visit);if(!visits.includes(index)){visits.push(index);try{localStorage.setItem(storageKey,JSON.stringify(visits));}catch{storageAvailable=false;}renderPassport();}});
  document.getElementById('reset-passport').addEventListener('click',()=>{visits=[];try{localStorage.removeItem(storageKey);}catch{}renderPassport();notify('护照已翻到新的一页。想先去哪一站？');});
  renderPassport();
  const scenes=[
    {src:'./portfolio-media/world-city.webp',alt:'真实世界游戏实景：广场喷泉与城市天际线'},
    {src:'./portfolio-media/world-creek.webp',alt:'真实世界游戏实景：林间溪流、木桥与河岸'},
    {src:'./portfolio-media/world-mountain.webp',alt:'真实世界游戏实景：雷尼尔雪山与冰川全景'}
  ];
  const sceneImage=document.getElementById('game-scene'),sceneButton=document.getElementById('enlarge-scene');let sceneIndex=0;
  function showScene(index){sceneIndex=index;sceneButton.classList.add('loading');document.getElementById('scene-error').hidden=true;sceneImage.src=scenes[index].src;sceneImage.alt=scenes[index].alt;document.getElementById('scene-counter').textContent=`0${index+1} / 03`;document.querySelectorAll('[data-scene]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.scene)===index)));}
  sceneImage.addEventListener('load',()=>sceneButton.classList.remove('loading'));
  sceneImage.addEventListener('error',()=>{sceneButton.classList.remove('loading');document.getElementById('scene-error').hidden=false;});
  document.querySelectorAll('[data-scene]').forEach(button=>button.addEventListener('click',()=>showScene(Number(button.dataset.scene))));
  document.getElementById('retry-scene').addEventListener('click',()=>{sceneImage.src='';showScene(sceneIndex);});
  const dialog=document.getElementById('scene-dialog');
  sceneButton.addEventListener('click',()=>{const large=document.getElementById('dialog-scene');large.src=scenes[sceneIndex].src;large.alt=scenes[sceneIndex].alt;if(typeof dialog.showModal==='function')dialog.showModal();});
  document.getElementById('close-scene').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog){const bounds=dialog.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)dialog.close();}});
})();
