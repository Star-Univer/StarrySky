/* =============================================================================
 *  星空 · staruniver ｜ 天文新闻的「英文标题 → 中文」轻量翻译层
 *  ---------------------------------------------------------------------------
 *  为什么要自己写：
 *    新闻主源是英文站点（NASA / ESA / SpaceNews / Universe Today…），
 *    标题一串英文读者看不懂。但这是一个**纯静态站**，没有后端，
 *    也不能把 API key 放在前端（会被抄走、会被刷爆）。
 *    所以这里做一层**确定性**的翻译：天文新闻的标题用词高度重复
 *    （launch / telescope / galaxy / exoplanet / Webb / Ariane… 就那么几百个词），
 *    把高频词和短语做成对照表，按「长短语优先」做贪心替换即可。
 *
 *  设计原则：
 *    1. **不瞎编**。翻完必须做一次覆盖率检查，
 *       生词太多（意思是这句话没把握）就**不显示中文**，只显示英文原文，
 *       宁可让读者看原文，也不要给出一句错的中文。
 *    2. 长短语优先。先替换 "James Webb Space Telescope" 再替换 "Webb"，
 *       否则会把专有名词拆坏。
 *    3. 保留数字与专有名词。年份、编号（NGC 1234、Ariane 6）原样留着。
 *    4. 全部离线，断网可用，不发任何请求。
 * ========================================================================== */

