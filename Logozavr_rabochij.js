document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadRecords();
    loadHistory();
    loadStats();
    
    // Добавление обработчика двойного клика на историю для удаления записей
    document.getElementById('history-container').addEventListener('dblclick', handleHistoryEntryDblClick);
});

function showTab(tabId) {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    contents.forEach(content => content.classList.remove('active'));
    document.querySelector(`.tab[onclick="showTab('${tabId}')"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

function toggleSpoiler(spoilerId) {
    const spoilerContent = document.getElementById(spoilerId);
    spoilerContent.style.display = spoilerContent.style.display === 'none' || spoilerContent.style.display === '' ? 'block' : 'none';
}

function countAttacks() {
    const logInput = document.getElementById('logInput').value;
    const attackCounts = parseLog(logInput, /Вы совершили нападение на (.+?)\s*\[/g);
    displayResults(attackCounts, 'Результаты нападений:', true);
}

function countMoney() {
    const logInput = document.getElementById('logInput').value;
    const logLines = logInput.split('\n');
    
    // Регулярное выражение для обычных денег (с тремя числами - золото, серебро, медь)
    const goldSilverCopperPattern = /Вы получили:\s*(\d+)\s+(\d+)\s+(\d+)/;
    
    // Регулярное выражение для обычных денег (с двумя числами - серебро, медь)
    const silverCopperPattern = /Вы получили:\s*(\d+)\s+(\d+)(?!\s+\d)/;
    
    // Регулярное выражение для магических денег (с тремя числами - золото, серебро, медь)
    const magicGoldSilverCopperPattern = /Благодаря магическим эффектам, вы сумели обогатиться еще на\s*(\d+)\s+(\d+)\s+(\d+)/;
    
    // Регулярное выражение для магических денег (с двумя числами - серебро, медь)
    const magicSilverCopperPattern = /Благодаря магическим эффектам, вы сумели обогатиться еще на\s*(\d+)\s+(\d+)(?!\s+\d)/;
    
    // Подсчет обычных денег
    const totalCopperGSC = calculateTotalCopper(logLines, goldSilverCopperPattern, true);
    const totalCopperSC = calculateTotalCopper(logLines, silverCopperPattern, false);
    const totalCopper = totalCopperGSC + totalCopperSC;
    
    // Подсчет магических денег
    const magicTotalCopperGSC = calculateTotalCopper(logLines, magicGoldSilverCopperPattern, true);
    const magicTotalCopperSC = calculateTotalCopper(logLines, magicSilverCopperPattern, false);
    const magicTotalCopper = magicTotalCopperGSC + magicTotalCopperSC;
    
    const combinedTotalCopper = totalCopper + magicTotalCopper;

    // Анализируем данные о монстрах
    const monsterData = extractMonsterData(logLines);
    
    // Обновляем статистику монстров
    updateMonsterStats(monsterData);
    
    // Проверяем и обновляем рекорды
    checkAndUpdateMoneyRecords(combinedTotalCopper, monsterData);
    
    // Обновляем отображение статистики по монстрам
    displayMonsterStats();

    const moneyResult = formatMoneyResult(totalCopper, 'Выбито с боев') +
                       formatMoneyResult(magicTotalCopper, 'Благодаря магическим эффектам') +
                       formatMoneyResult(combinedTotalCopper, 'Итого');

    displayMoneyResults(moneyResult, 'Результаты подсчета денег:');
    
    // Добавляем в историю, если превышен рекорд
    addToHistory(combinedTotalCopper);
}

function countItems() {
    const logInput = document.getElementById('logInput').value;
    const selectedItems = Array.from(document.querySelectorAll('.item-checkbox:checked')).map(checkbox => checkbox.value);
    
    if (selectedItems.length === 0) {
        alert('Выберите хотя бы один предмет для поиска.');
        return;
    }
    
    // Создаем счетчик для хранения результатов
    const itemCounts = {};
    
    // Разбиваем лог на строки
    const logLines = logInput.split('\n');
    
    // Перебираем строки лога
    logLines.forEach(line => {
        // Для каждого выбранного предмета проверяем, есть ли он в строке
        selectedItems.forEach(item => {
            // Экранируем специальные символы в названии предмета
            const escapedItem = item.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            
            // Создаем регулярное выражение для конкретного предмета
            const itemRegex = new RegExp(`${escapedItem}\\s+(\\d+)\\s+шт`, 'g');
            
            // Поиск предмета в строке
            let match;
            while ((match = itemRegex.exec(line)) !== null) {
                // Извлекаем количество
                const quantity = parseInt(match[1]) || 1;
                
                // Добавляем к общему счету
                itemCounts[item] = (itemCounts[item] || 0) + quantity;
            }
        });
    });
    
    displayResults(itemCounts, 'Результаты подсчета предметов:', true);
}

function toggleSelectAll() {
    const checkboxes = document.querySelectorAll('.item-checkbox');
    const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
    checkboxes.forEach(checkbox => checkbox.checked = !allChecked);
}

function clearStorage() {
    localStorage.removeItem('itemSettings');
    document.getElementById('itemCheckboxGroup').innerHTML = '';
    alert('Локальное хранилище очищено.');
}

function addItem() {
    const newItemInput = document.getElementById('newItemInput');
    const newItem = newItemInput.value.trim();
    if (newItem && !isItemExists(newItem.toLowerCase())) {
        const checkboxGroup = document.getElementById('itemCheckboxGroup');
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" class="item-checkbox" value="${newItem}"> ${newItem}`;
        checkboxGroup.appendChild(label);
        newItemInput.value = '';
        saveSettings();
    } else {
        alert('Этот предмет уже существует или поле пустое.');
    }
}

