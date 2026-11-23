// 1. 统一配置
const IMG_BASE_URL = 'map/';  
const JSON_BASE_URL = 'mapData/'; 

// 2. 区域索引（与 HTML 的 data-region 一一对应，也即 mapData 下的文件名）
// 用数组维护，避免 key/value 重复书写：
const REGION_KEYS = [
    'airlene', 'tirchonaill', 'dugard', 'wolf', 'goddess', 'dunbarton', 'ciar',
    'frost', 'bangor', 'lairt', 'cloud', 'sidd', 'emain'
];
const regionIndex = Object.fromEntries(REGION_KEYS.map(key => [key, key]));

// 3. 获取 DOM 元素
const tags = document.querySelectorAll('#region-tags span');
const mapImg = document.getElementById('map-image');
const infoTitle = document.getElementById('info-title');
const listContainer = document.getElementById('info-list-container');
const markersContainer = document.getElementById('markers-container');
const mainContent = document.querySelector('.main-content');
const mapBox = document.getElementById('map-box');

// 不显示侧边栏的区域（首版大图，地图铺满整个面板宽度，且没有标点）
const NO_SIDEBAR_REGIONS = ['airlene'];

// 记录区域标签的繁体原文，供语言切换时还原（脚本先于初始化执行）
tags.forEach(tag => { tag.dataset.source = tag.textContent; });

let currentRegion = 'airlene'; // 默认启动加载的地图
let currentData = null; // 当前区域的 JSON 数据（切换语言时复用，避免重复请求）

// 4. 获取当前语言下的显示文本（繁体为原文，简体走词表转换）
function t(text) {
    if (typeof convertText !== 'function') return text;
    return convertText(text, isTraditional() ? 'zh-Hant' : 't2s');
}

// 5. 核心函数：渲染侧边栏和标点
function renderUI(markersData) {
    listContainer.innerHTML = ''; // 清空侧边栏
    markersContainer.innerHTML = ''; // 清空旧的标点

    if (!markersData || Object.keys(markersData).length === 0) {
        // 首版大图无侧边栏，不需要「暫無標記點」提示
        if (mainContent && mainContent.classList.contains('no-sidebar')) return;

        const emptyMsg = document.createElement('li');
        emptyMsg.className = 'info-empty';
        emptyMsg.textContent = t('該區域暫無標記點');
        listContainer.appendChild(emptyMsg);
        return; // 直接返回，不再往下执行生成标点的逻辑
    }

    const countUnit = t('個');

    for (const key in markersData) {
        const markerInfo = markersData[key];
        const markerName = t(markerInfo.name);

        // 生成侧边栏复选框（猫咪小屋的起點/終點不需要数量标识）
        const li = document.createElement('li');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `check-${key}`;
        checkbox.dataset.target = `marker-group-${key}`;

        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = markerName;
        if (key !== 'cat') {
            const count = document.createElement('span');
            count.className = 'info-count';
            count.textContent = ` (${markerInfo.top.length}${countUnit})`;
            label.appendChild(count);
        }

        li.append(checkbox, label);
        listContainer.appendChild(li);

        // 生成地图上的标点组（默认全部隐藏，由复选框控制显隐）
        const groupDiv = document.createElement('div');
        groupDiv.id = `marker-group-${key}`;
        groupDiv.className = 'marker-group';
        groupDiv.dataset.type = key;

        // 猫咪小屋：为前两个点添加「起點 / 終點」标识
        const labelTexts = key === 'cat' ? [t('起點'), t('終點')] : [];
        for (let i = 0; i < markerInfo.top.length; i++) {
            const dot = document.createElement('div');
            dot.className = 'marker';
            dot.dataset.type = key; // 标记种类，用于区分颜色
            dot.style.top = markerInfo.top[i];
            dot.style.left = markerInfo.left[i];
            dot.title = `${markerName} - ${t('座標')} ${i + 1}`; // 鼠标悬停显示提示

            if (labelTexts[i]) {
                const markLabel = document.createElement('span');
                markLabel.className = 'marker-label';
                markLabel.textContent = labelTexts[i];
                dot.appendChild(markLabel);
            }

            groupDiv.appendChild(dot);
        }

        markersContainer.appendChild(groupDiv);
    }
}

// 绑定勾选事件（一勾选，整组标点显示或隐藏）——事件委托，重建侧边栏后无需重新绑定
listContainer.addEventListener('change', e => {
    const checkbox = e.target;
    if (checkbox.type !== 'checkbox') return;
    const group = document.getElementById(checkbox.dataset.target);
    if (!group) return;
    group.classList.toggle('visible', checkbox.checked);
});

// 5. 异步读取 JSON 文件
async function loadMapData(regionKey) {
    const fileName = regionIndex[regionKey];
    if (!fileName) {
        console.error("❌ 区域索引中找不到：" + regionKey);
        return null;
    }

    try {
        const response = await fetch(`${JSON_BASE_URL}${fileName}.json`);
        if (!response.ok) throw new Error(`HTTP status: ${response.status}`);
        return await response.json(); 
    } catch (error) {
        console.error("❌ 读取数据失败:", error);
        return null;
    }
}

// 6. 点击标签切换地图
tags.forEach(tag => {
    tag.addEventListener('click', async function() {
        tags.forEach(tag => tag.classList.remove('active'));
        this.classList.add('active');
        currentRegion = this.getAttribute('data-region');
        await renderRegion(currentRegion);
    });
});

