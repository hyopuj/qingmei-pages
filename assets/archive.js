(() => {
  'use strict';

  const treeId = document.body.dataset.treeId;
  const $ = (id) => document.getElementById(id);
  const stageGlyphs = { 幼苗期: '芽', 开花期: '花', 膨果期: '果', 成熟期: '熟' };
  const qrAssets = { QM001: 'assets/qr-frame-QM001.jpg', QM002: 'assets/qr-frame-QM002.jpg' };
  const publicPages = { QM001: 'https://hyopuj.github.io/qingmei-pages/QM001.html', QM002: 'https://hyopuj.github.io/qingmei-pages/QM002.html' };

  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));

  const formatDate = (value, includeTime = false) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('zh-CN', includeTime
      ? { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }
      : { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  };

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
  }

  function renderTimeline(stages, currentStage) {
    const currentIndex = Math.max(0, stages.findIndex((stage) => stage.name === currentStage));
    $('timeline').innerHTML = stages.map((stage, index) => {
      const state = index < currentIndex ? 'complete' : (index === currentIndex ? 'current' : 'future');
      return `<li class="${state}"><span>${escapeHtml(stageGlyphs[stage.name] || String(index + 1))}</span><div><small>${escapeHtml(stage.date)}</small><strong>${escapeHtml(stage.name)}</strong></div></li>`;
    }).join('');
  }

  function renderStages(stages) {
    $('stageGrid').innerHTML = stages.map((stage, index) => {
      const image = stage.hasImage
        ? `<button class="stage-image" type="button" data-image="${escapeHtml(stage.imageUrl)}" data-caption="${escapeHtml(`${treeId} · ${stage.name}`)}"><img src="${escapeHtml(stage.imageUrl)}" alt="${escapeHtml(`${treeId} ${stage.name}生长影像`)}" loading="lazy"><span>查看大图 ↗</span></button>`
        : `<div class="stage-image stage-placeholder"><span>${escapeHtml(stageGlyphs[stage.name] || '档')}</span><p>影像待下发</p></div>`;
      return `<article class="stage-card reveal" style="--delay:${index * 80}ms">
        ${image}
        <div class="stage-body">
          <div class="stage-kicker"><span>0${index + 1}</span><i></i><b class="${stage.hasImage ? 'released' : 'draft'}">${stage.hasImage ? '已下发' : '待发布'}</b></div>
          <h3>${escapeHtml(stage.name)}<small>${escapeHtml(stage.summary)}</small></h3>
          <p>${escapeHtml(stage.description)}</p>
          <footer><span>记录日期</span><time>${escapeHtml(formatDate(stage.date))}</time></footer>
        </div>
      </article>`;
    }).join('');

    document.querySelectorAll('[data-image]').forEach((button) => {
      button.addEventListener('click', () => openLightbox(button.dataset.image, button.dataset.caption));
    });

    requestAnimationFrame(() => document.querySelectorAll('.reveal').forEach((card) => card.classList.add('visible')));
  }

  function openLightbox(src, caption) {
    $('lightboxImage').src = src;
    $('lightboxCaption').textContent = caption;
    $('lightbox').showModal();
  }

  function hydrate(tree, updatedAt) {
    const published = tree.stages.filter((stage) => stage.hasImage).length;
    const completeness = Math.round((published / tree.stages.length) * 100);
    setText('treeSeal', tree.id);
    setText('identityId', tree.id);
    setText('species', tree.species);
    setText('location', tree.location);
    setText('age', tree.age);
    setText('soil', tree.soil);
    setText('coordinates', tree.coordinates);
    setText('certification', tree.certification);
    const qrImage = $('qrImage');
    const qrLink = $('qrLink');
    if (qrImage) {
      qrImage.src = qrAssets[tree.id] || qrImage.src;
      qrImage.alt = `${tree.id} 一对一溯源二维码贴图`;
    }
    if (qrLink) {
      qrLink.href = publicPages[tree.id] || qrLink.href;
      qrLink.setAttribute('aria-label', `打开 ${tree.id} GitHub Pages 公开档案`);
    }
    setText('qrTitle', `${tree.id} 专属二维码`);
    setText('qrCode', tree.id);
    setText('stageCount', tree.stages.length);
    setText('publishedCount', published);
    setText('completeness', `${completeness}%`);
    setText('currentStage', `${tree.currentStage} · 持续归档`);
    setText('traceId', tree.traceId);
    setText('lastSync', formatDate(updatedAt, true));
    renderTimeline(tree.stages, tree.currentStage);
    renderStages(tree.stages);
  }

  async function loadArchive(showError = true) {
    if (window.__ARCHIVE__) {
      hydrate(window.__ARCHIVE__, window.__ARCHIVE_UPDATED_AT__ || window.__ARCHIVE__.updatedAt);
      $('errorBanner').hidden = true;
      return;
    }
    try {
      const response = await fetch(`/api/trees/${encodeURIComponent(treeId)}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message || '档案读取失败');
      hydrate(payload.data, payload.updatedAt);
      $('errorBanner').hidden = true;
    } catch (error) {
      if (showError) {
        $('errorBanner').textContent = `档案暂时无法加载：${error.message}`;
        $('errorBanner').hidden = false;
      }
    }
  }

  function updateClock() {
    setText('clock', new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Shanghai' }).format(new Date()));
  }

  document.querySelector('[data-scroll]')?.addEventListener('click', (event) => {
    document.getElementById(event.currentTarget.dataset.scroll)?.scrollIntoView({ behavior: 'smooth' });
  });
  $('closeLightbox')?.addEventListener('click', () => $('lightbox').close());
  $('lightbox')?.addEventListener('click', (event) => { if (event.target === $('lightbox')) $('lightbox').close(); });
  updateClock();
  setInterval(updateClock, 1000);
  loadArchive();
  if (!window.__ARCHIVE__) setInterval(() => loadArchive(false), 30000);
})();