function removeSelectedItems() {
    const checkboxes = document.querySelectorAll('.item-checkbox:checked');
    checkboxes.forEach(checkbox => {
        const label = checkbox.parentElement;
        label.remove();
    });
    saveSettings();
}

function isItemExists(item) {
    const checkboxes = document.querySelectorAll('.item-checkbox');
    return Array.from(checkboxes).some(checkbox => checkbox.value.toLowerCase() === item);
}

function importItems(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        const lines = content.split('\n');
        const checkboxGroup = document.getElementById('itemCheckboxGroup');
        
        lines.forEach(line => {
            const item = line.trim();
            if (item && !isItemExists(item.toLowerCase())) {
                const label = document.createElement('label');
                label.innerHTML = `<input type="checkbox" class="item-checkbox" value="${item}"> ${item}`;
                checkboxGroup.appendChild(label);
            }
        });
        
        saveSettings();
        event.target.value = '';
    };
    reader.readAsText(file);
}

function saveSettings() {
    const checkboxes = document.querySelectorAll('.item-checkbox');
    const items = Array.from(checkboxes).map(checkbox => checkbox.value);
    localStorage.setItem('itemSettings', JSON.stringify(items));
}

function loadSettings() {
    try {
        const savedItems = JSON.parse(localStorage.getItem('itemSettings')) || [];
        const checkboxGroup = document.getElementById('itemCheckboxGroup');
        
        savedItems.forEach(item => {
            const label = document.createElement('label');
            label.innerHTML = `<input type="checkbox" class="item-checkbox" value="${item}"> ${item}`;
            checkboxGroup.appendChild(label);
        });
    } catch (error) {
        console.error('Error loading settings:', error);
        localStorage.removeItem('itemSettings');
    }
}

function parseLog(log, pattern) {
    const counts = {};
    let match;
    
    if (pattern.global) {
        // For global regex patterns
        while ((match = pattern.exec(log)) !== null) {
            const name = match[1].trim();
            const quantity = match[2] ? parseInt(match[2]) : 1;
            counts[name] = (counts[name] || 0) + quantity;
        }
    } else {
        // For non-global regex patterns
        const lines = log.split('\n');
        for (const line of lines) {
            match = line.match(pattern);
            if (match) {
                const name = match[1].trim();
                const quantity = match[2] ? parseInt(match[2]) : 1;
                counts[name] = (counts[name] || 0) + quantity;
            }
        }
    }
    
    return counts;
}

