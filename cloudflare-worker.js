/**
 * 星空 · 自建转发器（Cloudflare Worker）
 * ---------------------------------------------------------------------------
 * 为什么需要它：
 *   你的站点是纯静态页，直接用浏览器去抓 RSS / 翻译接口会被两件事拦住：
 *     1. CORS（对方服务器不允许网页跨域读）
 *     2. 那些免费公共代理（rss2json / allorigins / corsproxy）随时挂掉
 *        你控制台里那一堆 500 / 403 / 408 就是它们挂了
 *   这个 Worker 放在 Cloudflare 上，由它去抓，再带回 CORS 头，
 *   于是"中文航天源 + 翻译"就都能用了。
 *
 * 部署（不需要装任何东西）：
 *   1. 打开 https://dash.cloudflare.com → Workers & Pages → Create → Worker
 *   2. 把本文件内容整段粘贴进去，Deploy
 *   3. 记下地址，形如 https://xxx.yyy.workers.dev
 *   4. 把这个地址填到 news.html 里的 SELF_PROXY 常量（见文件中的注释）
 *
 * 用法：
 *   …/proxy?url=<要抓的地址>          → 原样转发（抓 RSS）
 *   …/tr?q=<要翻译的英文>&to=zh-CN    → 翻译（走 Google 免费端点）
 */

const ALLOW_HOSTS = [
  'www.dogstar.net',
  'interesting-sky.china-vo.org',
  'www.spacechina.com',
  'www.cnsa.gov.cn',
  'www.cmse.gov.cn',
  'www.clep.org.cn',
  'www.spaceflightnewsapi.net',
  'api.spaceflightnewsapi.net',
  'phys.org',
  'www.universetoday.com',
  'skyandtelescope.org'
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': '*'
};

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    // ---------------- 翻译 ----------------
    if (url.pathname === '/tr') {
      const q = url.searchParams.get('q') || '';
      if (!q) return json({ error: 'empty' }, 400);
      const target = url.searchParams.get('to') || 'zh-CN';
      const api = 'https://translate.googleapis.com/translate_a/single'
        + '?client=gtx&sl=en&tl=' + encodeURIComponent(target)
        + '&dt=t&q=' + encodeURIComponent(q.slice(0, 1500));
      try {
        const r = await fetch(api, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const data = await r.json();
        // 返回结构：[[["译文","原文",...],...],...]
        let out = '';
        if (Array.isArray(data) && Array.isArray(data[0])) {
          data[0].forEach(seg => { if (seg && seg[0]) out += seg[0]; });
        }
        return json({ text: out }, 200);
      } catch (e) {
        return json({ error: String(e) }, 502);
      }
    }

    // ---------------- 转发 RSS ----------------
    if (url.pathname === '/proxy' || url.pathname === '/') {
      const target = url.searchParams.get('url');
      if (!target) return json({ error: 'missing url' }, 400);
      let host;
      try { host = new URL(target).host; } catch (e) { return json({ error: 'bad url' }, 400); }
      if (!ALLOW_HOSTS.some(h => host === h || host.endsWith('.' + h))) {
        return json({ error: 'host not allowed: ' + host }, 403);
      }
      try {
        const r = await fetch(target, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; StaruniverBot/1.0)',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*'
          },
          cf: { cacheTtl: 600 }
        });
        const body = await r.text();
        return new Response(body, {
          status: 200,
          headers: {
            ...CORS,
            'Content-Type': r.headers.get('content-type') || 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=600'
          }
        });
      } catch (e) {
        return json({ error: String(e) }, 502);
      }
    }

    return json({ ok: true, hint: 'use /proxy?url=... or /tr?q=...' }, 200);
  }
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' }
  });
}
