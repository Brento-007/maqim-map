// 1. 简体 / 繁体 文本对照表（未收录的词按原样显示）
// 说明：繁体版沿用游戏原名（瑪奇 / 愛爾琳），简体版为对应的常用译名（洛奇 / 爱琳）
const LANG_MAP = {
    's2t': {
        '玛奇': '瑪奇', '洛奇': '瑪奇', '爱琳': '愛爾琳', '提尔克那': '提爾克那',
        '杜加德走廊': '杜加德走廊', '狼之森林': '狼之森林', '女神庭园': '女神庭園',
        '杜巴顿': '杜巴頓', '库汉': '庫漢', '冰霜峡谷': '冰霜峽谷', '班克尔': '班克爾',
        '莱尔特丘陵': '萊爾特丘陵', '云海旷野': '雲海曠野', '希德斯特雪原': '希德斯特雪原',
        '艾明马夏': '艾明馬夏', '地图': '地圖', '信息': '信息', '版本更新至': '版本更新至',
        '赛季': '賽季', '区域': '區域', '该': '該', '暂无': '暫無', '标记点': '標記點',
        '捣蛋鬼的珠子': '搗蛋鬼的珠子', '鸟巢': '鳥巢', '猫咪小屋': '貓咪小屋',
        '拍照景点': '拍照景點', '起点': '起點', '终点': '終點', '坐标': '座標',
        '个': '個', '鼠标悬停显示提示': '滑鼠懸停顯示提示'
    },
    't2s': {
        '瑪奇': '洛奇', '愛爾琳': '爱琳', '提爾克那': '提尔克那', '杜加德走廊': '杜加德走廊',
        '狼之森林': '狼之森林', '女神庭園': '女神庭园', '杜巴頓': '杜巴顿', '庫漢': '库汉',
        '冰霜峽谷': '冰霜峡谷', '班克爾': '班克尔', '萊爾特丘陵': '莱尔特丘陵',
        '雲海曠野': '云海旷野', '希德斯特雪原': '希德斯特雪原', '艾明馬夏': '艾明马夏',
        '地圖': '地图', '信息': '信息', '賽季': '赛季', '區域': '区域', '該': '该',
        '暫無': '暂无', '標記點': '标记点', '搗蛋鬼的珠子': '捣蛋鬼的珠子', '鳥巢': '鸟巢',
        '貓咪小屋': '猫咪小屋', '拍照景點': '拍照景点', '起點': '起点', '終點': '终点',
        '座標': '坐标', '個': '个', '滑鼠': '鼠标', '滑鼠懸停顯示提示': '鼠标悬停显示提示'
    }
};

// 2. 界面固定文案
const UI_TEXT = {
    'zh-Hant': { empty: '該區域暫無標記點', count: '個' },
    'zh-Hans': { empty: '该区域暂无标记点', count: '个' }
};

// 3. 按词条转换文本（长词优先，避免「瑪奇」被拆成单字）
function convertText(text, to) {
    if (!text || to === 'zh-Hant') return text;
    const dict = LANG_MAP[to];
    const keys = Object.keys(dict).sort((a, b) => b.length - a.length);
    const pattern = new RegExp(keys.join('|'), 'g');
    return text.replace(pattern, match => dict[match]);
}

// 4. 当前语言（默认繁体）
let currentLang = 'zh-Hant';

function isTraditional() {
    return currentLang === 'zh-Hant';
}

// 5. 应用语言：更新 <html lang>、标题与所有带 data-i18n 的元素
function applyLanguage(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;
    const to = isTraditional() ? 'zh-Hant' : 't2s';

    document.title = convertText('瑪奇M地圖信息', to);

    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = convertText(el.dataset.i18n, to); // 以 data-i18n 中的繁体原文为基准
    });

    // 区域标签的原文由 script.js 记录在 data-source 上
    document.querySelectorAll('#region-tags span[data-source]').forEach(el => {
        el.textContent = convertText(el.dataset.source, to);
    });

    // 同步切换按钮的高亮状态（简 / 繁 中当前语言的那一侧亮起）
    const toggle = document.getElementById('lang-toggle');
    if (toggle) {
        const active = isTraditional() ? 'zh-Hant' : 'zh-Hans';
        toggle.querySelectorAll('.lang-opt').forEach(el => {
            el.classList.toggle('active', el.dataset.lang === active);
        });
        toggle.title = '切換為' + (isTraditional() ? '简体' : '繁體');
    }

    // 让页面重新渲染数据（侧边栏、标点提示等）
    if (typeof refreshCurrentRegion === 'function') {
        refreshCurrentRegion(to);
    }
}

// 6. 初始化语言切换按钮
function initLangToggle() {
    const toggle = document.getElementById('lang-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', () => {
        applyLanguage(isTraditional() ? 'zh-Hans' : 'zh-Hant');
    });
}