function calculateTotalCopper(logLines, pattern, hasGold = false) {
    let totalCopper = 0;
    
    for (const line of logLines) {
        const match = line.match(pattern);
        if (match) {
            if (hasGold) {
                // Если это формат с золотом, серебром и медью
                const gold = parseInt(match[1]) || 0;
                const silver = parseInt(match[2]) || 0;
                const copper = parseInt(match[3]) || 0;
                
                totalCopper += gold * 10000 + silver * 100 + copper;
            } else {
                // Если это формат только с серебром и медью
                const silver = parseInt(match[1]) || 0;
                const copper = parseInt(match[2]) || 0;
                
                totalCopper += silver * 100 + copper;
            }
        }
    }
    
    return totalCopper;
}

function formatMoneyResult(totalCopper, label) {
    const gold = Math.floor(totalCopper / 10000);
    const remainder = totalCopper % 10000;
    const silver = Math.floor(remainder / 100);
    const copper = remainder % 100;

    return `<div>${label}: ${gold} <img src="images/1.svg" class="coin" alt="золото">, ${silver} <img src="images/2.svg" class="coin" alt="серебро">, ${copper} <img src="images/3.svg" class="coin" alt="медь"></div>`;
}

function displayResults(results, title, includeImages = false) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<h2 style="font-weight: bold;">${title}</h2>`; // Заголовок жирным
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexWrap = 'wrap';
    
    let row = document.createElement('div');
    row.style.display = 'flex';
    row.style.width = '100%';

    let count = 0;

    for (const [key, value] of Object.entries(results)) {
        const itemDiv = document.createElement('div');
        itemDiv.style.flex = '1 0 30%'; // Занимает 30% ширины, чтобы вмещать 3 предмета в строке
        itemDiv.style.boxSizing = 'border-box';
        itemDiv.style.padding = '10px'; // Отступы для визуального разделения
        
        // Условие для изменения размера изображения
        const imageSize = title === 'Результаты нападений:' ? '150px' : '50px';
        itemDiv.innerHTML = `${includeImages ? `<img src="images/${key}.gif" class="item-image" style="width: ${imageSize}; height: ${imageSize};" alt="${key}">` : ''} ${key}: ${value}`;
        
        row.appendChild(itemDiv);
        count++;

        // Если добавлено 3 предмета, добавляем строку в контейнер и создаем новую
        if (count % 3 === 0) {
            container.appendChild(row);
            row = document.createElement('div');
            row.style.display = 'flex';
            row.style.width = '100%';
        }
    }

    // Добавляем оставшиеся элементы, если они есть
    if (count % 3 !== 0) {
        container.appendChild(row);
    }

    resultsDiv.appendChild(container);
}

function displayMoneyResults(html, title) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<h2 style="font-weight: bold;">${title}</h2>${html}`; // Заголовок жирным
}

