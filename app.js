// State
let items = [];
let logs = [];
let currentStatsDate = new Date();
let longPressTimer;
let isLongPress = false;
let editingItemId = null;
let editingDate = null;

// Trend View State
let currentTrendItemId = null;
let currentTrendEndDate = new Date();

// DOM Elements
const gridContainer = document.getElementById('grid-container');
const addBtn = document.getElementById('add-btn');
const addModal = document.getElementById('add-modal');
const confirmAddBtn = document.getElementById('confirm-add');
const cancelAddBtn = document.getElementById('cancel-add');
const newItemInput = document.getElementById('new-item-name');
const colorBtns = document.querySelectorAll('.color-btn');

const statsBtn = document.getElementById('stats-btn');
const statsModal = document.getElementById('stats-modal');
const closeStatsBtn = document.getElementById('close-stats');
const statsList = document.getElementById('stats-list');
const currentDateEl = document.getElementById('current-date');
const prevDayBtn = document.getElementById('prev-day');
const nextDayBtn = document.getElementById('next-day');
const statsViewMain = document.getElementById('stats-view-main');
const statsViewDetail = document.getElementById('stats-view-detail');
const detailItemName = document.getElementById('detail-item-name');
const trendChart = document.getElementById('trend-chart');
const backToStatsBtn = document.getElementById('back-to-stats');
// Trend Nav Elements
const trendPrevBtn = document.getElementById('trend-prev');
const trendNextBtn = document.getElementById('trend-next');
const trendDateRangeEl = document.getElementById('trend-date-range');


// Edit Modal Elements
const editModal = document.getElementById('edit-modal');
const editItemName = document.getElementById('edit-item-name');
const editCountValue = document.getElementById('edit-count-value');
const decreaseCountBtn = document.getElementById('decrease-count');
const increaseCountBtn = document.getElementById('increase-count');
const cancelEditBtn = document.getElementById('cancel-edit');
const saveEditBtn = document.getElementById('save-edit');
const deleteBtn = document.getElementById('delete-item');


// Selected Color State
let selectedColor = 'linear-gradient(135deg, #FF6B6B, #EE5253)'; // default

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    render();
    setupEventListeners();
});

function loadData() {
    const savedItems = localStorage.getItem('habit-items');
    const savedLogs = localStorage.getItem('habit-logs');

    if (savedItems) items = JSON.parse(savedItems);
    if (savedLogs) logs = JSON.parse(savedLogs);
}

function saveData() {
    localStorage.setItem('habit-items', JSON.stringify(items));
    localStorage.setItem('habit-logs', JSON.stringify(logs));
}

function setupEventListeners() {
    // Modals
    addBtn.addEventListener('click', () => {
        newItemInput.value = '';
        addModal.classList.remove('hidden');
        newItemInput.focus();
    });

    cancelAddBtn.addEventListener('click', () => {
        addModal.classList.add('hidden');
    });

    // Color Picker
    colorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            colorBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedColor = btn.style.getPropertyValue('--bg');
        });
    });
    // Set first color as default selected
    if (colorBtns.length > 0) colorBtns[0].click();

    // Add Item Confirm
    confirmAddBtn.addEventListener('click', addItem);

    // Stats
    statsBtn.addEventListener('click', () => {
        currentStatsDate = new Date(); // Reset to today
        showStats();
    });
    closeStatsBtn.addEventListener('click', () => {
        statsModal.classList.add('hidden');
        statsViewMain.classList.remove('hidden');
        statsViewDetail.classList.add('hidden');
    });

    // Date Navigation
    prevDayBtn.addEventListener('click', () => {
        currentStatsDate.setDate(currentStatsDate.getDate() - 1);
        showStats();
    });
    nextDayBtn.addEventListener('click', () => {
        currentStatsDate.setDate(currentStatsDate.getDate() + 1);
        showStats();
    });

    // Detail View Navigation
    backToStatsBtn.addEventListener('click', () => {
        statsViewDetail.classList.add('hidden');
        statsViewMain.classList.remove('hidden');
    });

    // Trend View Navigation
    trendPrevBtn.addEventListener('click', () => {
        currentTrendEndDate.setDate(currentTrendEndDate.getDate() - 7);
        renderTrendChart(currentTrendItemId);
    });

    trendNextBtn.addEventListener('click', () => {
        currentTrendEndDate.setDate(currentTrendEndDate.getDate() + 7);
        renderTrendChart(currentTrendItemId);
    });

    // Edit Modal Buttons
    cancelEditBtn.addEventListener('click', () => {
        editModal.classList.add('hidden');
    });

    decreaseCountBtn.addEventListener('click', () => {
        let val = parseInt(editCountValue.textContent);
        if (val > 0) editCountValue.textContent = val - 1;
    });

    increaseCountBtn.addEventListener('click', () => {
        let val = parseInt(editCountValue.textContent);
        editCountValue.textContent = val + 1;
    });

    saveEditBtn.addEventListener('click', saveEditCount);
    deleteBtn.addEventListener('click', deleteItem);

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === addModal) addModal.classList.add('hidden');
        if (e.target === statsModal) statsModal.classList.add('hidden');
        if (e.target === editModal) editModal.classList.add('hidden');
    });
}

