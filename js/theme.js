/* =============================================================================
 *  星空 · staruniver ｜ 全站日夜主题（统一一份，所有页面共用）
 *  ---------------------------------------------------------------------------
 *  解决两个问题：
 *
 *    1. **日夜选择会丢**。原来只有在首页点那个月亮/太阳按钮时才写
 *       localStorage，别的页面加载时完全不读它 —— 所以从子页面返回首页
 *       或者刷新一下，就又变回默认的黑夜了。
 *       现在每个页面在 <head> 里同步读一次，第一帧就是正确的主题，不会闪。
 *
 *    2. **子页面没有日夜样式**。原来子页面各自写死浅色，
 *       切到黑夜也还是白的。现在统一由 html[data-user-color-scheme] 控制。
 *
 *  用法：在 <head> 里**尽早**引入（同步、不要 defer）：
 *      <script src="js/theme.js"></script>
 * ========================================================================== */

(function () {
  'use strict';

  var KEY = 'Fluid_Color_Scheme';
  var ATTR = 'data-user-color-scheme';
  var root = document.documentElement;

  function readSaved() {
    try {
      var v = localStorage.getItem(KEY);
      return (v === 'light' || v === 'dark') ? v : '';
    } catch (e) { return ''; }
  }

  function systemScheme() {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    } catch (e) { }
    return 'dark';
  }

  /* 已经定过就不再覆盖：避免和页面里自己的初始化打架 */
  function apply(force) {
    var cur = root.getAttribute(ATTR);
    if (cur === 'light' || cur === 'dark') {
      if (!force) return cur;
    }
    var v = readSaved() || systemScheme();
    root.setAttribute(ATTR, v);
    root.setAttribute('data-sky', v);
    return v;
  }

  function set(v) {
    v = (v === 'light') ? 'light' : 'dark';
    root.setAttribute(ATTR, v);
    root.setAttribute('data-sky', v);
    try { localStorage.setItem(KEY, v); } catch (e) { }
    /* 让页面里关心主题的脚本能收到通知 */
    try {
      window.dispatchEvent(new CustomEvent('skythemechange', { detail: { scheme: v } }));
    } catch (e) { }
    return v;
  }

  function get() {
    return root.getAttribute(ATTR) || readSaved() || systemScheme();
  }

  function toggle() {
    return set(get() === 'light' ? 'dark' : 'light');
  }

  /* 立刻先应用一次 —— 这一步必须在第一帧之前跑完，才不会闪 */
  apply(true);

  /* 同一台机器上多个标签页时，保持同步 */
  window.addEventListener('storage', function (e) {
    if (e && e.key === KEY) apply(true);
  });

  window.SkyTheme = {
    KEY: KEY,
    get: get,
    set: set,
    toggle: toggle,
    apply: apply
  };
})();