function addCustomData() {
    const customDataInput = document.getElementById('customDataInput');
    const customData = customDataInput.value.trim();
    
    if (!customData) {
        alert('Пожалуйста, введите пример строки для анализа.');
        return;
    }
    
    // Получаем указанный формат данных (обычные деньги или магические)
    const dataFormatSelect = document.getElementById('dataFormatSelect');
    const isMagicFormat = dataFormatSelect.value === 'magic';
    
    // Регулярные выражения для поиска
    const gscRegex = /(\d+)\s+(\d+)\s+(\d+)/; // золото, серебро, медь
    const scRegex = /(\d+)\s+(\d+)(?!\s+\d)/; // серебро, медь
    
    // Пытаемся найти соответствие
    const gscMatch = customData.match(gscRegex);
    const scMatch = !gscMatch && customData.match(scRegex);
    
    if (gscMatch) {
        // Если найдено соответствие с тремя числами (золото, серебро, медь)
        const placeholderText = isMagicFormat 
            ? `Благодаря магическим эффектам, вы сумели обогатиться еще на ${gscMatch[0]}`
            : `Вы получили: ${gscMatch[0]}`;
        
        customDataInput.value = placeholderText;
    } else if (scMatch) {
        // Если найдено соответствие с двумя числами (серебро, медь)
        const placeholderText = isMagicFormat 
            ? `Благодаря магическим эффектам, вы сумели обогатиться еще на ${scMatch[0]}`
            : `Вы получили: ${scMatch[0]}`;
        
        customDataInput.value = placeholderText;
    } else {
        alert('Не удалось найти подходящий формат денег. Пожалуйста, убедитесь, что вы ввели корректные данные.');
    }
}

function loadRecords() {
    try {
        const recordContainer = document.getElementById('record-container');
        const moneyRecord = localStorage.getItem('moneyRecord') || '0';
        
        // Преобразуем общее количество меди в золото, серебро и медь
        const totalCopper = parseInt(moneyRecord);
        const gold = Math.floor(totalCopper / 10000);
        const remainder = totalCopper % 10000;
        const silver = Math.floor(remainder / 100);
        const copper = remainder % 100;
        
        // Создаем строку для отображения рекорда
        const recordHTML = `
            <div>
                <h2>Рекорд:</h2>
                <p>${gold} <img src="images/1.svg" class="coin" alt="золото">, ${silver} <img src="images/2.svg" class="coin" alt="серебро">, ${copper} <img src="images/3.svg" class="coin" alt="медь"></p>
            </div>
        `;
        
        recordContainer.innerHTML = recordHTML;
    } catch (error) {
        console.error('Error loading records:', error);
    }
}

