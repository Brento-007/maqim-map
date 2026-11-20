// 1. 统一配置
const IMG_BASE_URL = 'map/';  
const JSON_BASE_URL = 'mapData/'; 

// 2. 区域索引 (确保与 HTML 的 data-region 一一对应)
const regionIndex = {
    'airlene': 'airlene',
    'tirchonaill': 'tirchonaill',
    'dugard': 'dugard',
    'wolf': 'wolf',
    'goddess': 'goddess',
    'dunbarton': 'dunbarton',
    'ciar': 'ciar',
    'frost': 'frost',
    'bangor': 'bangor',
    'lairt': 'lairt',
    'cloud': 'cloud',
    'sidd': 'sidd',
    'emain': 'emain'
};

// 3. 获取 DOM 元素
const tags = document.querySelectorAll('#region-tags span');
const mapImg = document.getElementById('map-image');
const infoTitle = document.getElementById('info-title');
const listContainer = document.getElementById('info-list-container');
const markersContainer = document.getElementById('markers-container'); 

let currentRegion = 'airlene'; // 默认启动加载的地图

// 4. 核心函数：渲染侧边栏和红点
function renderUI(markersData) {
    listContainer.innerHTML = ''; // 清空侧边栏
    markersContainer.innerHTML = ''; // 清空旧的红点

    // 👇 新增：判断如果没有数据，或者数据为空对象
    if (!markersData || Object.keys(markersData).length === 0) {
        // 在侧边栏显示一句提示，并加一点灰色样式
        const emptyMsg = document.createElement('li');
        emptyMsg.style.color = '#8b92a5';
        emptyMsg.style.fontSize = '14px';
        emptyMsg.style.textAlign = 'center';
        emptyMsg.style.padding = '20px 0';
        emptyMsg.textContent = '该区域暂无标记点';
        listContainer.appendChild(emptyMsg);
        return; // 直接返回，不再往下执行生成红点的逻辑
    }

    for (const key in markersData) {
        const markerInfo = markersData[key];
        
        // 生成侧边栏复选框
        const li = document.createElement('li');
        li.innerHTML = `
            <input type="checkbox" id="check-${key}" data-target="marker-group-${key}">
            <label for="check-${key}">${markerInfo.name} <span style="color:#888;font-size:12px;">(${markerInfo.top.length}个)</span></label>
        `;
        listContainer.appendChild(li);

        // 生成地图上的红点组
        const groupDiv = document.createElement('div');
        groupDiv.id = `marker-group-${key}`;
        groupDiv.className = 'marker-group'; 
        groupDiv.style.display = 'none'; // 默认隐藏
        groupDiv.style.position = 'absolute';
        groupDiv.style.top = '0';
        groupDiv.style.left = '0';
        groupDiv.style.width = '100%';
        groupDiv.style.height = '100%';
        groupDiv.style.pointerEvents = 'none'; // 穿透鼠标事件，防止挡住地图

        // 遍历数组，把每一个坐标都生成一个真正的红点
        for (let i = 0; i < markerInfo.top.length; i++) {
            const dot = document.createElement('div');
            dot.className = 'marker'; 
            dot.style.top = markerInfo.top[i];
            dot.style.left = markerInfo.left[i];
            dot.title = markerInfo.name + " - 坐标 " + (i + 1); // 鼠标悬停显示提示
            groupDiv.appendChild(dot);
        }

        markersContainer.appendChild(groupDiv);
    }
    bindCheckboxEvents();
}

// 绑定勾选事件（一勾选，整组红点显示或隐藏）
function bindCheckboxEvents() {
    const checkboxes = document.querySelectorAll('.info-list input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const targetId = this.getAttribute('data-target');
            const group = document.getElementById(targetId);
            
            if (this.checked) {
                group.style.display = 'block'; // 显示整组
            } else {
                group.style.display = 'none';  // 隐藏整组
            }
        });
    });
}

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
        tags.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        currentRegion = this.getAttribute('data-region');
        
        mapImg.style.opacity = 0.5; // 加载暗化效果

        const data = await loadMapData(currentRegion);

        if (data) {
            infoTitle.textContent = data.title;
            mapImg.src = IMG_BASE_URL + data.imgSrc;
            mapImg.style.opacity = 1;
            renderUI(data.markers);
        } else {
            mapImg.style.opacity = 1; 
        }
    });
});

// 7. 初始化页面
async function init() {
    const data = await loadMapData(currentRegion);
    if (data) {
        infoTitle.textContent = data.title;
        mapImg.src = IMG_BASE_URL + data.imgSrc;
        renderUI(data.markers);
    } else {
        // 如果没找到数据，给个提示
        console.warn("⚠️ 提示：默认地图的 JSON 文件未找到。请确保 mapData 文件夹里有 airlene.json");
    }
}
init();