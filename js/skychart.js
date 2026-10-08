/* =============================================================================
 *  星空 · staruniver  古籍星图面板
 *  ---------------------------------------------------------------------------
 *  点首页左上角那颗灰色小圆点，会展开一整页"古书上画的星空图"：
 *
 *    · 中间  assets/chart-ink.svg —— 三垣二十八宿的摹古抄本星图
 *    · 左边  星官检索 + 分类目录（四象 / 三垣 / 四季 / 别名）
 *    · 右边  点星宿后浮出的详解：古籍原文、寓意、传说、现代天文对照
 *    · 下边  四时观星、分野之说、历代天象大事
 *
 *  数据来自 js/starlore.js（window.OfficialStarLore），
 *  星图本身来自 assets/chart-ink.svg，两边通过 data-mz 属性对应。
 * ========================================================================== */

window.SkyChart = (function () {
  'use strict';

  var doc = document;
  var LORE = window.OfficialStarLore || { MANSIONS: {}, SYSTEMS: [], MAN28: [], SEASONS: [], FENYE: [], OMENS: [], EVENTS: [], ALIAS: {} };

  var el = {};          /* 缓存的 DOM 引用 */
  var built = false;
  var activeXiu = '';
  var activeTab = 'all';

  /* --------------------------------------------------------------- 小工具 */
  function h(tag, cls, html) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  /** 二十八宿顺序表（用于"上一个 / 下一个"导航） */
  function order() {
    return LORE.MAN28.map(function (m) { return m.full; });
  }

  /* ------------------------------------------------- 左侧：星官检索与目录 */
  function buildSidebar() {
    var box = el.list;
    box.innerHTML = '';

    /* 分类：四象 + 三垣 */
    var groups = [
      { id: '东方苍龙', label: '东方苍龙 · 春', mark: '青' },
      { id: '北方玄武', label: '北方玄武 · 夏', mark: '黑' },
      { id: '西方白虎', label: '西方白虎 · 秋', mark: '白' },
      { id: '南方朱雀', label: '南方朱雀 · 冬', mark: '赤' }
    ];
    LORE.SYSTEMS.forEach(function (s) {
      groups.push({ id: s.id === 'ziwei' ? '紫微垣' : s.id === 'taiwei' ? '太微垣' : '天市垣', label: s.name + ' · ' + s.alias, mark: '垣', system: s });
    });

    groups.forEach(function (g) {
      var sec = h('div', 'chart-sec');
      sec.appendChild(h('div', 'chart-sec-head', '<span class="chart-sec-mark">' + g.mark + '</span>' + esc(g.label)));

      var ul = h('ul', 'chart-xiu-list');

      if (g.system) {
        /* 三垣：一条整体记录 */
        var li = h('li');
        var a = h('button', 'chart-xiu', '<b>' + esc(g.system.name) + '</b><i>' + esc(g.system.alias) + '</i>');
        a.type = 'button';
        a.setAttribute('data-xiu', g.system.name);
        a.addEventListener('click', function () { showSystem(g.system); });
        li.appendChild(a);
        ul.appendChild(li);
      } else {
        LORE.MAN28.filter(function (m) { return m.group === g.id; }).forEach(function (m) {
          var li2 = h('li');
          var b = h('button', 'chart-xiu',
            '<b>' + esc(m.full) + '</b><i>' + esc(m.si) + ' · ' + m.stars + '星 ' + m.dushu + '度</i>');
          b.type = 'button';
          b.setAttribute('data-xiu', m.full);
          b.addEventListener('click', function () { show(m.full, true); });
          li2.appendChild(b);
          ul.appendChild(li2);
        });
      }
      sec.appendChild(ul);
      box.appendChild(sec);
    });

    /* 附录星官（河鼓、天津） */
    var extra = h('div', 'chart-sec');
    extra.appendChild(h('div', 'chart-sec-head', '<span class="chart-sec-mark">附</span>常见星官'));
    var eul = h('ul', 'chart-xiu-list');
    ['河鼓·牛郎', '天津·织女'].forEach(function (k) {
      var li3 = h('li');
      var c = h('button', 'chart-xiu', '<b>' + esc(k) + '</b><i>' + esc(LORE.MANSIONS[k] ? LORE.MANSIONS[k].en : '') + '</i>');
      c.type = 'button';
      c.setAttribute('data-xiu', k);
      c.addEventListener('click', function () { show(k, true); });
      li3.appendChild(c);
      eul.appendChild(li3);
    });
    extra.appendChild(eul);
    box.appendChild(extra);
  }

  /* ------------------------------------------------------ 右侧：详解面板 */
  function showSystem(s) {
    activeXiu = s.name;
    markActive();
    el.detail.innerHTML =
      '<div class="ct-detail-head" style="--accent:' + s.color + '">' +
      '<h3>' + esc(s.name) + '</h3>' +
      '<p class="ct-detail-sub">' + esc(s.alias) + ' · 星官 ' + s.offices + ' 座 / ' + s.stars + ' 星</p>' +
      '</div>' +
      '<div class="ct-block"><h4>概说</h4><p>' + esc(s.intro) + '</p></div>' +
      '<div class="ct-block"><h4>所辖天区</h4><p>' + esc(s.range) + '</p></div>' +
      '<div class="ct-block ct-record"><h4>古籍原文</h4><blockquote>「' + esc(s.record) + '」' +
      '<cite>—— ' + esc(s.recordSrc) + '</cite></blockquote></div>' +
      '<div class="ct-block"><h4>寓意与占验</h4><p>' + esc(s.mean) + '</p></div>' +
      '<div class="ct-block"><h4>传说与典故</h4>' + para(s.legend) + '</div>' +
      '<div class="ct-block"><h4>现代天文对照</h4><p>' + esc(s.modern) + '</p></div>' +
      '<div class="ct-block"><h4>此天区的深空天体</h4><ul class="ct-dso">' +
      s.deepsky.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul></div>';

    el.detail.classList.add('show');
    el.body.classList.add('has-detail');
    /* 三垣在整图上的对应分组也提亮 */
    highlightChart(s.name, true);
  }

  function para(text) {
    return String(text || '').split('\n').filter(Boolean)
      .map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
  }

  function show(key, scrollDetail) {
    var d = LORE.MANSIONS[key];
    if (!d) return;
    activeXiu = key;
    markActive();
    highlightChart(key, true);

    var ord = order();
    var idx = ord.indexOf(key);
    var prev = idx > 0 ? ord[idx - 1] : ord[ord.length - 1];
    var next = idx >= 0 && idx < ord.length - 1 ? ord[idx + 1] : ord[0];

    el.detail.innerHTML =
      '<div class="ct-detail-head">' +
      '<h3>' + esc(key) + '<span class="ct-pinyin">' + esc(d.pinyin) + '</span></h3>' +
      '<p class="ct-detail-sub">' + esc(d.group) + ' · ' + esc(d.gl) + ' · ' + esc(d.season) + '季星空</p>' +
      '</div>' +
      '<div class="ct-facts">' +
      fact('西方对照', d.en) +
      fact('星数', d.stars + ' 星') +
      fact('距度', d.dushu) +
      fact('四象', d.group) +
      '</div>' +
      '<div class="ct-block ct-record"><h4>古籍原文</h4><blockquote>「' + esc(d.record) + '」' +
      '<cite>—— ' + esc(d.recordSrc) + '</cite></blockquote></div>' +
      '<div class="ct-block"><h4>寓意与占验</h4><p>' + esc(d.mean) + '</p></div>' +
      '<div class="ct-block"><h4>传说与典故</h4>' + para(d.legend) + '</div>' +
      '<div class="ct-block"><h4>现代天文对照</h4><p>' + esc(d.modern) + '</p></div>' +
      (d.deepsky && d.deepsky.length
        ? '<div class="ct-block"><h4>此天区的深空天体</h4><ul class="ct-dso">' +
        d.deepsky.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>'
        : '') +
      '<div class="ct-nav">' +
      '<button type="button" class="ct-nav-btn" data-nav="' + esc(prev) + '">← ' + esc(prev) + '</button>' +
      '<button type="button" class="ct-nav-btn" data-nav="' + esc(next) + '">' + esc(next) + ' →</button>' +
      '</div>' +
      '<button type="button" class="ct-locate" id="ctLocate" data-locate="' + esc(key) + '">' +
      '<span>在星空首页定位这一宿</span><i>↗</i></button>';

    el.detail.querySelectorAll('[data-nav]').forEach(function (b) {
      b.addEventListener('click', function () { show(b.getAttribute('data-nav'), true); });
    });
    var locBtn = el.detail.querySelector('#ctLocate');
    if (locBtn) locBtn.addEventListener('click', function () { locate(key); });

    el.detail.classList.add('show');
    el.body.classList.add('has-detail');
    if (scrollDetail) el.detail.scrollTop = 0;
  }

  function fact(k, v) {
    return '<div class="ct-fact"><span>' + esc(k) + '</span><b>' + esc(v) + '</b></div>';
  }

  /**
   * 「在星空首页定位这一宿」——星图与首页那片星野的联动入口。
   *
   * 星图是给"查"用的，首页星野是给"看"用的；
   * 两边靠 data-mz 属性一一对应，所以点一下就能互相跳。
   *
   *   · 如果本页就是首页（面板形态）：关掉面板，滚到第一屏，把那组星官点亮
   *   · 如果本页是独立的 古星图.html：带上 #sky-locate=星宿名 跳回 index.html，
   *     由首页在载入时把那一组点亮
   */
  function locate(name) {
    if (!name) return;

    var onHome = !!doc.getElementById('skyField');
    if (onHome) {
      close();
      setTimeout(function () {
        try {
          /* 回到第一屏：星宿在首页的星野里，卷到小工具那一屏就看不见了 */
          var navHome = doc.querySelector('.nav-links a[data-page="home"]');
          if (navHome) navHome.click();
          var homePage = doc.querySelector('.page[data-page="home"]');
          if (homePage) homePage.scrollTo({ top: 0, behavior: 'smooth' });

          if (window.SkyDeck) window.SkyDeck.highlight(name, true);
          setTimeout(function () {
            if (window.SkyDeck) window.SkyDeck.highlight(name, false);
          }, 5200);
        } catch (e) { console.warn('[星图] 首页定位失败：', e); }
      }, 300);
      return;
    }
    location.href = 'index.html#sky-locate=' + encodeURIComponent(name);
  }

  function markActive() {
    el.list.querySelectorAll('.chart-xiu').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-xiu') === activeXiu);
    });
  }

  /** 在星图上把对应星宿整组提亮（连线 + 名字一起） */
  function highlightChart(key, on) {
    if (!el.stage) return;
    el.stage.querySelectorAll('.chart-mz').forEach(function (g) {
      g.classList.toggle('is-lit', !!(on && g.getAttribute('data-mz') === key));
    });
    el.stage.querySelectorAll('.chart-mz-name').forEach(function (t) {
      t.classList.toggle('is-lit', !!(on && t.getAttribute('data-mz') === key));
    });
    el.stage.querySelectorAll('.asterism').forEach(function (g) {
      g.classList.toggle('is-lit', !!(on && g.getAttribute('data-name') === key));
    });
    el.stage.querySelectorAll('.ast-name').forEach(function (t) {
      t.classList.toggle('is-lit', !!(on && t.getAttribute('data-mz') === key));
    });
  }

  /**
   * 把 assets/chart-ink-inline.svg 读进来、内联到页面里。
   * 为什么不用 iframe？因为用 file:// 直接双击打开时，
   * 浏览器会禁止跨文档脚本访问 iframe 内部，点星宿就没反应了。
   * 内联之后没有任何跨源限制，双击本地文件也能完整交互。
   * （SVG 里的 id 已经在生成时统一加了 ck- 前缀，不会和页面冲突。）
   */
  function inlineChart() {
    if (!el.stage || el.stage.getAttribute('data-inlined') === '1') return;
    var src = el.stage.getAttribute('data-src');
    if (!src) { bindStageClicks(); return; }

    fetch(src, { cache: 'force-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (text) {
        el.stage.innerHTML = text;
        el.stage.setAttribute('data-inlined', '1');
        el.stage.classList.add('is-ready');
        bindStageClicks();
      })
      .catch(function (err) {
        /* 读不到就退回 <img> 显示，至少图还在 */
        if (window.console) console.warn('[星图] 内联失败，改用图片显示：', err);
        var img = doc.createElement('img');
        img.src = 'assets/chart-ink.svg';
        img.alt = '三垣二十八宿古籍星图';
        img.className = 'chart-fallback-img';
        el.stage.appendChild(img);
        el.stage.classList.add('is-fallback');
      });
  }

  /** 星图里的元素被点击 → 打开对应详解 */
  function bindStageClicks() {
    if (!el.stage || el.stage.__skyBound) return;
    el.stage.__skyBound = true;

    el.stage.addEventListener('click', function (e) {
      var t = e.target;
      var g = t.closest ? (t.closest('.chart-mz') || t.closest('.asterism')) : null;
      var lab = t.closest ? (t.closest('.chart-mz-name') || t.closest('.ring-label') || t.closest('.ast-name')) : null;
      var name = '';
      if (g) name = g.getAttribute('data-mz') || g.getAttribute('data-name');
      else if (lab) name = lab.getAttribute('data-mz') || lab.textContent.trim();
      if (!name) return;

      if (LORE.MANSIONS[name]) { show(name, true); return; }
      var sys = LORE.SYSTEMS.filter(function (s) { return s.name === name; })[0];
      if (sys) { showSystem(sys); return; }
      /* 首页带过来的定位参数：直接点亮对应星官 */
      if (name) highlightChart(name, true);
    });

    /* 悬浮时同步提亮 */
    el.stage.addEventListener('mouseover', function (e) {
      var g = e.target.closest ? e.target.closest('.chart-mz') : null;
      if (g) highlightChart(g.getAttribute('data-mz'), true);
    });
    el.stage.addEventListener('mouseout', function (e) {
      var g = e.target.closest ? e.target.closest('.chart-mz') : null;
      if (g) highlightChart(g.getAttribute('data-mz'), false);
    });
  }

  /* ---------------------------------------------------- 下部：四个内容页 */
  function buildTabs() {
    var tabs = [
      { id: 'season', label: '四时观星' },
      { id: 'fenye', label: '分野之说' },
      { id: 'omen', label: '星占术语' },
      { id: 'event', label: '历代天象' },
      { id: 'man28', label: '廿八宿总表' }
    ];
    var bar = el.tabbar;
    bar.innerHTML = '';
    tabs.forEach(function (t) {
      var b = h('button', 'ct-tab' + (t.id === activeTab ? ' is-active' : ''), t.label);
      b.type = 'button';
      b.setAttribute('data-tab', t.id);
      b.addEventListener('click', function () {
        activeTab = t.id;
        bar.querySelectorAll('.ct-tab').forEach(function (x) {
          x.classList.toggle('is-active', x.getAttribute('data-tab') === activeTab);
        });
        renderTab();
      });
      bar.appendChild(b);
    });
    renderTab();
  }

  function renderTab() {
    var p = el.tabpane;
    p.innerHTML = '';

    if (activeTab === 'season') {
      LORE.SEASONS.forEach(function (s) {
        var card = h('article', 'ct-season');
        card.innerHTML =
          '<div class="ct-season-badge">' + esc(s.name) + '</div>' +
          '<h3>' + esc(s.title) + '</h3>' +
          '<p class="ct-season-time">' + esc(s.time) + '</p>' +
          '<p>' + esc(s.lead) + '</p>' +
          '<div class="ct-season-cols">' +
          '<div><h4>当令亮星</h4><ul>' + s.stars.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
          '<div><h4>主要星座</h4><ul>' + s.constellations.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
          '<div><h4>可寻深空</h4><ul>' + s.deepsky.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
          '</div>' +
          '<p class="ct-season-tip">' + esc(s.tip) + '</p>';
        p.appendChild(card);
      });
      return;
    }

    if (activeTab === 'fenye') {
      var intro = h('p', 'ct-lead',
        '「分野」是古人把天上的星宿与地上的州国一一对应的办法。' +
        '天有变动，则相应地有吉凶——这是中国星占学最基本的框架。' +
        '下表按《汉书·地理志》《晋书·天文志》的分野体系整理。');
      p.appendChild(intro);
      var table = h('table', 'ct-table');
      table.innerHTML = '<thead><tr><th>星宿</th><th>州国</th><th>今地约当</th></tr></thead><tbody>' +
        LORE.FENYE.map(function (f) {
          return '<tr><td class="ct-td-xiu">' + esc(f.xiu) + '</td><td>' + esc(f.state) + '</td><td>' + esc(f.area) + '</td></tr>';
        }).join('') + '</tbody>';
      p.appendChild(table);
      return;
    }

    if (activeTab === 'omen') {
      var lead2 = h('p', 'ct-lead',
        '古代星占不是"算命"，而是一套完整的政治话语：' +
        '天象被用来劝谏君主、约束权臣、解释灾异。' +
        '下面这些术语在《史记·天官书》《汉书·天文志》《开元占经》里反复出现。');
      p.appendChild(lead2);
      var grid = h('div', 'ct-omen-grid');
      LORE.OMENS.forEach(function (o) {
        var c = h('div', 'ct-omen');
        c.innerHTML = '<h4>' + esc(o.term) + '<span>' + esc(o.read) + '</span></h4>' +
          '<p>' + esc(o.desc) + '</p>' +
          '<cite>' + esc(o.src) + '</cite>';
        grid.appendChild(c);
      });
      p.appendChild(grid);
      return;
    }

    if (activeTab === 'event') {
      var timeline = h('div', 'ct-timeline');
      LORE.EVENTS.forEach(function (e) {
        var row = h('div', 'ct-ev');
        row.innerHTML = '<span class="ct-ev-year">' + esc(e.year) + '</span>' +
          '<div><h4>' + esc(e.title) + '</h4><p>' + esc(e.desc) + '</p></div>';
        timeline.appendChild(row);
      });
      p.appendChild(timeline);
      return;
    }

    /* 廿八宿总表 */
    var table2 = h('table', 'ct-table ct-table-28');
    table2.innerHTML = '<thead><tr><th>宿</th><th>四象</th><th>象形</th><th>季</th><th>星数</th><th>距度</th></tr></thead><tbody>' +
      LORE.MAN28.map(function (m) {
        return '<tr data-xiu="' + esc(m.full) + '" class="ct-row-link">' +
          '<td><b>' + esc(m.full) + '</b></td><td>' + esc(m.group) + '</td><td>' + esc(m.si) + '</td>' +
          '<td>' + esc(m.season) + '</td><td>' + m.stars + '</td><td>' + m.dushu + '</td></tr>';
      }).join('') + '</tbody>';
    p.appendChild(table2);
    table2.querySelectorAll('.ct-row-link').forEach(function (tr) {
      tr.addEventListener('click', function () { show(tr.getAttribute('data-xiu'), true); });
    });
  }

  /* --------------------------------------------------------- 检索与快捷键 */
  function bindSearch() {
    var input = el.search;
    if (!input) return;
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      el.list.querySelectorAll('.chart-xiu').forEach(function (b) {
        var key = b.getAttribute('data-xiu') || '';
        var d = LORE.MANSIONS[key];
        var hay = (key + ' ' + (d ? d.pinyin + ' ' + d.en + ' ' + d.group + ' ' + d.record : '')).toLowerCase();
        var hit = !q || hay.indexOf(q) >= 0;
        b.parentNode.style.display = hit ? '' : 'none';
      });
      el.list.querySelectorAll('.chart-sec').forEach(function (sec) {
        var any = Array.prototype.some.call(sec.querySelectorAll('li'), function (li) {
          return li.style.display !== 'none';
        });
        sec.style.display = any ? '' : 'none';
      });
    });

    /* 拼音 / 别名提示：输入"大火"也能跳到心宿 */
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var q = input.value.trim();
      if (!q) return;
      if (LORE.MANSIONS[q]) { show(q, true); return; }
      var full = LORE.MAN28.filter(function (m) { return m.zh === q || m.full === q; })[0];
      if (full) { show(full.full, true); return; }
      var alias = LORE.ALIAS[q];
      if (alias && LORE.MANSIONS[alias]) { show(alias, true); return; }
      var fuzzy = Object.keys(LORE.MANSIONS).filter(function (k) {
        return k.indexOf(q) >= 0 || (LORE.MANSIONS[k].en || '').toLowerCase().indexOf(q.toLowerCase()) >= 0;
      })[0];
      if (fuzzy) show(fuzzy, true);
    });
  }

  /* ------------------------------------------------------------------ 开关 */
  function open() {
    el.mask.classList.add('show');
    el.mask.setAttribute('aria-hidden', 'false');
    doc.body.classList.add('chart-open');
    if (!built) {
      built = true;
      buildSidebar();
      buildTabs();
      inlineChart();
      bindSearch();
      if (!activeXiu) show('角宿', false);
    } else {
      inlineChart();
    }
    var focusTarget = el.search || el.closeBtn;
    setTimeout(function () { if (focusTarget) focusTarget.focus(); }, 320);
  }

  function close() {
    el.mask.classList.remove('show');
    el.mask.setAttribute('aria-hidden', 'true');
    doc.body.classList.remove('chart-open');
  }

  function isOpen() {
    return el.mask && el.mask.classList.contains('show');
  }

  /** 收起右侧（窄屏时是下方）的详解 */
  function closeDetail() {
    if (el.detail) el.detail.classList.remove('show');
    if (el.body) el.body.classList.remove('has-detail');
    activeXiu = '';
    markActive();
    highlightChart('', false);
  }

  /* ------------------------------------------------------------------ 初始化 */
  function init() {
    el.mask = doc.getElementById('chartMask');
    if (!el.mask) return;
    el.body = el.mask.querySelector('.chart-body');
    el.list = doc.getElementById('chartList');
    el.detail = doc.getElementById('chartDetail');
    el.stage = doc.getElementById('chartStage');
    el.tabbar = doc.getElementById('chartTabs');
    el.tabpane = doc.getElementById('chartTabPane');
    el.search = doc.getElementById('chartSearch');
    el.closeBtn = doc.getElementById('chartClose');

    var opener = doc.getElementById('chartOpenBtn');
    if (opener) opener.addEventListener('click', open);
    if (el.closeBtn) el.closeBtn.addEventListener('click', close);
    var detailClose = doc.getElementById('detailClose');
    if (detailClose) detailClose.addEventListener('click', closeDetail);
    el.mask.addEventListener('click', function (e) {
      if (e.target === el.mask) close();
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) close();
    });

    /* 星图：如果页面上已经放好了内联 SVG 就直接用，否则去读文件 */
    if (el.stage) {
      if (el.stage.querySelector('.chart-root')) {
        el.stage.setAttribute('data-inlined', '1');
        el.stage.classList.add('is-ready');
        bindStageClicks();
      }
    }

    /* 对外暴露，方便首页标题栏调用 */
    window.__openSkyChart = open;
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    open: open,
    close: close,
    isOpen: isOpen,
    show: show,
    showSystem: showSystem,
    highlight: highlightChart,
    locate: locate,
    closeDetail: closeDetail
  };
})();