function addToHistory(totalCopper) {
    try {
        // Получаем текущий рекорд
        const currentRecord = parseInt(localStorage.getItem('moneyRecord')) || 0;
        
        // Если новое значение больше рекорда, обновляем рекорд и добавляем в историю
        if (totalCopper > currentRecord) {
            localStorage.setItem('moneyRecord', totalCopper.toString());
            
            // Обновляем отображение рекорда
            loadRecords();
            
            // Получаем текущую историю
            const history = JSON.parse(localStorage.getItem('moneyHistory')) || [];
            
            // Добавляем новую запись в начало массива
            const now = new Date();
            const formattedDate = `${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
            
            history.unshift({
                date: formattedDate,
                amount: totalCopper
            });
            
            // Ограничиваем историю 10 записями
            const limitedHistory = history.slice(0, 10);
            
            // Сохраняем обновленную историю
            localStorage.setItem('moneyHistory', JSON.stringify(limitedHistory));
            
            // Обновляем отображение истории
            loadHistory();
        }
    } catch (error) {
        console.error('Error adding to history:', error);
    }
}

function loadHistory() {
    try {
        const historyContainer = document.getElementById('history-container');
        const history = JSON.parse(localStorage.getItem('moneyHistory')) || [];
        
        if (history.length === 0) {
            historyContainer.innerHTML = '<p>История пуста</p>';
            return;
        }
        
        const historyHTML = history.map((entry, index) => {
            // Преобразуем общее количество меди в золото, серебро и медь
            const totalCopper = entry.amount;
            const gold = Math.floor(totalCopper / 10000);
            const remainder = totalCopper % 10000;
            const silver = Math.floor(remainder / 100);
            const copper = remainder % 100;
            
            return `
                <div class="history-entry" data-index="${index}">
                    <span class="history-date">${entry.date}</span>
                    <span class="history-amount">${gold} <img src="images/1.svg" class="coin" alt="золото">, ${silver} <img src="images/2.svg" class="coin" alt="серебро">, ${copper} <img src="images/3.svg" class="coin" alt="медь"></span>
                </div>
            `;
        }).join('');
        
        historyContainer.innerHTML = `
            <div class="history-header">
                <span>Дата</span>
                <span>Сумма</span>
            </div>
            ${historyHTML}
            <p class="history-hint">Дважды кликните по записи, чтобы удалить её</p>
        `;
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

function handleHistoryEntryDblClick(event) {
    const historyEntry = event.target.closest('.history-entry');
    if (!historyEntry) return;
    
    const index = parseInt(historyEntry.dataset.index);
    if (isNaN(index)) return;
    
    // Спрашиваем подтверждение
    if (confirm('Вы уверены, что хотите удалить эту запись из истории?')) {
        try {
            // Получаем текущую историю
            const history = JSON.parse(localStorage.getItem('moneyHistory')) || [];
            
            // Удаляем запись по индексу
            history.splice(index, 1);
            
            // Сохраняем обновленную историю
            localStorage.setItem('moneyHistory', JSON.stringify(history));
            
            // Если удалили рекорд, обновляем его
            if (index === 0 && history.length > 0) {
                localStorage.setItem('moneyRecord', history[0].amount.toString());
                loadRecords();
            } else if (history.length === 0) {
                localStorage.setItem('moneyRecord', '0');
                loadRecords();
            }
            
            // Обновляем отображение истории
            loadHistory();
        } catch (error) {
            console.error('Error removing history entry:', error);
        }
    }
}

function loadStats() {
    try {
        const statsTab = document.getElementById('stats-tab');
        if (statsTab) {
            // Загружаем статистику предметов, если она существует
            const itemStats = JSON.parse(localStorage.getItem('itemStats')) || {};
            let statsHTML = '<h2 style="font-weight: bold;">Статистика предметов:</h2>';
            
            if (Object.keys(itemStats).length === 0) {
                statsHTML += '<p>Статистика пуста</p>';
            } else {
                statsHTML += '<ul>';
                for (const [item, count] of Object.entries(itemStats)) {
                    statsHTML += `<li>${item}: ${count}</li>`;
                }
                statsHTML += '</ul>';
            }
            
            statsTab.innerHTML = statsHTML;
        }
        
        // Добавляем кнопку сброса статистики по монстрам
        const statsTab = document.getElementById('stats-tab');
        if (statsTab && !document.getElementById('reset-monster-stats-btn')) {
            const resetButton = document.createElement('button');
            resetButton.id = 'reset-monster-stats-btn';
            resetButton.className = 'btn';
            resetButton.textContent = 'Сбросить статистику по монстрам';
            resetButton.onclick = resetMonsterStats;
            statsTab.appendChild(resetButton);
            
            // Создаем контейнер для статистики монстров, если его еще нет
            if (!document.getElementById('monster-stats')) {
                const statsDiv = document.createElement('div');
                statsDiv.id = 'monster-stats';
                statsTab.appendChild(statsDiv);
            }
        }
        
        // Добавляем стили для таблиц
        addMonsterStatsStyles();
        
        // Отображаем статистику монстров
        displayMonsterStats();
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Новая функциональность для отслеживания статистики монстров

// Функция для форматирования меди в золото/серебро/медь (используется для отображения)
function formatCopperToGSC(totalCopper) {
    const gold = Math.floor(totalCopper / 10000);
    const remainder = totalCopper % 10000;
    const silver = Math.floor(remainder / 100);
    const copper = remainder % 100;

    return `${gold} <img src="images/1.svg" class="coin" alt="золото">, ${silver} <img src="images/2.svg" class="coin" alt="серебро">, ${copper} <img src="images/3.svg" class="coin" alt="медь">`;
}

// Функция для извлечения данных о монстрах из лога
function extractMonsterData(logLines) {
    const monsterData = {};
    let currentMonster = null;
    let battleStarted = false;
    let moneyInCurrentBattle = 0;
    let itemsInCurrentBattle = {};
    
    for (let i = 0; i < logLines.length; i++) {
        const line = logLines[i];
        
        // Поиск начала боя с монстром
        const attackMatch = line.match(/Вы совершили нападение на (.+?)\s*\[/);
        if (attackMatch) {
            currentMonster = attackMatch[1].trim();
            battleStarted = true;
            moneyInCurrentBattle = 0;
            itemsInCurrentBattle = {};
            
            if (!monsterData[currentMonster]) {
                monsterData[currentMonster] = {
                    battles: 0,
                    totalMoney: 0,
                    items: {}
                };
            }
            
            monsterData[currentMonster].battles++;
            continue;
        }
        
        if (battleStarted && currentMonster) {
            // Поиск денег (золото, серебро, медь)
            const gscMatch = line.match(/Вы получили:\s*(\d+)\s+(\d+)\s+(\d+)/);
            if (gscMatch) {
                const gold = parseInt(gscMatch[1]) || 0;
                const silver = parseInt(gscMatch[2]) || 0;
                const copper = parseInt(gscMatch[3]) || 0;
                const copperValue = gold * 10000 + silver * 100 + copper;
                
                moneyInCurrentBattle += copperValue;
            }
            
            // Поиск денег (серебро, медь)
            const scMatch = line.match(/Вы получили:\s*(\d+)\s+(\d+)(?!\s+\d)/);
            if (scMatch && !gscMatch) {
                const silver = parseInt(scMatch[1]) || 0;
                const copper = parseInt(scMatch[2]) || 0;
                const copperValue = silver * 100 + copper;
                
                moneyInCurrentBattle += copperValue;
            }
            
            // Поиск магических денег (золото, серебро, медь)
            const magicGscMatch = line.match(/Благодаря магическим эффектам, вы сумели обогатиться еще на\s*(\d+)\s+(\d+)\s+(\d+)/);
            if (magicGscMatch) {
                const gold = parseInt(magicGscMatch[1]) || 0;
                const silver = parseInt(magicGscMatch[2]) || 0;
                const copper = parseInt(magicGscMatch[3]) || 0;
                const copperValue = gold * 10000 + silver * 100 + copper;
                
                moneyInCurrentBattle += copperValue;
            }
            
            // Поиск магических денег (серебро, медь)
            const magicScMatch = line.match(/Благодаря магическим эффектам, вы сумели обогатиться еще на\s*(\d+)\s+(\d+)(?!\s+\d)/);
            if (magicScMatch && !magicGscMatch) {
                const silver = parseInt(magicScMatch[1]) || 0;
                const copper = parseInt(magicScMatch[2]) || 0;
                const copperValue = silver * 100 + copper;
                
                moneyInCurrentBattle += copperValue;
            }
            
            // Поиск предметов
            const itemMatch = line.match(/(?:Получено:|Вами получено)\s+(.+?)\s+(\d+)\s+шт/);
            if (itemMatch) {
                const itemName = itemMatch[1].trim();
                const itemQuantity = parseInt(itemMatch[2]) || 1;
                
                if (!itemsInCurrentBattle[itemName]) {
                    itemsInCurrentBattle[itemName] = {
                        drops: 0,
                        totalQuantity: 0
                    };
                }
                
                itemsInCurrentBattle[itemName].drops++;
                itemsInCurrentBattle[itemName].totalQuantity += itemQuantity;
            }
            
            // Конец боя
            if (line.includes('Окончен бой')) {
                battleStarted = false;
                
                // Добавляем деньги в статистику монстра
                monsterData[currentMonster].totalMoney += moneyInCurrentBattle;
                
                // Добавляем предметы в статистику монстра
                for (const [itemName, itemStats] of Object.entries(itemsInCurrentBattle)) {
                    if (!monsterData[currentMonster].items[itemName]) {
                        monsterData[currentMonster].items[itemName] = {
                            drops: 0,
                            totalQuantity: 0
                        };
                    }
                    
                    monsterData[currentMonster].items[itemName].drops += itemStats.drops;
                    monsterData[currentMonster].items[itemName].totalQuantity += itemStats.totalQuantity;
                }
                
                currentMonster = null;
            }
        }
    }
    
    return monsterData;
}

// Функция для обновления статистики монстров в localStorage
function updateMonsterStats(monsterData) {
    // Получаем текущую статистику из localStorage
    const monsterStats = JSON.parse(localStorage.getItem('monsterStats') || '{}');
    
    // Обновляем статистику для каждого монстра
    for (const [monster, data] of Object.entries(monsterData)) {
        if (!monsterStats[monster]) {
            monsterStats[monster] = {
                battles: 0,
                totalMoney: 0,
                items: {}
            };
        }
        
        monsterStats[monster].battles += data.battles;
        monsterStats[monster].totalMoney += data.totalMoney;
        
        // Обновляем статистику предметов
        for (const [itemName, itemStats] of Object.entries(data.items)) {
            if (!monsterStats[monster].items[itemName]) {
                monsterStats[monster].items[itemName] = {
                    drops: 0,
                    totalQuantity: 0
                };
            }
            
            monsterStats[monster].items[itemName].drops += itemStats.drops;
            monsterStats[monster].items[itemName].totalQuantity += itemStats.totalQuantity;
        }
    }
    
    // Сохраняем обновленную статистику
    localStorage.setItem('monsterStats', JSON.stringify(monsterStats));
}

// Функция для проверки и обновления рекордов денег
function checkAndUpdateMoneyRecords(totalCopper, monsterData) {
    // Получаем текущие рекорды
    const moneyRecords = JSON.parse(localStorage.getItem('moneyRecords') || '{}');
    
    // Проверяем общий рекорд
    if (!moneyRecords.overall || totalCopper > moneyRecords.overall) {
        moneyRecords.overall = totalCopper;
    }
    
    // Проверяем рекорд для каждого монстра
    if (!moneyRecords.monsters) {
        moneyRecords.monsters = {};
    }
    
    for (const [monster, data] of Object.entries(monsterData)) {
        if (data.totalMoney > 0 && (!moneyRecords.monsters[monster] || data.totalMoney > moneyRecords.monsters[monster])) {
            moneyRecords.monsters[monster] = data.totalMoney;
        }
    }
    
    // Сохраняем обновленные рекорды
    localStorage.setItem('moneyRecords', JSON.stringify(moneyRecords));
    
    // Обратная совместимость со старым рекордом
    if (totalCopper > (parseInt(localStorage.getItem('moneyRecord')) || 0)) {
        localStorage.setItem('moneyRecord', totalCopper.toString());
    }
}

// Функция для отображения статистики по монстрам
function displayMonsterStats() {
    const monsterStats = JSON.parse(localStorage.getItem('monsterStats') || '{}');
    const moneyRecords = JSON.parse(localStorage.getItem('moneyRecords') || '{}');
    
    let statsHtml = '<h2 style="font-weight: bold;">Статистика по монстрам:</h2>';
    
    // Проверяем, есть ли данные для отображения
    if (Object.keys(monsterStats).length === 0) {
        statsHtml += '<p>Статистика по монстрам пуста</p>';
        
        // Отображаем статистику
        const statsDiv = document.getElementById('monster-stats');
        if (statsDiv) {
            statsDiv.innerHTML = statsHtml;
        } else {
            const statsTab = document.getElementById('stats-tab') || document.body;
            const newStatsDiv = document.createElement('div');
            newStatsDiv.id = 'monster-stats';
            newStatsDiv.innerHTML = statsHtml;
            statsTab.appendChild(newStatsDiv);
        }
        
        return;
    }
    
    // Создаем таблицу для статистики монстров
    statsHtml += '<table class="monster-stats-table">';
    statsHtml += '<tr><th>Монстр</th><th>Боев</th><th>Всего денег</th><th>Среднее за бой</th><th>Рекорд</th></tr>';
    
    for (const [monster, data] of Object.entries(monsterStats)) {
        const averageMoney = data.battles > 0 ? Math.floor(data.totalMoney / data.battles) : 0;
        const monsterRecord = moneyRecords.monsters && moneyRecords.monsters[monster] ? moneyRecords.monsters[monster] : 0;
        
        statsHtml += `<tr>
            <td>${monster}</td>
            <td>${data.battles}</td>
            <td>${formatCopperToGSC(data.totalMoney)}</td>
            <td>${formatCopperToGSC(averageMoney)}</td>
            <td>${formatCopperToGSC(monsterRecord)}</td>
        </tr>`;
    }
    
    statsHtml += '</table>';
    
    // Добавляем общий рекорд
    const overallRecord = moneyRecords.overall || 0;
    statsHtml += `<h3>Общий рекорд: ${formatCopperToGSC(overallRecord)}</h3>`;
    
    // Добавляем таблицы для предметов каждого монстра
    for (const [monster, data] of Object.entries(monsterStats)) {
        if (Object.keys(data.items).length > 0) {
            statsHtml += `<h3>Предметы с ${monster}:</h3>`;
            statsHtml += '<table class="items-stats-table">';
            statsHtml += '<tr><th>Предмет</th><th>Падений</th><th>Всего штук</th><th>Шанс падения</th><th>Среднее кол-во</th></tr>';
            
            // Сортируем предметы по количеству падений
            const sortedItems = Object.entries(data.items).sort((a, b) => b[1].drops - a[1].drops);
            
            for (const [itemName, itemStats] of sortedItems) {
                const dropChance = (itemStats.drops / data.battles * 100).toFixed(2);
                const averageQuantity = (itemStats.totalQuantity / itemStats.drops).toFixed(2);
                
                statsHtml += `<tr>
                    <td>${itemName}</td>
                    <td>${itemStats.drops}</td>
                    <td>${itemStats.totalQuantity}</td>
                    <td>${dropChance}%</td>
                    <td>${averageQuantity}</td>
                </tr>`;
            }
            
            statsHtml += '</table>';
        }
    }
    
    // Отображаем статистику
    const statsDiv = document.getElementById('monster-stats');
    if (statsDiv) {
        statsDiv.innerHTML = statsHtml;
    } else {
        const statsTab = document.getElementById('stats-tab') || document.body;
        const newStatsDiv = document.createElement('div');
        newStatsDiv.id = 'monster-stats';
        newStatsDiv.innerHTML = statsHtml;
        statsTab.appendChild(newStatsDiv);
    }
}

// Функция для сброса статистики монстров
function resetMonsterStats() {
    if (confirm('Вы уверены, что хотите сбросить всю статистику по монстрам?')) {
        localStorage.removeItem('monsterStats');
        localStorage.removeItem('moneyRecords');
        displayMonsterStats();
        alert('Статистика по монстрам успешно сброшена!');
    }
}

// Добавление стилей для таблиц статистики
function addMonsterStatsStyles() {
    // Проверяем, добавлены ли уже стили
    if (document.getElementById('monster-stats-styles')) {
        return;
    }
    
    const styleElement = document.createElement('style');
    styleElement.id = 'monster-stats-styles';
    styleElement.textContent = `
    .monster-stats-table, .items-stats-table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
    }
    
    .monster-stats-table th, .monster-stats-table td,
    .items-stats-table th, .items-stats-table td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
    }
    
    .monster-stats-table th, .items-stats-table th {
        background-color: #f2f2f2;
        font-weight: bold;
    }
    
    .monster-stats-table tr:nth-child(even), .items-stats-table tr:nth-child(even) {
        background-color: #f9f9f9;
    }
    
    .monster-stats-table tr:hover, .items-stats-table tr:hover {
        background-color: #f1f1f1;
    }
    
    .items-stats-table {
        margin-left: 20px;
        width: 95%;
    }
    `;
    
    document.head.appendChild(styleElement);
}