function addItem() {
    const name = newItemInput.value.trim();
    if (!name) return;

    const newItem = {
        id: Date.now().toString(),
        name: name,
        color: selectedColor,
        createdAt: Date.now()
    };

    items.push(newItem);
    saveData();
    render();
    addModal.classList.add('hidden');
}

function track(id, event) {
    if (isLongPress) return; // Prevent track after long press

    logs.push({
        itemId: id,
        timestamp: Date.now()
    });
    saveData();

    // Trigger Ripple
    if (event) {
        createRipple(event);
    }

    render(); // Update counts
}

// Long Press Handling
function handleTouchStart(id) {
    isLongPress = false;
    longPressTimer = setTimeout(() => {
        isLongPress = true;
        openEditModal(id);
        navigator.vibrate(50); // Haptic feedback
    }, 800); // 800ms for long press
}

function handleTouchEnd() {
    clearTimeout(longPressTimer);
}

function openEditModal(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;

    editingItemId = id;
    editingDate = new Date(); // Default edit for today

    const count = getCountForDate(id, editingDate);

    editItemName.textContent = `${item.name} (今日)`;
    editCountValue.textContent = count;

    editModal.classList.remove('hidden');
}

function saveEditCount() {
    if (!editingItemId) return;

    const targetCount = parseInt(editCountValue.textContent);
    const itemLogs = logs.filter(log => log.itemId === editingItemId);
    const dayStart = new Date(editingDate.getFullYear(), editingDate.getMonth(), editingDate.getDate()).getTime();
    const dayEnd = dayStart + 86400000;

    const todayLogs = itemLogs.filter(log => log.timestamp >= dayStart && log.timestamp < dayEnd);
    const currentCount = todayLogs.length;

    if (targetCount > currentCount) {
        // Add logs
        for (let i = 0; i < targetCount - currentCount; i++) {
            logs.push({
                itemId: editingItemId,
                timestamp: dayStart + 43200000 // Noon of that day
            });
        }
    } else if (targetCount < currentCount) {
        // Remove logs but keep others
        logs = logs.filter(log => !(log.itemId === editingItemId && log.timestamp >= dayStart && log.timestamp < dayEnd));
        for (let i = 0; i < targetCount; i++) {
            logs.push({
                itemId: editingItemId,
                timestamp: dayStart + 43200000
            });
        }
    }

    saveData();
    render();
    editModal.classList.add('hidden');
}

function deleteItem() {
    if (!editingItemId) return;

    if (confirm('この習慣とこれまでの記録をすべて削除しますか？\nこの操作は取り消せません。')) {
        items = items.filter(item => item.id !== editingItemId);
        logs = logs.filter(log => log.itemId !== editingItemId);
        saveData();
        render();
        editModal.classList.add('hidden');
    }
}