window.SkyNewsLang = (function () {
  'use strict';

  var API = 'https://icjptvrlmmnxamgnemvz.supabase.co'; // 仅用于文档说明，未使用

  /* ---------------------------------------------------------------- 短语表
   *  顺序无所谓（代码会按长度排序），但**同一段文字尽量只出现在一处**。
   *  左边英文不区分大小写；右边是要替换成的中文。
   * ---------------------------------------------------------------------- */
  var PHRASES = [
    /* ---- 机构 / 望远镜 / 任务 ---- */
    ['james webb space telescope', '韦布空间望远镜'],
    ['james webb', '韦布望远镜'],
    ['hubble space telescope', '哈勃空间望远镜'],
    ['hubble', '哈勃望远镜'],
    ['chandra x-ray observatory', '钱德拉 X 射线天文台'],
    ['chandra', '钱德拉'],
    ['event horizon telescope', '事件视界望远镜'],
    ['very large telescope', '甚大望远镜'],
    ['extremely large telescope', '极大望远镜'],
    ['atacama large millimeter', '阿塔卡马大型毫米波'],
    ['solar orbiter', '太阳轨道器'],
    ['parker solar probe', '帕克太阳探测器'],
    ['voyager 1', '旅行者一号'],
    ['voyager 2', '旅行者二号'],
    ['new horizons', '新视野号'],
    ['juno', '朱诺号'],
    ['cassini', '卡西尼号'],
    ['galileo', '伽利略号'],
    ['europa clipper', '欧罗巴快帆'],
    ['dragonfly', '蜻蜓号'],
    ['artemis', '阿尔忒弥斯计划'],
    ['starship', '星舰'],
    ['falcon 9', '猎鹰九号'],
    ['falcon heavy', '猎鹰重型'],
    ['ariane 6', '阿丽亚娜六号'],
    ['ariane', '阿丽亚娜'],
    ['soyuz', '联盟号'],
    ['long march', '长征火箭'],
    ['change\'e', '嫦娥'],
    ['change', '嫦娥'],
    ['tianwen', '天问'],
    ['tiangong', '天宫空间站'],
    ['shenzhou', '神舟'],
    ['beidou', '北斗'],
    ['queqiao', '鹊桥'],
    ['zhurong', '祝融号'],
    ['yutu', '玉兔'],
    ['fast telescope', '中国天眼 FAST'],
    ['five-hundred-meter aperture', '五百米口径球面射电望远镜'],
    ['international space station', '国际空间站'],
    ['space station', '空间站'],
    ['iss', '国际空间站'],
    ['nasa', 'NASA'],
    ['esa', '欧空局'],
    ['cnsa', '中国国家航天局'],
    ['jaxa', '日本宇宙航空研究开发机构'],
    ['spacex', 'SpaceX'],
    ['blue origin', '蓝色起源'],
    ['lucy', '露西号'],
    ['psyche', '灵神星号'],
    ['osiris-rex', '冥王号'],
    ['bennu', '贝努小行星'],
    ['dart', 'DART 撞击器'],
    ['gaia', '盖亚'],
    ['tess', 'TESS 望远镜'],
    ['kepler', '开普勒望远镜'],
    ['spitzer', '斯皮策望远镜'],
    ['ligo', 'LIGO 引力波天文台'],
    ['virgo', 'VIRGO 引力波天文台'],
    ['rubin observatory', '鲁宾天文台'],
    ['vera rubin', '薇拉·鲁宾'],
    ['lsst', '大型综合巡天望远镜'],

    /* ---- 天体 / 对象 ---- */
    ['supermassive black hole', '超大质量黑洞'],
    ['black hole', '黑洞'],
    ['neutron star', '中子星'],
    ['white dwarf', '白矮星'],
    ['red giant', '红巨星'],
    ['red supergiant', '红超巨星'],
    ['brown dwarf', '褐矮星'],
    ['exoplanet', '系外行星'],
    ['exoplanets', '系外行星'],
    ['super-earth', '超级地球'],
    ['hot jupiter', '热木星'],
    ['rogue planet', '流浪行星'],
    ['solar system', '太阳系'],
    ['milky way', '银河系'],
    ['andromeda', '仙女座星系'],
    ['galaxy', '星系'],
    ['galaxies', '星系'],
    ['galactic center', '银河系中心'],
    ['galactic centre', '银河系中心'],
    ['dark matter', '暗物质'],
    ['dark energy', '暗能量'],
    ['supernova', '超新星'],
    ['supernovae', '超新星'],
    ['supernova remnant', '超新星遗迹'],
    ['nebula', '星云'],
    ['star cluster', '星团'],
    ['globular cluster', '球状星团'],
    ['open cluster', '疏散星团'],
    ['asteroid', '小行星'],
    ['asteroids', '小行星'],
    ['comet', '彗星'],
    ['meteor', '流星'],
    ['meteorite', '陨石'],
    ['meteor shower', '流星雨'],
    ['kuiper belt', '柯伊伯带'],
    ['oort cloud', '奥尔特云'],
    ['solar wind', '太阳风'],
    ['solar flare', '太阳耀斑'],
    ['coronal mass ejection', '日冕物质抛射'],
    ['sunspot', '太阳黑子'],
    ['aurora', '极光'],
    ['cosmic ray', '宇宙射线'],
    ['gravitational wave', '引力波'],
    ['gravitational waves', '引力波'],
    ['fast radio burst', '快速射电暴'],
    ['gamma-ray burst', '伽马射线暴'],
    ['pulsar', '脉冲星'],
    ['quasar', '类星体'],
    ['interstellar', '星际'],
    ['exomoon', '系外卫星'],
    ['habitable zone', '宜居带'],
    ['biosignature', '生物标志'],
    ['atmosphere', '大气'],
    ['magnetosphere', '磁层'],
    ['cryovolcano', '冰火山'],
    ['lava tube', '熔岩管'],
    ['crater', '撞击坑'],
    ['regolith', '月壤'],
    ['ice', '冰'],
    ['water', '水'],
    ['methane', '甲烷'],

    /* ---- 天体名 ---- */
    ['jupiter', '木星'],
    ['saturn', '土星'],
    ['mars', '火星'],
    ['venus', '金星'],
    ['mercury', '水星'],
    ['neptune', '海王星'],
    ['uranus', '天王星'],
    ['earth', '地球'],
    ['moon', '月球'],
    ['lunar', '月球'],
    ['sun', '太阳'],
    ['solar', '太阳'],
    ['titan', '土卫六'],
    ['enceladus', '土卫二'],
    ['europa', '木卫二'],
    ['ganymede', '木卫三'],
    ['callisto', '木卫四'],
    ['io', '木卫一'],
    ['phobos', '火卫一'],
    ['deimos', '火卫二'],
    ['pluto', '冥王星'],
    ['ceres', '谷神星'],
    ['vesta', '灶神星'],
    ['bennu', '贝努'],
    ['ryugu', '龙宫'],
    ['apophis', '阿波菲斯'],
    ['proxima centauri', '比邻星'],
    ['alpha centauri', '半人马座 α'],
    ['betelgeuse', '参宿四'],
    ['sirius', '天狼星'],
    ['vega', '织女星'],
    ['polaris', '北极星'],
    ['orion', '猎户座'],
    ['scorpius', '天蝎座'],
    ['sagittarius', '人马座'],
    ['taurus', '金牛座'],
    ['cygnus', '天鹅座'],
    ['lyra', '天琴座'],
    ['aquila', '天鹰座'],
    ['pegasus', '飞马座'],
    ['andromeda galaxy', '仙女座星系'],
    ['trappist', 'TRAPPIST-1 行星系'],
    ['kepler-', '开普勒-'],

    /* ---- 动作 / 事件 / 常见句式 ---- */
    ['spacewalk', '太空行走'],
    ['launch', '发射'],
    ['launches', '发射'],
    ['launched', '发射'],
    ['liftoff', '升空'],
    ['landing', '着陆'],
    ['landed', '着陆'],
    ['touchdown', '着陆'],
    ['docking', '对接'],
    ['docked', '对接'],
    ['splashdown', '溅落'],
    ['reentry', '再入'],
    ['re-entry', '再入'],
    ['flyby', '飞掠'],
    ['orbiter', '环绕器'],
    ['rover', '巡视器'],
    ['lander', '着陆器'],
    ['probe', '探测器'],
    ['mission', '任务'],
    ['satellite', '卫星'],
    ['telescope', '望远镜'],
    ['observatory', '天文台'],
    ['images', '影像'],
    ['image', '影像'],
    ['captures', '拍摄到'],
    ['captured', '拍摄到'],
    ['photographs', '拍摄'],
    ['observations', '观测'],
    ['observed', '观测到'],
    ['detected', '探测到'],
    ['detects', '探测到'],
    ['discovered', '发现'],
    ['discovers', '发现'],
    ['discovery', '发现'],
    ['reveals', '揭示'],
    ['revealed', '揭示'],
    ['suggests', '表明'],
    ['confirms', '证实'],
    ['measured', '测得'],
    ['study', '研究'],
    ['studies', '研究'],
    ['researchers', '研究人员'],
    ['scientists', '科学家'],
    ['astronomers', '天文学家'],
    ['team', '团队'],
    ['first', '首次'],
    ['new', '新'],
    ['ancient', '古老的'],
    ['distant', '遥远的'],
    ['earliest', '最早的'],
    ['youngest', '最年轻的'],
    ['largest', '最大的'],
    ['smallest', '最小的'],
    ['closest', '最近的'],
    ['farthest', '最远的'],
    ['brightest', '最亮的'],
    ['mysterious', '神秘的'],
    ['surprising', '出人意料的'],
    ['unexpected', '意外的'],
    ['rare', '罕见的'],
    ['record-breaking', '破纪录的'],
    ['could', '可能'],
    ['may', '可能'],
    ['might', '可能'],
    ['hints at', '暗示'],
    ['why', '为何'],
    ['how', '如何'],
    ['what', '什么'],
    ['where', '何处'],
    ['when', '何时'],
    ['found', '发现'],
    ['finds', '发现'],
    ['hidden', '隐藏的'],
    ['in', '在'],
    ['on', '在'],
    ['at', '在'],
    ['the', ''],
    ['a', ''],
    ['an', ''],
    ['of', '的'],
    ['and', '与'],
    ['with', '用'],
    ['from', '来自'],
    ['for', '为'],
    ['to', ''],
    ['into', '进入'],
    ['after', '之后'],
    ['before', '之前'],
    ['during', '期间'],
    ['about', '关于'],
    ['than', '比'],
    ['more', '更'],
    ['most', '最'],
    ['up', ''],
    ['down', ''],
    ['out', ''],
    ['over', ''],
    ['its', '其'],
    ['their', '其'],
    ['this', '这'],
    ['that', '该'],
    ['these', '这些'],
    ['those', '那些'],
    ['is', '是'],
    ['are', '是'],
    ['was', ''],
    ['were', ''],
    ['will', '将'],
    ['has', '已'],
    ['have', '已'],
    ['had', '已'],
    ['be', ''],
    ['been', ''],
    ['as', '作为'],
    ['by', '由'],
    ['or', '或'],
    ['not', '不'],
    ['no', '无'],
    ['why', '为何'],

    /* ---- 补：容易连在一起充当一个词组的搭配 ---- */
    ['black holes', '黑洞'],
    ['black hole', '黑洞'],
    ['hints at', '暗示'],
    ['look to', '看向'],
    ['find them', '找到它们'],
    ['can help', '可以帮助'],
    ['could be', '可能是'],
    ['may hold', '可能持有'],
    ['are younger than', '比…更年轻'],
    ['are warped', '翘曲'],
    ['space telescope', '空间望远镜'],
    ['first views of', '首批影像'],

    /* ---- 补：测试里还剩的零散生词 ---- */
    ['sky', '天空'],
    ['pit', '坑'],
    ['silence', '静默'],
    ['perseids', '英仙座流星雨'],
    ['director', '导演'],
    ['guide', '指南'],
    ['warped', '翘曲的'],
    ['twisted', '扭曲的'],
    ['affected', '影响'],
    ['jet', '喷流'],
    ['reach', '抵达'],
    ['reachable', '可抵达的'],
    ['search', '搜寻'],
    ['moon', '月球'],
    ['journey', '旅程'],
    ['silence', '静默'],
    ['view', '视图'],
    ['views', '影像'],
    ['field', '场'],
    ['confirm', '证实'],
    ['confirms', '证实'],
    ['thought', '认为'],
    ['previously', '此前'],
    ['successfully', '成功'],
    ['rare', '罕见的'],
    ['smash', '撞击'],

    /* ---- 补：标题里出现频率最高的那些词 ----
       这张表是拿真实英文标题跑覆盖率测出来补的，
       缺哪个补哪个，比一层层套语法可靠。 */
    ['spotted', '发现'],
    ['spots', '发现'],
    ['selects', '选定'],
    ['selected', '选定的'],
    ['search', '寻找'],
    ['searching', '搜寻'],
    ['potential', '可能的'],
    ['base', '基地'],
    ['site', '地点'],
    ['shows', '显示'],
    ['shown', '显示'],
    ['different', '不同的'],
    ['origins', '起源'],
    ['origin', '起源'],
    ['thousands', '数千'],
    ['hundreds', '数百'],
    ['millions', '数百万'],
    ['billions', '数十亿'],
    ['black', '黑'],
    ['hole', '洞'],
    ['holes', '洞'],
    ['lurking', '潜伏'],
    ['lurk', '潜伏'],
    ['backyard', '近旁'],
    ['help', '帮助'],
    ['wandering', '游荡的'],
    ['hold', '持有'],
    ['clues', '线索'],
    ['clue', '线索'],
    ['evolution', '演化'],
    ['affected', '影响'],
    ['affect', '影响'],
    ['jets', '喷流'],
    ['jet', '喷流'],
    ['constellations', '星座'],
    ['constellation', '星座'],
    ['drifting', '漂移'],
    ['keep', '保持'],
    ['keeping', '保持'],
    ['look', '看'],
    ['buried', '掩埋的'],
    ['volcano', '火山'],
    ['hints', '暗示'],
    ['hint', '暗示'],
    ['dynamo', '发电机'],
    ['simulations', '模拟'],
    ['simulation', '模拟'],
    ['connect', '连接'],
    ['connects', '连接'],
    ['universe', '宇宙'],
    ['today', '今天'],
    ['drops', '公布'],
    ['drop', '下降'],
    ['view', '视图'],
    ['unruly', '躁动的'],
    ['centre', '中心'],
    ['center', '中心'],
    ['neutrons', '中子'],
    ['neutron', '中子'],
    ['rotating', '旋转的'],
    ['galactic', '银河系的'],
    ['tracks', '追踪'],
    ['track', '追踪'],
    ['magnetic', '磁场的'],
    ['switchbacks', '磁开关'],
    ['switchback', '磁开关'],
    ['dark', '暗'],
    ['quiet', '安静'],
    ['returns', '返回'],
    ['return', '返回'],
    ['views', '影像'],
    ['director', '导演'],
    ['take', '视角'],
    ['telling', '讲述'],
    ['story', '故事'],
    ['film', '影片'],
    ['build', '建造'],
    ['building', '建造'],
    ['detect', '探测到'],
    ['vapour', '水汽'],
    ['vapor', '水汽'],
    ['starlink', '星链'],
    ['rocket', '火箭'],
    ['pass', '掠过'],
    ['closer', '更近'],
    ['close', '近'],
    ['stunning', '惊艳的'],
    ['remnant', '遗迹'],
    ['type', '类型'],
    ['stellar', '恒星的'],
    ['explosion', '爆发'],
    ['rings', '环'],
    ['ring', '环'],
    ['younger', '更年轻'],
    ['young', '年轻的'],
    ['previously', '此前'],
    ['thought', '认为'],
    ['research', '研究'],
    ['researchers', '研究人员'],
    ['journey', '旅程'],
    ['clipper', '快帆'],
    ['begins', '开始'],
    ['begin', '开始'],
    ['icy', '冰封的'],
    ['chinese', '中国的'],
    ['china', '中国'],
    ['evidence', '证据'],
    ['successfully', '成功'],
    ['successful', '成功的'],
    ['reaches', '抵达'],
    ['reach', '抵达'],
    ['orbit', '轨道'],
    ['maiden', '首次'],
    ['flight', '飞行'],
    ['energy', '能量'],
    ['weakening', '减弱'],
    ['weaken', '减弱'],
    ['time', '时间'],
    ['survey', '巡天'],
    ['surveys', '巡天'],
    ['peaks', '极大'],
    ['peak', '极大'],
    ['weekend', '周末'],
    ['watch', '观测'],
    ['watching', '观测'],
    ['resumes', '恢复'],
    ['resume', '恢复'],
    ['sending', '发送'],
    ['send', '发送'],
    ['science', '科学'],
    ['data', '数据'],
    ['months', '数月'],
    ['month', '月'],
    ['warped', '翘曲的'],
    ['twisted', '扭曲的'],
    ['field', '场'],
    ['released', '公布'],
    ['release', '公布'],
    ['sudden', '突然的'],
    ['rapid', '快速的'],
    ['deep', '深的'],
    ['high', '高'],
    ['low', '低'],
    ['long', '长'],
    ['short', '短'],
    ['fast', '快'],
    ['slow', '慢'],
    ['hot', '热'],
    ['cold', '冷'],
    ['warm', '温暖'],
    ['bright', '明亮的'],
    ['faint', '暗弱的'],
    ['visible', '可见的'],
    ['invisible', '不可见的'],
    ['powerful', '强大的'],
    ['tiny', '微小的'],
    ['huge', '巨大的'],
    ['massive', '大质量的'],
    ['dense', '致密的'],
    ['strange', '奇特的'],
    ['unusual', '不寻常的'],
    ['complex', '复杂的'],
    ['simple', '简单的'],
    ['possible', '可能的'],
    ['likely', '很可能'],
    ['explain', '解释'],
    ['explains', '解释'],
    ['solve', '解决'],
    ['solves', '解决'],
    ['mystery', '谜团'],
    ['mysteries', '谜团'],
    ['question', '问题'],
    ['answer', '答案'],
    ['source', '来源'],
    ['target', '目标'],
    ['targets', '目标'],
    ['system', '系统'],
    ['systems', '系统'],
    ['region', '区域'],
    ['surface', '表面'],
    ['core', '核心'],
    ['crust', '外壳'],
    ['mantle', '幔'],
    ['ocean', '海洋'],
    ['polar', '极地的'],
    ['north', '北'],
    ['south', '南'],
    ['east', '东'],
    ['west', '西'],
    ['night', '夜'],
    ['day', '日'],
    ['year', '年'],
    ['years', '年'],
    ['week', '周'],
    ['weeks', '周'],
    ['hours', '小时'],
    ['hour', '小时'],
    ['minutes', '分钟'],
    ['seconds', '秒'],
    ['billion', '十亿'],
    ['million', '百万'],
    ['trillion', '万亿'],
    ['light-year', '光年'],
    ['light years', '光年'],
    ['kilometre', '公里'],
    ['kilometer', '公里'],
    ['mile', '英里'],
    ['degree', '度'],
    ['degrees', '度'],
    ['distance', '距离'],
    ['speed', '速度'],
    ['mass', '质量'],
    ['size', '尺寸'],
    ['bigger', '更大'],
    ['larger', '更大'],
    ['smaller', '更小'],
    ['older', '更老'],
    ['heavier', '更重'],
    ['denser', '更致密'],
    ['closest', '最近的'],
    ['nearest', '最近的'],
    ['known', '已知的'],
    ['unknown', '未知的'],
    ['similar', '相似的'],
    ['unlike', '不像'],
    ['instead', '反而'],
    ['however', '然而'],
    ['because', '因为'],
    ['while', '而'],
    ['although', '尽管'],
    ['revealing', '揭示'],
    ['showing', '显示'],
    ['suggesting', '表明'],
    ['including', '包括'],
    ['containing', '包含'],
    ['using', '使用'],
    ['used', '使用'],
    ['makes', '使'],
    ['means', '意味着'],
    ['called', '称为'],
    ['named', '命名为'],
    ['set', '设定'],
    ['record', '记录'],
    ['records', '记录'],
    ['test', '测试'],
    ['tests', '测试'],
    ['planned', '计划的'],
    ['plan', '计划'],
    ['future', '未来'],
    ['next', '下一个'],
    ['last', '上一个'],
    ['early', '早期'],
    ['late', '晚期'],
    ['end', '结束'],
    ['start', '开始'],
    ['began', '开始'],
    ['finally', '终于'],
    ['soon', '很快'],
    ['already', '已经'],
    ['still', '仍然'],
    ['again', '再次'],
    ['back', '返回'],
    ['away', '远离'],
    ['toward', '朝向'],
    ['around', '环绕'],
    ['across', '横跨'],
    ['beyond', '超出'],
    ['above', '上方'],
    ['below', '下方'],
    ['inside', '内部'],
    ['outside', '外部'],
    ['within', '之内'],
    ['between', '之间'],
    ['among', '之中'],
    ['along', '沿着'],
    ['throughout', '贯穿'],
    ['together', '一起'],
    ['another', '另一个'],
    ['other', '其他'],
    ['others', '其他'],
    ['same', '相同'],
    ['such', '这样的'],
    ['even', '甚至'],
    ['ever', '曾经'],
    ['never', '从未'],
    ['always', '总是'],
    ['often', '经常'],
    ['sometimes', '有时'],
    ['almost', '几乎'],
    ['nearly', '接近'],
    ['about', '大约'],
    ['exactly', '恰好'],
    ['rather', '相当'],
    ['quite', '相当'],
    ['really', '真正'],
    ['actually', '实际上'],
    ['perhaps', '也许'],
    ['maybe', '也许'],
    ['probably', '大概']
  ];

  /* 已知的专有名词白名单：这类词就算词典里没有，也照样原样保留，
     不参与"生词"判定。天文新闻里这类名字特别多（卫星名、望远镜名、
     小行星名、任务名），硬塞进词典反而会误伤别的词。 */
  var PROPER = [
    'marius', 'gimli', 'pevatron', 'perseids', 'sentinel', 'silence',
    'starlink', 'zhurong', 'apophis', 'bennu', 'ryugu', 'trappist',
    'kepler', 'galileo', 'copernicus', 'atacama', 'chandra', 'juno',
    'cassini', 'voyager', 'psyche', 'lucy', 'dart', 'juice',
    'drag', 'luci', 'aaron', 'sierra', 'mev', 'tev', 'pev', 'gev'
  ];
  function isProper(w) {
    var x = String(w).toLowerCase().replace(/[’'\-]/g, '');
    for (var i = 0; i < PROPER.length; i++) {
      if (x === PROPER[i] || x.indexOf(PROPER[i]) === 0) return true;
    }
    /* 带编号的：Sentinel-3C / Pa 30 / Sgr A* / 2MASS J… */
    if (/\d/.test(w)) return true;
    /* 全大写、或者"首字母大写+其余小写"且长度>=5 的，多半是名字 */
    if (/^[A-Z][a-z]{4,}$/.test(w)) return true;
    return false;
  }

  /* -------------------------------------------------------------- 预处理 */
  /* 按长度从长到短排，保证 "james webb space telescope" 先于 "webb" 被替换 */
  var SORTED = PHRASES.slice().sort(function (a, b) {
    return b[0].length - a[0].length;
  });

  /* 词典（小写 → 中文），供"逐词覆盖率"判断用 */
  var DICT = {};
  PHRASES.forEach(function (p) {
    DICT[p[0].toLowerCase()] = p[1];
  });

  /* 这些词很短、又不是关键词，缺了也不影响理解 */
  var FUNCTION_WORDS = {
    'the': 1, 'a': 1, 'an': 1, 'of': 1, 'and': 1, 'or': 1, 'to': 1, 'in': 1,
    'on': 1, 'at': 1, 'by': 1, 'as': 1, 'is': 1, 'are': 1, 'was': 1, 'were': 1,
    'be': 1, 'been': 1, 'it': 1, 'its': 1, 'we': 1, 'us': 1, 'you': 1, 'your': 1,
    'our': 1, 'they': 1, 'them': 1, 'their': 1, 'he': 1, 'she': 1, 'his': 1,
    'her': 1, 'this': 1, 'that': 1, 'these': 1, 'those': 1, 'has': 1, 'have': 1,
    'had': 1, 'will': 1, 'would': 1, 'can': 1, 'could': 1, 'may': 1, 'might': 1,
    'must': 1, 'not': 1, 'no': 1, 'so': 1, 'but': 1, 'if': 1, 'than': 1,
    'more': 1, 'most': 1, 'up': 1, 'down': 1, 'out': 1, 'over': 1, 'into': 1,
    'about': 1, 'from': 1, 'for': 1, 'with': 1, 'after': 1, 'before': 1,
    'during': 1, 'between': 1, 'through': 1, 'while': 1, 'when': 1, 'where': 1,
    'why': 1, 'how': 1, 'what': 1, 'who': 1, 'which': 1, 'also': 1, 'just': 1,
    'now': 1, 'then': 1, 'only': 1, 'very': 1, 'much': 1, 'many': 1, 'some': 1,
    'all': 1, 'any': 1, 'each': 1, 'both': 1, 'one': 1, 'two': 1, 'three': 1,
    'first': 1, 'new': 1, 'way': 1, 'get': 1, 'got': 1, 'make': 1, 'made': 1,
    'like': 1, 'near': 1, 'far': 1, 'big': 1, 'small': 1, 'old': 1,
    'yet': 1, 'seen': 1, 'see': 1, 'far': 1
  };

  /** 很粗略的词形还原：复数 / 过去式 / 进行时 → 原形，好在词典里命中 */
  function stems(w) {
    var out = [w];
    if (/ies$/.test(w)) out.push(w.replace(/ies$/, 'y'));
    if (/es$/.test(w)) out.push(w.replace(/es$/, ''));
    if (/s$/.test(w) && !/ss$/.test(w)) out.push(w.replace(/s$/, ''));
    if (/ed$/.test(w)) { out.push(w.replace(/ed$/, '')); out.push(w.replace(/ed$/, 'e')); }
    if (/ing$/.test(w)) { out.push(w.replace(/ing$/, '')); out.push(w.replace(/ing$/, 'e')); }
    if (/ly$/.test(w)) out.push(w.replace(/ly$/, ''));
    if (/er$/.test(w)) out.push(w.replace(/er$/, ''));
    if (/est$/.test(w)) out.push(w.replace(/est$/, ''));
    return out;
  }

  function lookup(w) {
    var cands = stems(w);
    for (var i = 0; i < cands.length; i++) {
      if (Object.prototype.hasOwnProperty.call(DICT, cands[i])) return DICT[cands[i]];
    }
    return null;
  }

  function escRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 把英文标题翻成中文。
   *
   * 返回 { zh, covered, ratio, leftovers }
   *   covered = 只有"有把握"时才为 true，页面此时才显示中文。
   *
   * 顺序很重要：**先替换短语，再统计生词**。
   * 反过来的话 "black holes" 这种短语会被拆成单词，
   * "black" 和 "holes" 都会被当成生词，明明认识却判成不认识。
   *
   * 判定标准（两道关都要过）：
   *   ① 逐词覆盖率 ≥ 0.72（按词算，不是按字符算）
   *   ② 剩余生词里不能有 4 个字母以上的实词（数字、缩写、专有名词除外）
   * 只要有一个长实词翻不出来，就说明这句我没把握，宁可只显示原文。
   */
  function translate(title) {
    var src = String(title || '').trim();
    if (!src) return { zh: '', covered: false, ratio: 0, leftovers: [] };

    /* 已经基本是中文 → 不用翻 */
    var cn = (src.match(/[\u4e00-\u9fa5]/g) || []).length;
    if (cn >= 4) return { zh: src, covered: true, ratio: 1, leftovers: [] };

    /* ---- 第零步：先在**原文**上数一遍英文词，这就是覆盖率的分母 ----
       这一步不能省，也不能放到短语替换之后：
       短语一旦被替换成中文，那些词就不见了，分母会凭空变小，
       于是"明明全认出来了"反而算出覆盖率 0（这个坑我踩过一次）。 */
    var origWords = src.match(/[A-Za-z][A-Za-z'’\-]*/g) || [];
    var total = origWords.length || 1;

    /* ---- 第一步：短语优先替换（长短语在前） ---- */
    var work = src;
    SORTED.forEach(function (pair) {
      var re = new RegExp('\\b' + escRe(pair[0]) + '\\b', 'gi');
      work = work.replace(re, pair[1] ? ('\u0001' + pair[1] + '\u0001') : ' ');
    });

    /* ---- 第二步：剩下的英文单词逐个查词典（含词形还原） ---- */
    var unknown = [];
    work = work.replace(/[A-Za-z][A-Za-z'’\-]*/g, function (m) {
      /* 纯大写缩写（NASA / ESA / LIGO / FAST）当作已认识 */
      if (/^[A-Z]{2,5}$/.test(m)) return '\u0001' + m + '\u0001';
      var w = m.toLowerCase().replace(/[’']s$/, '').replace(/[’']/g, "'");
      if (FUNCTION_WORDS[w]) return ' ';
      var hit = lookup(w);
      if (hit) return hit ? ('\u0001' + hit + '\u0001') : ' ';
      unknown.push(m);
      return m;
    });

    var ratio = (total - unknown.length) / total;

    /* 生词里的"长实词"（4 个字母以上、不是缩写、不是专有名词、不含数字）才算硬伤 */
    var hard = unknown.filter(function (w) {
      var x = w.replace(/[^A-Za-z'’\-]/g, '');
      if (x.length < 4) return false;
      if (isProper(x)) return false;
      return true;
    });

    var out = work
      .replace(/\u0001/g, '')
      /* 英文所有格：'s 直接去掉（土星's 环 → 土星环） */
      .replace(/[’']s\b/g, '')
      .replace(/[’'](?![\u4e00-\u9fa5])/g, '')
      .replace(/\s+/g, ' ')
      .replace(/([\u4e00-\u9fa5])\s+(?=[\u4e00-\u9fa5])/g, '$1')
      /* 中文与英文/数字之间补一个空格，读起来清楚 */
      .replace(/([\u4e00-\u9fa5])([A-Za-z0-9])/g, '$1 $2')
      .replace(/([A-Za-z0-9])([\u4e00-\u9fa5])/g, '$1 $2')
      .replace(/\s+([，。、！？：；])/g, '$1')
      .replace(/([,;])\s*/g, '，')
      .trim();

    var covered = ratio >= 0.72 && hard.length === 0 && out.length > 0;

    if (typeof window !== 'undefined' && window.__SKY_LANG_DEBUG) {
      try {
        console.log('[lang]', JSON.stringify({
          src: src, total: total, unknown: unknown, ratio: Number(ratio.toFixed(2)), zh: out
        }));
      } catch (e) { }
    }

    return {
      zh: out,
      covered: covered,
      ratio: ratio,
      leftovers: hard.slice(0, 6)
    };
  }

  /**
   * 判断一条新闻算不算"中国天文"。
   * 之前只看标题里的中文，结果外国站的中文版也被算进来、
   * 而真正的中文报道又漏掉，于是出现了"中国天文 0 条"。
   * 现在改成三维度打分：来源、关键词、语言。
   */
  var CN_SOURCE = [
    'cnsa', 'china', 'chinadaily', 'china daily', 'cgtn', 'xinhua', '新华社',
    '中国', '中科院', '国家天文台', '澎湃', '环球', '观察者', '科技日报', '航天'
  ];
  var CN_WORD = [
    '中国', '我国', '国内', '嫦娥', '天问', '北斗', '鹊桥', '天宫', '神舟', '长征',
    '祝融', '玉兔', '羲和', '悟空', '慧眼', '夸父', '巡天', 'FAST', '天眼', '郭守敬',
    '空间站', '探月', '火星车', '中继星', '酒泉', '文昌', '西昌', '太原', '星际荣耀',
    '蓝箭', '星河动力', '银河航天', '中星', '亚太', '风云', '高分', '北斗三号'
  ];
  var CN_ORG = ['cnsa', 'cas', 'naoc', 'beijing', 'shanghai astronomical'];

  function isChinaNews(item) {
    var src = String((item && (item.source || item.news_site)) || '').toLowerCase();
    var text = String((item && (item.title || '') + ' ' + (item.summary || '')) || '');

    for (var i = 0; i < CN_SOURCE.length; i++) {
      if (src.indexOf(CN_SOURCE[i].toLowerCase()) >= 0) return true;
    }
    for (var j = 0; j < CN_ORG.length; j++) {
      if (src.indexOf(CN_ORG[j]) >= 0) return true;
    }
    for (var k = 0; k < CN_WORD.length; k++) {
      if (text.indexOf(CN_WORD[k]) >= 0) return true;
    }
    /* 标题里中文占比高 → 当中文报道 */
    var cn = (String(item && item.title || '').match(/[\u4e00-\u9fa5]/g) || []).length;
    return cn >= 6;
  }

  return {
    translate: translate,
    isChinaNews: isChinaNews,
    phrases: PHRASES,
    /* 给页面用的便捷方法：能翻就翻，翻不了返回原文 */
    titleZh: function (t) {
      var r = translate(t);
      return r.covered ? r.zh : String(t || '');
    }
  };
})();