// 7. 加载并渲染指定区域

// 按区域切换侧边栏的显示状态
function updateSidebar(regionKey) {
    if (!mainContent) return;
    const hideSidebar = NO_SIDEBAR_REGIONS.includes(regionKey);
    mainContent.classList.toggle('no-sidebar', hideSidebar);
}

// 首版大图保持原始分辨率，超出容器的部分通过拖动查看
// （未生效的 transform 会让浏览器在其原位置预留空间，导致内容溢出，故用 translate 代替 left/top）
const mapView = { x: 0, y: 0 };
let mapDrag = null;

function clampMapView() {
    if (!mapImg || !mapImg.naturalWidth) return;
    const boxW = mapBox ? mapBox.clientWidth : 0;
    const boxH = mapBox ? mapBox.clientHeight : 0;
    const minX = Math.min(0, boxW - mapImg.naturalWidth);
    const minY = Math.min(0, boxH - mapImg.naturalHeight);
    mapView.x = Math.max(minX, Math.min(0, mapView.x));
    mapView.y = Math.max(minY, Math.min(0, mapView.y));
}

function applyMapView() {
    if (!mapImg) return;
    clampMapView();
    mapImg.style.transform = `translate(${mapView.x}px, ${mapView.y}px)`;
}

// 图片尺寸就绪后再定位：首版大图居中，其余区域复位
function readyMapView(regionKey) {
    if (!mapImg) return;
    const place = () => {
        if (NO_SIDEBAR_REGIONS.includes(regionKey)) {
            centerMapView();
        } else {
            mapView.x = 0;
            mapView.y = 0;
            applyMapView();
        }
    };
    if (mapImg.complete && mapImg.naturalWidth) {
        place();
    } else {
        mapImg.addEventListener('load', place, { once: true });
    }
}

function centerMapView() {
    if (!mapBox || !mapImg || !mapImg.naturalWidth) return;
    mapView.x = (mapBox.clientWidth - mapImg.naturalWidth) / 2;
    mapView.y = (mapBox.clientHeight - mapImg.naturalHeight) / 2;
    applyMapView();
}

function bindMapDrag() {
    if (!mapBox) return;

    // 用 window 上的 mousemove/mouseup 驱动：不依赖指针捕获，浏览器中途打断捕获也能继续拖动
    mapBox.addEventListener('mousedown', e => {
        if (!mainContent.classList.contains('no-sidebar') || e.button !== 0) return;
        e.preventDefault(); // 阻止浏览器原生图片拖放接管手势
        mapDrag = { startX: e.clientX, startY: e.clientY, originX: mapView.x, originY: mapView.y };
        mapBox.classList.add('dragging');
    });

    window.addEventListener('mousemove', e => {
        if (!mapDrag) return;
        mapView.x = mapDrag.originX + (e.clientX - mapDrag.startX);
        mapView.y = mapDrag.originY + (e.clientY - mapDrag.startY);
        applyMapView();
    });

    const endDrag = () => {
        if (!mapDrag) return;
        mapDrag = null;
        mapBox.classList.remove('dragging');
    };
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('blur', endDrag);
}

async function renderRegion(regionKey, data) {
    mapImg.style.opacity = 0.5; // 加载暗化效果

    const regionData = data || await loadMapData(regionKey);

    if (regionData) {
        currentData = regionData;
        updateSidebar(regionKey);
        // 非首版大图必须复位平移，否则 2912px 的原图会带着位移出现在 1000px 坐标系里
        if (!NO_SIDEBAR_REGIONS.includes(regionKey)) {
            mapView.x = 0;
            mapView.y = 0;
            applyMapView();
        }
        infoTitle.textContent = t(regionData.title);
        mapImg.src = IMG_BASE_URL + regionData.imgSrc;
        mapImg.style.opacity = 1;
        readyMapView(regionKey);
        renderUI(regionData.markers);
    } else {
        mapImg.style.opacity = 1;
    }
}

// 切换语言后重新渲染当前区域（区域标签由 applyLanguage 处理）
function refreshCurrentRegion() {
    if (!currentData) return;

    // 重建侧边栏会重置勾选状态，先记录已勾选的标点分组，渲染后恢复
    const checkedTypes = Array.from(listContainer.querySelectorAll('input[type="checkbox"]:checked'))
        .map(cb => cb.dataset.target);

    infoTitle.textContent = t(currentData.title);
    renderUI(currentData.markers);

    checkedTypes.forEach(targetId => {
        const checkbox = listContainer.querySelector(`input[data-target="${targetId}"]`);
        if (!checkbox) return;
        checkbox.checked = true;
        const group = document.getElementById(targetId);
        if (group) group.classList.add('visible');
    });
}

// 8. 初始化页面
async function init() {
    bindMapDrag(); // 首版大图的拖动查看
    if (typeof initLangToggle === 'function') initLangToggle();
    // 语言（含区域标签）先就绪，避免数据文本被重复转换
    if (typeof applyLanguage === 'function') applyLanguage(currentLang);

    // 复用 renderRegion，保证首屏与切换区域走同一条渲染路径
    await renderRegion(currentRegion);
    if (!currentData) {
        console.warn('⚠️ 提示：默认地图的 JSON 文件未找到，请确保 mapData 文件夹里有 airlene.json');
    }
}
init();

