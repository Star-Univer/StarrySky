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
  /* 首屏仍然显示“廿八宿总表”（这页的招牌内容），
     但要让它对应的页签亮起来。
     以前写的是 'all'，而 'all' 不是任何一个页签的 id ——
     结果首屏没有任何页签高亮，内容却落在总表上，看起来像坏了。 */
  var activeTab = 'man28';

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

  /** 详解展开时挂 has-detail 的容器：
      首页面板是 .chart-body（el.body），独立页是 #chartBody（el.pageBody）。 */
  function detailHost() {
    return el.body || el.pageBody || null;
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
    /* 独立页（古星图.html）没有 .chart-body。
       原来这里直接 el.body.classList 会抛 TypeError，
       表现就是"点星官没反应/点了报错"。现在统一走 detailHost()。 */
    var host = detailHost();
    if (host) host.classList.add('has-detail');
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
    var host = detailHost();
    if (host) host.classList.add('has-detail');
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

    /* 独立页已经用 <script> 预加载过源码，直接用，别再加载一次 300KB。
       首页没有预加载，window.__chartSvg 为空，会走下面的动态加载。 */
    if (window.__chartSvg) {
      injectChart(window.__chartSvg);
      return;
    }

    var src = el.stage.getAttribute('data-src') || 'assets/chart-ink-inline.svg';
    var jsSrc = src.replace(/\.svg$/, '.js');

    loadScript(jsSrc)
      .then(function () {
        var svg = window.__chartSvg;
        if (!svg) throw new Error('脚本已加载但没有拿到 __chartSvg');
        injectChart(svg);
      })
      .catch(function (e1) {
        /* 脚本也拿不到，再试一次 fetch（http(s) 环境下通常能成） */
        if (window.console) console.warn('[星图] 脚本方式失败，改试 fetch：', e1);
        return fetch(src, { cache: 'force-cache' })
          .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
          .then(injectChart);
      })
      .catch(function (e2) {
        if (window.console) console.warn('[星图] 内联失败，改用图片显示：', e2);
        var img = doc.createElement('img');
        img.src = 'assets/chart-ink.svg';
        img.alt = '三垣二十八宿古籍星图';
        img.className = 'chart-fallback-img';
        img.draggable = false;
        el.stage.innerHTML = '';
        el.stage.appendChild(img);
        el.stage.classList.add('is-fallback');

        /* 退化成图片时也保留拖动查看的能力（点星官本来就没有了） */
        bindStageDrag();
        if (el.stage.__skySyncPan) setTimeout(el.stage.__skySyncPan, 0);
      });
  }

  /** 插一个 <script>，加载完 resolve，失败 reject */
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = doc.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('加载失败: ' + src)); };
      doc.head.appendChild(s);
    });
  }

  /** 把 SVG 源码塞进容器，并绑好交互 */
  function injectChart(svgText) {
    el.stage.innerHTML = svgText;
    el.stage.setAttribute('data-inlined', '1');
    el.stage.classList.add('is-ready');
    bindStageClicks();
    bindStageDrag();

    /* 图刚插进来时尺寸还是旧的，等一帧再量：
       这一步会决定要不要显示抓手、要不要把窄屏视野挪到图幅中间。 */
    setTimeout(function () {
      if (el.stage.__skySyncPan) el.stage.__skySyncPan();
    }, 0);
  }

  /** 星图里的元素被点击 → 打开对应详解 */
  function bindStageClicks() {
    if (!el.stage || el.stage.__skyBound) return;
    el.stage.__skyBound = true;

    el.stage.addEventListener('click', function (e) {
      /* 刚刚拖动过星图：紧跟着的那一次 click 只是松手后的“副产物”。
         不拦掉的话，每拖一次都会误触星官、弹出详情。
         只吞一次，不按时间窗一棍子打死 —— 否则拖完马上点星官会点不动。 */
      if (el.stage.__skySuppressClick) {
        el.stage.__skySuppressClick = false;
        e.preventDefault();
        return;
      }

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

  /**
   * 星图拖动平移。
   *
   * 为什么放在这里而不是页面里：
   *   首页的面板形态和独立页共用同一个 #chartStage，
   *   拖动逻辑写一份，两边行为才能一致。面板里的星图原本就装得下，
   *   canPan() 会返回 false，不会抢走页面滚动，也不会改变首页交互。
   *
   * 几个刻意的取舍：
   *   · 用 Pointer Events 而不是分别写 mouse/touch：一套代码同时管鼠标、手指和触控笔。
   *   · 超过 6px 才算拖动：手抖 2~3px 仍然算点击，避免“点星官点不出来”。
   *   · 不做惯性滚动：一是不像翻纸，二是天然满足 prefers-reduced-motion。
   *   · 只有图真的超出容器才加 touch-action:none，否则手机上会被星图“锁”住滚不动页面。
   */
  function bindStageDrag() {
    var stage = el.stage;
    if (!stage || stage.__skyDragBound) return;
    stage.__skyDragBound = true;

    var THRESHOLD = 6;      /* 超过这个位移才判定为拖动 */
    var active = false;
    var moved = false;
    var pointerId = null;
    var startX = 0, startY = 0, startLeft = 0, startTop = 0;

    function canPan() {
      /* 必须先确认它自己就是滚动容器。
         首页面板的 .chart-stage 是 overflow:visible，SVG 只是视觉上超出；
         如果只量 scrollWidth，会误判成“可拖”，然后给面板加上
         touch-action:none，手机反而滚不动页面。 */
      var cs = window.getComputedStyle ? window.getComputedStyle(stage) : null;
      var ox = cs ? cs.overflowX : '';
      var oy = cs ? cs.overflowY : '';
      if (!/(auto|scroll|overlay)/.test(ox + ' ' + oy)) return false;

      return stage.scrollWidth - stage.clientWidth > 1 ||
        stage.scrollHeight - stage.clientHeight > 1;
    }

    /* 图装得下时不要显示“抓手”，也不要切断默认触摸滚动。
       顺便做一次“窄屏横向居中”：手机上的图宽于窗口，
       不居中就会一打开看到纸的左上角。 */
    function syncPanState() {
      var pannable = canPan();
      stage.classList.toggle('is-pannable', pannable);

      if (pannable && !stage.__skyCentered) {
        stage.__skyCentered = true;
        if (stage.scrollWidth - stage.clientWidth > 1) {
          stage.scrollLeft = Math.round((stage.scrollWidth - stage.clientWidth) / 2);
        }
      }
    }

    syncPanState();
    stage.__skySyncPan = syncPanState;
    window.addEventListener('resize', syncPanState);
    if (window.ResizeObserver) {
      try { new ResizeObserver(syncPanState).observe(stage); } catch (e) { }
    }

    stage.addEventListener('pointerdown', function (e) {
      /* 只响应左键；右键留给系统菜单 */
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      /* 已经有手指/鼠标在拖了，第二根手指不要来抢 */
      if (active) return;
      if (!canPan()) return;

      active = true;
      moved = false;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = stage.scrollLeft;
      startTop = stage.scrollTop;

      /* 这里刻意「先不」捕获指针。
         一旦在 pointerdown 就 setPointerCapture，pointerup 的目标会变成
         容器本身，紧随其后的 click 就不再落在星官/星点上 ——
         点星官会失效。等真的拖过 6px，再在 pointermove 里捕获。 */
    });

    stage.addEventListener('pointermove', function (e) {
      if (!active || e.pointerId !== pointerId) return;

      var dx = e.clientX - startX;
      var dy = e.clientY - startY;

      /* 阈值以内先不动：这时用户很可能只是想点星官 */
      if (!moved) {
        if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return;
        moved = true;
        stage.classList.add('is-dragging');

        /* 确认是拖动后再捕获：拖到星图外、甚至拖到页头也能继续平移。
           松手时 lostpointercapture 会兜底收尾。 */
        try { stage.setPointerCapture(e.pointerId); } catch (err) { }
      }

      /* 拖动时压掉浏览器的文本选择/原生滚动，改由我们写 scrollLeft/Top */
      if (e.cancelable) e.preventDefault();
      stage.scrollLeft = startLeft - dx;
      stage.scrollTop = startTop - dy;
    });

    function endDrag(e) {
      if (!active) return;
      if (e && e.pointerId !== pointerId) return;

      active = false;
      stage.classList.remove('is-dragging');
      if (pointerId != null) {
        try {
          if (stage.hasPointerCapture(pointerId)) stage.releasePointerCapture(pointerId);
        } catch (err) { }
      }

      /* 标记“下一次 click 是拖动尾巴，别当成点星官”。
         加一个定时器兜底：如果浏览器没补发 click（pointercancel 等），
         标记也要自己失效，不能把之后真正的点击吃掉。 */
      if (moved) {
        stage.__skySuppressClick = true;
        setTimeout(function () { stage.__skySuppressClick = false; }, 400);
      }
      pointerId = null;
    }

    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    stage.addEventListener('lostpointercapture', endDrag);

    /* 某些浏览器/场景下拿不到指针捕获时，松手可能落在窗口上；
       兜底收尾，避免 is-dragging 一直卡着。 */
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
  }

  /* ---------------------------------------------------- 下部：内容页签 */

  /** 把当前页签滚进可视区：手机上五个页签放不下，默认的总表在最右边，
      不滚过去的话首屏看起来像“一个都没选中”。 */
  function bringTabIntoView(tab) {
    var bar = el.tabbar;
    if (!bar || !tab || typeof tab.offsetLeft !== 'number') return;
    var left = tab.offsetLeft;
    var right = left + tab.offsetWidth;
    if (left < bar.scrollLeft || right > bar.scrollLeft + bar.clientWidth) {
      bar.scrollLeft = Math.max(0, left - (bar.clientWidth - tab.offsetWidth) / 2);
    }
  }

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
        bringTabIntoView(b);
      });
      bar.appendChild(b);
    });
    renderTab();

    /* 等一帧再滚：页签刚插进来时宽度还是 0。
       再补一次 150ms，等字体/滚动条把最终宽度定下来，
       手机上的“廿八宿总表”才不会只露出半截。 */
    var activeBtn = bar.querySelector('.ct-tab.is-active');
    if (activeBtn) {
      setTimeout(function () { bringTabIntoView(activeBtn); }, 0);
      setTimeout(function () { bringTabIntoView(activeBtn); }, 150);
    }
  }

  function renderTab() {
    var p = el.tabpane;
    p.innerHTML = '';
    /* 从长表切到短页时，别把上一页的滚动位置带过去 */
    p.scrollTop = 0;

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
    if (!input || input.__skySearchBound) return;
    input.__skySearchBound = true;

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
    /* 独立页没有遮罩；万一别处调用了 __openSkyChart，也不要抛异常 */
    if (!el.mask) { inlineChart(); return; }

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
    if (!el.mask) { closeDetail(); return; }

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
    var host = detailHost();
    if (host) host.classList.remove('has-detail');
    activeXiu = '';
    markActive();
    highlightChart('', false);
  }

  /* ------------------------------------------------------------------ 初始化 */
  function init() {
    el.mask = doc.getElementById('chartMask');
    el.list = doc.getElementById('chartList');
    el.detail = doc.getElementById('chartDetail');
    el.stage = doc.getElementById('chartStage');
    el.tabbar = doc.getElementById('chartTabs');
    el.tabpane = doc.getElementById('chartTabPane');
    el.search = doc.getElementById('chartSearch');
    el.closeBtn = doc.getElementById('chartClose');

    /* 独立页的“主体”容器。展开详解时给它加 has-detail，
       宽屏下 CSS 会让星图让出面板宽度，图就不会钻到面板底下。
       首页面板的对应容器是 .chart-body，仍走 el.body。 */
    el.pageBody = doc.getElementById('chartBody');

    /* 面板专用的元素（独立页 古星图.html 没有这些，所以都要判空） */
    if (el.mask) {
      el.body = el.mask.querySelector('.chart-body');
      el.mask.addEventListener('click', function (e) {
        if (e.target === el.mask) close();
      });
    }

    var opener = doc.getElementById('chartOpenBtn');
    if (opener) opener.addEventListener('click', open);
    if (el.closeBtn) el.closeBtn.addEventListener('click', close);

    /* 顶部「随意一宿」：独立页的按钮，原来没有任何脚本接管，
       点了没反应。这里从二十八宿里随机挑一个，直接打开详解。 */
    var randomBtn = doc.getElementById('btnRandom');
    if (randomBtn) {
      randomBtn.addEventListener('click', function () {
        var keys = LORE.MAN28.map(function (m) { return m.full; })
          .filter(function (k) { return !!LORE.MANSIONS[k]; });
        if (!keys.length) keys = Object.keys(LORE.MANSIONS);
        if (!keys.length) return;

        show(keys[Math.floor(Math.random() * keys.length)], true);

        /* 窄屏详解在星图下方，随机完不滚过去就等于没反应 */
        if (el.detail && window.matchMedia && window.matchMedia('(max-width: 1100px)').matches) {
          try {
            el.detail.scrollIntoView({
              behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
              block: 'start'
            });
          } catch (e) { }
        }
      });
    }
    var detailClose = doc.getElementById('detailClose');
    if (detailClose) detailClose.addEventListener('click', closeDetail);
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) close();
    });

    /* 关键判断：这一页是不是"独立页"（没有遮罩）。
       独立页要把星图直接画出来 —— 原来这里没有区分，
       而下面的早退（if (!el.mask) return）会让独立页什么都不做，
       于是古星图.html 是空白的。 */
    if (!el.stage) { window.__openSkyChart = open; return; }

    if (el.stage.querySelector('.chart-root')) {
      /* 页面上已经放好了内联 SVG，直接用 */
      el.stage.setAttribute('data-inlined', '1');
      el.stage.classList.add('is-ready');
      bindStageClicks();
      bindStageDrag();
      if (!el.mask) {
        buildSidebarIfNeeded();
        bindSearch();
      }
    } else if (!el.mask) {
      /* 没有遮罩 = 独立页，立刻把左侧目录、页签和星图都建出来 */
      buildSidebarIfNeeded();
      bindSearch();
      inlineChart();
    }

    /* 对外暴露，方便首页标题栏调用 */
    window.__openSkyChart = open;
  }

  /** 独立页用：把左侧目录和下方页签也一起建出来 */
  function buildSidebarIfNeeded() {
    if (built) return;
    built = true;
    buildSidebar();
    buildTabs();
    if (!activeXiu) show('角宿', false);
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
    inline: inlineChart,
    closeDetail: closeDetail
  };
})();