function createRipple(event) {
    const card = event.currentTarget;
    const ripple = document.createElement('span');
    const rect = card.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.classList.add('ripple');

    card.appendChild(ripple);

    setTimeout(() => {
        ripple.remove();
    }, 600);
}

function getCountForDate(itemId, date) {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const endOfDay = startOfDay + 86400000;

    return logs.filter(log =>
        log.itemId === itemId && log.timestamp >= startOfDay && log.timestamp < endOfDay
    ).length;
}

function render() {
    gridContainer.innerHTML = '';

    // Dynamic Grid Sizing
    if (items.length >= 7) {
        gridContainer.classList.add('grid-3-cols');
    } else {
        gridContainer.classList.remove('grid-3-cols');
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'habit-card';
        card.style.background = item.color;

        const count = getCountForDate(item.id, new Date());

        card.innerHTML = `
            <div class="habit-name">${item.name}</div>
            <div class="habit-count">${count}</div>
        `;

        // Touch events for long press
        card.addEventListener('mousedown', () => handleTouchStart(item.id));
        card.addEventListener('touchstart', () => handleTouchStart(item.id), { passive: true });

        card.addEventListener('mouseup', handleTouchEnd);
        card.addEventListener('touchend', handleTouchEnd);

        card.addEventListener('click', (e) => track(item.id, e));

        gridContainer.appendChild(card);
    });

    gridContainer.appendChild(addBtn);
}

function showStats() {
    // Update Date Display
    currentDateEl.textContent = `${currentStatsDate.getFullYear()}年${currentStatsDate.getMonth() + 1}月${currentStatsDate.getDate()}日`;

    statsList.innerHTML = '';

    if (items.length === 0) {
        statsList.innerHTML = '<li class="stats-item" style="justify-content:center; opacity:0.5;">項目がありません</li>';
        statsModal.classList.remove('hidden');
        return;
    }

    items.forEach(item => {
        const count = getCountForDate(item.id, currentStatsDate);
        const li = document.createElement('li');
        li.className = 'stats-item';
        li.innerHTML = `
            <span>${item.name}</span>
            <span class="stats-count">${count}回</span>
        `;
        li.addEventListener('click', () => showTrend(item.id));
        statsList.appendChild(li);
    });

    statsModal.classList.remove('hidden');
}

function showTrend(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    currentTrendItemId = itemId;
    currentTrendEndDate = new Date(); // Reset to today initially

    detailItemName.textContent = `${item.name} の推移`;
    statsViewMain.classList.add('hidden');
    statsViewDetail.classList.remove('hidden');

    renderTrendChart(itemId);
}

function renderTrendChart(itemId) {
    trendChart.innerHTML = '';
    const days = 7;
    const endDate = currentTrendEndDate;

    // Update labels to show range
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (days - 1));
    trendDateRangeEl.textContent = `${startDate.getMonth() + 1}/${startDate.getDate()} - ${endDate.getMonth() + 1}/${endDate.getDate()}`;

    let maxCount = 0;
    const data = [];

    // Calculate last 7 days ending at endDate
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(endDate);
        d.setDate(endDate.getDate() - i);
        const count = getCountForDate(itemId, d);
        if (count > maxCount) maxCount = count;
        data.push({ date: d, count: count });
    }

    // Render bars
    data.forEach(d => {
        const container = document.createElement('div');
        container.className = 'chart-bar-container';

        const heightPercent = maxCount > 0 ? (d.count / maxCount) * 100 : 0;

        // Date Label (e.g., "2/7")
        const dateLabel = document.createElement('div');
        dateLabel.className = 'chart-label';
        dateLabel.textContent = `${d.date.getMonth() + 1}/${d.date.getDate()}`;

        // Value Label
        const valLabel = document.createElement('div');
        valLabel.className = 'chart-value';
        valLabel.textContent = d.count;

        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.height = `${Math.max(heightPercent, 1)}%`; // Ensure at least a tiny bit visible

        container.appendChild(valLabel);
        container.appendChild(bar);
        container.appendChild(dateLabel);

        trendChart.appendChild(container);
    });
}
