(() => {
  const controls = document.getElementById('route-controls');
  const filters = [...controls.querySelectorAll('[data-route]')];
  const groups = [...document.querySelectorAll('[data-route-group]')];
  const cards = [...document.querySelectorAll('.route-card')];
  const count = document.getElementById('route-count');
  const drawButton = document.getElementById('route-draw');
  const drawName = document.getElementById('draw-name');
  const drawLink = document.getElementById('draw-link');
  let route = 'all';
  let drawn = null;

  function visibleCards() {
    return cards.filter(card => !card.closest('[data-route-group]').hidden);
  }

  function selectRoute(nextRoute) {
    if (route === nextRoute) return;
    route = nextRoute;
    for (const group of groups) {
      group.hidden = route !== 'all' && group.dataset.routeGroup !== route;
    }
    for (const filter of filters) {
      filter.setAttribute('aria-pressed', String(filter.dataset.route === route));
    }
    count.textContent = '这条路线有 ' + visibleCards().length + ' 扇门';
    if (route === 'all') count.textContent = '共 ' + cards.length + ' 扇门';
    drawn?.classList.remove('is-drawn');
    drawn = null;
    drawName.textContent = '';
    drawLink.hidden = true;
  }

  function drawDoor() {
    const available = visibleCards();
    const choices = available.length > 1 ? available.filter(card => card !== drawn) : available;
    drawn?.classList.remove('is-drawn');
    drawn = choices[Math.floor(Math.random() * choices.length)];
    drawn.classList.add('is-drawn');
    const name = drawn.querySelector('strong').firstChild.textContent.trim();
    drawLink.href = drawn.href;
    drawLink.setAttribute('aria-label', '进入' + name);
    if (drawn.hasAttribute('data-visit')) {
      drawLink.dataset.visit = drawn.dataset.visit;
    } else {
      delete drawLink.dataset.visit;
    }
    drawName.textContent = '抽到了「' + name + '」';
    drawLink.hidden = false;
  }

  for (const filter of filters) {
    filter.addEventListener('click', () => selectRoute(filter.dataset.route));
  }
  drawButton.addEventListener('click', drawDoor);
  window.addEventListener('hashchange', () => {
    const target = document.getElementById(location.hash.slice(1));
    const group = target?.closest('[data-route-group]');
    if (group?.hidden) {
      selectRoute(group.dataset.routeGroup);
      requestAnimationFrame(() => target.scrollIntoView());
    }
  });
  controls.hidden = false;
})();
