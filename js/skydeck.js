/* =============================================================================
 *  星空 · staruniver  星野主控
 *  ---------------------------------------------------------------------------
 *  负责首页那面"会自己向左流动"的星空：
 *
 *    1. 三层视差：远景 / 中景 / 近景用不同的速度滑动，
 *       再叠加全局的向左自动循环动画，所以星空看起来又深又密。
 *    2. 星宿提亮：鼠标悬浮（或触摸）任何一个星宿，
 *       整组星官会亮起、连线变亮、名字浮出。
 *    3. 日夜适配：白天把星野调成"淡蓝晨曦"，
 *       黑夜保持深邃；切换时是渐变过渡，不会出现白色蒙板那种割裂感。
 *    4. 性能：只在可见时动画；用户开了"减少动态效果"就自动静止。
 * ========================================================================== */

window.SkyDeck = (function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;

  /* ------------------------------------------------------------------ 配置 */
  var CFG = {
    /* 三层星野文件。顺序：远 → 近 */
    layers: [
      { file: 'assets/sky-deep.svg', cls: 'sky-layer--deep', speed: 46, dur: 0.30, scale: 1.02 },
      { file: 'assets/sky-mid.svg', cls: 'sky-layer--mid', speed: 78, dur: 0.52, scale: 1.06 },
      { file: 'assets/sky-near.svg', cls: 'sky-layer--near', speed: 118, dur: 0.78, scale: 1.10 }
    ],
    /* 二十八宿的独立图层（内联，可交互）。
       为什么要单独一层：图片里的星官 CSS/JS 都碰不到，
       内联这一层才撑得起 hover 提亮和"从星图跳过来定位"。 */
    mansionLayer: 'assets/mansion-layer.svg',
    /* 自动向左滑动的基准时长（秒）。数值越小转得越快。
       用户反馈"原来转得有点慢"，所以这里默认给得快一些。 */
    flowSeconds: 52,
    /* 星宿名称显示阈值：星野缩放到多大时开始显示星宿名 */
    mouseParallax: 14
  };

  var state = {
    built: false,
    layers: [],
    reduced: false,
    scheme: 'dark',
    /* 指针位置，用于轻微的视差跟随 */
    px: 0.5, py: 0.5,
    rafId: null,
    /* 内联的星宿图层容器，以及当前被点亮的那一宿 */
    mansionBox: null,
    litName: null
  };

  /* 当前流速（倍率），由 setFlow 维护 */
  var flowRate = 1;

  function prefersReduced() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { return false; }
  }

  /* ------------------------------------------------------- 建立三层星野 DOM */
  function build(host) {
    if (!host || state.built) return;
    state.built = true;
    state.reduced = prefersReduced();

    CFG.layers.forEach(function (L, i) {
      /* 每一层要两份一样的图，才能首尾相接、无缝循环 */
      var wrap = doc.createElement('div');
      wrap.className = 'sky-band ' + L.cls;
      wrap.setAttribute('aria-hidden', 'true');

      var track = doc.createElement('div');
      track.className = 'sky-band-track';
      track.style.setProperty('--flow', (CFG.flowSeconds * L.dur) + 's');
      track.style.setProperty('--depth', String(i));

      for (var k = 0; k < 2; k++) {
        var img = doc.createElement('img');
        img.className = 'sky-band-img';
        img.src = L.file;
        img.alt = '';
        img.decoding = 'async';
        img.draggable = false;
        if (k === 1) img.setAttribute('data-clone', '1');
        track.appendChild(img);
      }

      wrap.appendChild(track);
      host.appendChild(wrap);
      state.layers.push({ el: wrap, track: track, cfg: L, loaded: false });

      /* 第一张图 onload 之后标记为已就绪，避免闪烁 */
      var first = track.querySelector('img');
      first.addEventListener('load', function () {
        wrap.classList.add('is-ready');
      });
      first.addEventListener('error', function () {
        /* 资源缺失时给出明确提示，而不是留一片空白 */
        wrap.classList.add('is-missing');
        if (window.console) console.warn('[星空] 星野资源加载失败：' + L.file);
      });
    });

    /* 星宿悬浮提亮 + 点击跳星图：事件委托，一次绑定 */
    host.addEventListener('mouseover', function (e) {
      var g = e.target.closest && e.target.closest('.mansion');
      if (g) {
        host.classList.add('is-hot');
        g.classList.add('is-hover');
      }
    });
    host.addEventListener('mouseout', function (e) {
      var g = e.target.closest && e.target.closest('.mansion');
      if (g) {
        host.classList.remove('is-hot');
        g.classList.remove('is-hover');
      }
    });
    host.addEventListener('click', function (e) {
      var g = e.target.closest && e.target.closest('.mansion');
      if (g) openChartFor(g.getAttribute('data-mz'));
    });

    applyScheme(themeScheme());
    setFlow(currentFlow());
    initMansionsToggle();
    inlineMansions(host);

    if (!state.reduced && root.getAttribute('data-parallax') !== 'off') {
      bindParallax(host);
    }
  }

  /**
   * 把 assets/mansion-layer.svg 读进来，放进**近景那一层的轨道里**。
   *
   * 两个要点：
   *   1. 必须内联。图片里的星官 CSS/JS 都碰不到，
   *      内联之后才有悬浮提亮、"从古籍星图定位这一宿"、
   *      以及设置里那个「二十八宿提亮」开关。
   *   2. 必须和近景图片**共用同一个动画轨道**，而不是自己再动一次。
   *      两套独立动画即使时长相同，长时间跑下来也会有细微相位差，
   *      星官就会和图片里的星点错开。放进同一个轨道，物理上不可能错位。
   */
  function inlineMansions(host) {
    if (!CFG.mansionLayer) return;
    var near = state.layers[state.layers.length - 1];
    if (!near) return;

    /* 加载方式用 <script> 而不是 fetch：
       file:// 下浏览器会拦 fetch，双击本地打开时这一层会是空的。 */
    var jsSrc = CFG.mansionLayer.replace(/\.svg$/, '.js');
    var s = doc.createElement('script');
    s.src = jsSrc;
    s.async = true;
    s.onload = function () {
      var text = window.__mansionSvg;
      if (!text) {
        if (window.console) console.warn('[星空] 星宿图层脚本已加载但没有内容');
        return;
      }
      mountMansions(near, text);
    };
    s.onerror = function () {
      if (window.console) console.warn('[星空] 星宿图层加载失败（不影响其它功能）：' + jsSrc);
    };
    doc.head.appendChild(s);
  }

  /** 真正把星宿图层挂进近景轨道 */
  function mountMansions(near, text) {
    var box = doc.createElement('div');
    box.className = 'mansion-bound';
    box.setAttribute('aria-hidden', 'true');
    box.innerHTML = text;
    near.track.appendChild(box);
    state.mansionBox = box;
    markLit(state.litName);

    /* 图层本身不拦截指针，只有星官可点，
       这样不会挡住首页的箭头、文字和小工具 */
    var svg = box.querySelector('svg');
    if (svg) svg.style.pointerEvents = 'none';
    box.querySelectorAll('.mansion').forEach(function (g) {
      g.style.pointerEvents = 'auto';
      g.style.cursor = 'pointer';
    });
  }

  /** 把某一组星官点亮 / 熄灭；name 为空表示全部 */
  function markLit(name) {
    var scope = state.mansionBox || doc;
    scope.querySelectorAll('.mansion').forEach(function (g) {
      g.classList.toggle('is-lit', !!name && g.getAttribute('data-mz') === name);
    });
  }

  /* ------------------------------------------------- 单个星宿提亮 / 全部星宿 */
  function highlight(name, on) {
    var scope = state.mansionBox || doc;
    if (!name) {
      scope.querySelectorAll('.mansion').forEach(function (g) {
        g.classList.toggle('is-lit', !!on);
      });
      state.litName = on ? '' : null;
      return;
    }
    state.litName = on ? name : null;
    markLit(state.litName);
  }

  /** 切换星宿整体亮度（设置面板里的「二十八宿提亮」） */
  function setMansionsVisible(on) {
    root.setAttribute('data-mansions', on ? 'on' : 'off');
    try { localStorage.setItem('sky_mansions', on ? '1' : '0'); } catch (e) { }
  }

  function initMansionsToggle() {
    var saved = null;
    try { saved = localStorage.getItem('sky_mansions'); } catch (e) { }
    setMansionsVisible(saved !== '0');
  }

  /** 点星野上的星官 → 打开古籍星图并定位到那一宿 */
  function openChartFor(name) {
    if (!name) return;
    if (window.SkyChart && window.SkyChart.open) {
      window.SkyChart.open();
      setTimeout(function () {
        if (window.SkyChart.show) window.SkyChart.show(name, true);
      }, 120);
    }
  }

  /* ------------------------------------------------------- 日夜 / 深浅适配 */
  function themeScheme() {
    var a = root.getAttribute('data-user-color-scheme');
    if (a === 'light' || a === 'dark') return a;
    var d = root.getAttribute('data-default-color-scheme');
    return d === 'light' ? 'light' : 'dark';
  }

  /**
   * 关键：首页的星空不因为日夜切换而"变成白底"。
   * 白天不是刷白蒙板，而是把同一片星空整体调成
   * 「黎明前后的淡青蓝」——星云仍在，银河仍在，只是颜色更清透。
   */
  function applyScheme(scheme) {
    state.scheme = scheme === 'light' ? 'light' : 'dark';
    root.setAttribute('data-sky', state.scheme);
  }

  function watchScheme() {
    /* 监听 html 上日夜属性的变化：切换按钮改的就是它 */
    try {
      var mo = new MutationObserver(function () {
        applyScheme(themeScheme());
      });
      mo.observe(root, { attributes: true, attributeFilter: ['data-user-color-scheme'] });
    } catch (e) {
      /* 老浏览器退化为轮询 */
      var last = themeScheme();
      setInterval(function () {
        var cur = themeScheme();
        if (cur !== last) { last = cur; applyScheme(cur); }
      }, 600);
    }
  }

  /* ------------------------------------------------------------ 指针视差 */
  function bindParallax(host) {
    var ticking = false;
    function apply() {
      ticking = false;
      if (state.layers.length === 0) return;
      var dx = (state.px - 0.5) * 2;   /* -1 ~ 1 */
      var dy = (state.py - 0.5) * 2;
      state.layers.forEach(function (L, i) {
        var k = (i + 1) * CFG.mouseParallax * 0.34;
        L.el.style.setProperty('--mx', (-dx * k).toFixed(2) + 'px');
        L.el.style.setProperty('--my', (-dy * k * 0.55).toFixed(2) + 'px');
      });
    }
    function onMove(e) {
      var t = e.touches && e.touches[0] ? e.touches[0] : e;
      if (typeof t.clientX !== 'number') return;
      state.px = t.clientX / Math.max(1, window.innerWidth);
      state.py = t.clientY / Math.max(1, window.innerHeight);
      if (!ticking) { ticking = true; requestAnimationFrame(apply); }
    }
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
  }

  /** 切换星野流动速度（0.4 慢 ~ 2.4 快）
   *  同时刷新每一层的动画时长与 --depth，保证三层一起变速、比例不变。 */
  function setFlow(rate) {
    var r = Math.max(0.35, Math.min(2.6, Number(rate) || 1));
    CFG.layers.forEach(function (L, i) {
      var el = state.layers[i];
      if (!el) return;
      el.track.style.setProperty('--flow', (CFG.flowSeconds * L.dur / r) + 's');
      el.track.style.setProperty('--depth', String(i));
      el.el.style.setProperty('--scale', String(L.scale));
    });
    /* 星宿图层放在近景轨道的内部，跟着轨道一起流动，
       所以不需要单独给它设动画时长 —— 物理上不可能错位。 */
    flowRate = r;
    try { localStorage.setItem('sky_flow', String(r)); } catch (e) { }
    return r;
  }

  function currentFlow() {
    try {
      var v = Number(localStorage.getItem('sky_flow'));
      return v > 0 ? v : 1;
    } catch (e) { return 1; }
  }

  /* ------------------------------------------------------------------ 初始化 */
  function init() {
    var host = doc.getElementById('skyField');
    if (host) {
      build(host);
      watchScheme();
    }
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ------------------------------------------------------------------ 对外 */
  return {
    setFlow: setFlow,
    currentFlow: currentFlow,
    setMansionsVisible: setMansionsVisible,
    highlight: highlight,
    applyScheme: applyScheme,
    openChartFor: openChartFor,
    cfg: CFG
  };
})();
