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

    const moneyResult = formatMoneyResult(totalCopper, 'Выбито с боев') +
                       formatMoneyResult(magicTotalCopper, 'Благодаря магическим эффектам') +
                       formatMoneyResult(combinedTotalCopper, 'Итого');

    displayMoneyResults(moneyResult, 'Результаты подсчета денег:');
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

function displayMoneyResults(results, title) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<h2 style="font-weight: bold;">${title}</h2>`; // Заголовок жирным
    const div = document.createElement('div');
    div.className = 'results-column';
    div.innerHTML = results;
    resultsDiv.appendChild(div);
    
    // Обновление рекордов денег и истории
    updateMoneyRecords(results);
    addHistoryEntry('money', results);
}

// Обновленная функция displayResults для учета рекордов и истории
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
        const imageSize = title === 'Результаты нападений:' ? '150px' : '50px'; // Условие для размера изображения
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
    
    // Если это результаты нападений, обновляем рекорды
    if (title === 'Результаты нападений:') {
        updateAttackRecords(results);
        addHistoryEntry('attacks', results);
    } else if (title === 'Результаты подсчета предметов:') {
        addHistoryEntry('items', results);
    }
}

// Функция для обновления рекордов нападений
function updateAttackRecords(results) {
    // Загрузка текущих рекордов
    const records = JSON.parse(localStorage.getItem('attack-records') || '{}');
    let updated = false;
    
    // Проверка и обновление рекордов
    for (const [monster, count] of Object.entries(results)) {
        if (!records[monster] || records[monster].count < count) {
            records[monster] = {
                count: count,
                date: new Date().toISOString()
            };
            updated = true;
        }
    }
    
    // Сохранение рекордов и обновление отображения
    if (updated) {
                localStorage.setItem('attack-records', JSON.stringify(records));
        displayAttackRecords();
    }
}

// Функция для обновления рекордов денег
function updateMoneyRecords(resultHTML) {
    // Извлечение итогового значения меди из HTML
    const totalMatch = resultHTML.match(/Итого: (\d+) .+?, (\d+) .+?, (\d+)/);
    const gold = parseInt(totalMatch[1]);
    const silver = parseInt(totalMatch[2]);
    const copper = parseInt(totalMatch[3]);
    const totalCopper = gold * 10000 + silver * 100 + copper;
    
    // Загрузка текущего рекорда
    const record = JSON.parse(localStorage.getItem('money-record') || '{"totalCopper": 0}');
    
    // Проверка и обновление рекорда
    if (totalCopper > record.totalCopper) {
        record.totalCopper = totalCopper;
        record.gold = gold;
        record.silver = silver;
        record.copper = copper;
        record.date = new Date().toISOString();
        
        localStorage.setItem('money-record', JSON.stringify(record));
        displayMoneyRecords();
    }
}

// Функция для отображения рекордов нападений
function displayAttackRecords() {
    const recordsContainer = document.getElementById('attack-records');
    recordsContainer.innerHTML = '';
    
    const records = JSON.parse(localStorage.getItem('attack-records') || '{}');
    const sortedRecords = Object.entries(records).sort((a, b) => b[1].count - a[1].count);
    
    if (sortedRecords.length === 0) {
        recordsContainer.innerHTML = '<p>Нет рекордов</p>';
        return;
    }
    
    for (const [monster, data] of sortedRecords) {
        const recordItem = document.createElement('div');
        recordItem.className = 'record-item';
        
        // Добавление изображения (если есть)
        const img = document.createElement('img');
        img.src = `images/${monster}.gif`;
        img.alt = monster;
        img.className = 'item-image';
        img.style.width = '150px'; // Установка ширины изображения
        img.style.height = '150px'; // Установка высоты изображения
        img.onerror = () => { img.style.display = 'none'; };
        recordItem.appendChild(img);
        
        // Информация о рекорде
        const info = document.createElement('div');
        info.className = 'record-info';
        
        const monsterName = document.createElement('div');
        monsterName.textContent = `${monster}: ${data.count}`;
        info.appendChild(monsterName);
        
        const date = document.createElement('div');
        date.className = 'record-date';
        date.textContent = new Date(data.date).toLocaleDateString();
        info.appendChild(date);
        
        recordItem.appendChild(info);
        
        // Кнопки редактирования и удаления
        const editButton = document.createElement('button');
        editButton.innerHTML = '&#9998;'; // Иконка ручки
        editButton.title = 'Редактировать';
        editButton.onclick = () => editRecord('attack-records', monster);
        recordItem.appendChild(editButton);
        
        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '&#10006;'; // Иконка крестика
        deleteButton.title = 'Удалить';
        deleteButton.onclick = () => deleteRecord('attack-records', monster);
        recordItem.appendChild(deleteButton);
        
        recordsContainer.appendChild(recordItem);
    }
}

// Функция для отображения рекордов денег
function displayMoneyRecords() {
    const recordsContainer = document.getElementById('money-records');
    recordsContainer.innerHTML = '';
    
    const record = JSON.parse(localStorage.getItem('money-record') || '{"totalCopper": 0}');
    
    if (record.totalCopper === 0) {
        recordsContainer.innerHTML = '<p>Нет рекордов</p>';
        return;
    }
    
    const recordItem = document.createElement('div');
    recordItem.className = 'record-item';
    
    // Информация о рекорде
    const info = document.createElement('div');
    info.className = 'record-info';
    
    const moneyAmount = document.createElement('div');
    moneyAmount.innerHTML = `Рекорд: <span class="total-result">${record.gold || 0} <img src="images/1.svg" class="coin" alt="золото">, 
                             ${record.silver || 0} <img src="images/2.svg" class="coin" alt="серебро">, 
                             ${record.copper || 0} <img src="images/3.svg" class="coin" alt="медь"></span>`;
    info.appendChild(moneyAmount);
    
    if (record.date) {
        const date = document.createElement('div');
        date.className = 'record-date';
        date.textContent = new Date(record.date).toLocaleDateString();
        info.appendChild(date);
    }
    
    recordItem.appendChild(info);
    
    // Кнопки редактирования и удаления
    const editButton = document.createElement('button');
    editButton.innerHTML = '&#9998;'; // Иконка ручки
    editButton.title = 'Редактировать';
    editButton.onclick = () => editMoneyRecord();
    recordItem.appendChild(editButton);
    
    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = '&#10006;'; // Иконка крестика
    deleteButton.title = 'Удалить';
    deleteButton.onclick = () => deleteMoneyRecord();
    recordItem.appendChild(deleteButton);
    
    recordsContainer.appendChild(recordItem);
}

// Функция для удаления рекорда нападений
function deleteRecord(recordType, monster) {
    if (confirm(`Вы уверены, что хотите удалить рекорд для ${monster}?`)) {
        const records = JSON.parse(localStorage.getItem(recordType) || '{}');
        delete records[monster];
        localStorage.setItem(recordType, JSON.stringify(records));
        displayAttackRecords(); // Обновляем отображение
    }
}

// Функция для удаления рекорда денег
function deleteMoneyRecord() {
    if (confirm('Вы уверены, что хотите удалить рекорд денег?')) {
        localStorage.removeItem('money-record');
        displayMoneyRecords(); // Обновляем отображение
    }
}

// Функция для редактирования рекорда нападений
function editRecord(recordType, monster) {
    const records = JSON.parse(localStorage.getItem(recordType) || '{}');
    const newCount = prompt(`Введите новое количество для ${monster}:`, records[monster].count);
    
    if (newCount !== null) {
        records[monster].count = parseInt(newCount);
        records[monster].date = new Date().toISOString(); // Обновляем дату
        localStorage.setItem(recordType, JSON.stringify(records));
        displayAttackRecords(); // Обновляем отображение
    }
}

// Функция для редактирования рекорда денег
function editMoneyRecord() {
    const record = JSON.parse(localStorage.getItem('money-record') || '{"totalCopper": 0}');
    const newGold = prompt(`Введите новое количество золота:`, record.gold);
    const newSilver = prompt(`Введите новое количество серебра:`, record.silver);
    const newCopper = prompt(`Введите новое количество меди:`, record.copper);
    
    if (newGold !== null && newSilver !== null && newCopper !== null) {
        record.gold = parseInt(newGold);
        record.silver = parseInt(newSilver);
        record.copper = parseInt(newCopper);
        record.date = new Date().toISOString(); // Обновляем дату
        localStorage.setItem('money-record', JSON.stringify(record));
        displayMoneyRecords(); // Обновляем отображение
    }
}

// Функция для загрузки рекордов при загрузке страницы
function loadRecords() {
    displayAttackRecords();
    displayMoneyRecords();
}

// Функция для очистки рекордов
function clearRecords(recordType) {
    if (recordType === 'attack-records') {
        localStorage.removeItem('attack-records');
        displayAttackRecords();
    } else if (recordType === 'money-record') {
        localStorage.removeItem('money-record');
        displayMoneyRecords();
    }
}

// Функция для добавления записи в историю
function addHistoryEntry(type, data) {
    // Загрузка текущей истории
    let history = JSON.parse(localStorage.getItem('log-history') || '[]');
    
    // Создание новой записи
    const entry = {
        type: type,
        data: data,
        date: new Date().toISOString()
    };
    
    // Добавление записи в историю
    history.unshift(entry);
    
    // Ограничение истории (например, до 100 записей)
    if (history.length > 100) {
        history = history.slice(0, 100);
    }
    
    // Сохранение истории
    localStorage.setItem('log-history', JSON.stringify(history));
    
    // Обновляем отображение истории и статистики
    displayHistory();
    loadStats();
}

// Функция для отображения истории
function displayHistory() {
    const historyContainer = document.getElementById('history-container');
    historyContainer.innerHTML = '';
    
    const history = JSON.parse(localStorage.getItem('log-history') || '[]');
    
    if (history.length === 0) {
        historyContainer.innerHTML = '<p>История пуста</p>';
        return;
    }
    
    // Группировка истории по датам (без учета времени)
    const groupedByDate = {};
    history.forEach(entry => {
        const date = new Date(entry.date).toLocaleDateString();
        if (!groupedByDate[date]) {
            groupedByDate[date] = [];
        }
        groupedByDate[date].push(entry);
    });
    
    // Отображение истории по дням в виде спойлеров
    for (const [date, entries] of Object.entries(groupedByDate)) {
        const historyDay = document.createElement('div');
        historyDay.className = 'history-day';
        
        // Создание заголовка даты (спойлер)
        const dateHeader = document.createElement('div');
        dateHeader.className = 'history-date';
        dateHeader.innerHTML = `${date} <span>(${entries.length} записей)</span>`;
        dateHeader.onclick = function() {
            const entriesDiv = this.nextElementSibling;
            entriesDiv.style.display = entriesDiv.style.display === 'none' || entriesDiv.style.display === '' ? 'block' : 'none';
        };
        historyDay.appendChild(dateHeader);
        
        // Создание контейнера для записей этой даты
        const entriesDiv = document.createElement('div');
        entriesDiv.className = 'history-entries';
        
        // Добавление всех записей для этой даты
        entries.forEach(entry => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'history-entry';
            
            // Время записи
            const timeDiv = document.createElement('div');
            timeDiv.className = 'history-time';
            timeDiv.textContent = new Date(entry.date).toLocaleTimeString();
            entryDiv.appendChild(timeDiv);
            
            // Тип записи
            const typeDiv = document.createElement('div');
            typeDiv.className = 'history-type';
            typeDiv.textContent = getTypeLabel(entry.type);
            entryDiv.appendChild(typeDiv);
            
            // Данные записи
            const dataDiv = document.createElement('div');
            dataDiv.className = 'history-data';
            
            if (entry.type === 'money') {
                // Для денег отображаем только итоговую сумму
                const totalMatch = entry.data.match(/Итого: (\d+) .+?, (\d+) .+?, (\d+)/);
                if (totalMatch) {
                    dataDiv.innerHTML = `${totalMatch[1]} <img src="images/1.svg" class="coin" alt="золото">, 
                                       ${totalMatch[2]} <img src="images/2.svg" class="coin" alt="серебро">, 
                                       ${totalMatch[3]} <img src="images/3.svg" class="coin" alt="медь">`;
                } else {
                    dataDiv.textContent = 'Нет данных';
                }
            } else {
                // Для других типов показываем количество элементов
                const count = Object.keys(entry.data).length;
                dataDiv.textContent = `Элементов: ${count}`;
                
                // Добавляем кнопку "Подробнее" для просмотра всех данных
                const detailsButton = document.createElement('button');
                detailsButton.textContent = 'Подробнее';
                detailsButton.className = 'spoiler-button';
                detailsButton.style.marginLeft = '10px';
                detailsButton.onclick = function() {
                    const detailsDiv = this.nextElementSibling;
                    detailsDiv.style.display = detailsDiv.style.display === 'none' || detailsDiv.style.display === '' ? 'block' : 'none';
                };
                dataDiv.appendChild(detailsButton);
                
                // Создаем скрытый div для подробностей
                const detailsDiv = document.createElement('div');
                detailsDiv.style.display = 'none';
                detailsDiv.style.marginTop = '10px';
                
                const detailsList = document.createElement('ul');
                for (const [key, value] of Object.entries(entry.data)) {
                    const li = document.createElement('li');
                    if (entry.type === 'attacks' || entry.type === 'items') {
                        const img = document.createElement('img');
                        img.src = `images/${key}.gif`;
                        img.alt = key;
                        img.className = 'item-image';
                        img.style.width = '50px';
                        img.style.height = '50px';
                        img.onerror = () => { img.style.display = 'none'; };
                        li.appendChild(img);
                    }
                    li.innerHTML += `${key}: ${value}`;
                    detailsList.appendChild(li);
                }
                detailsDiv.appendChild(detailsList);
                dataDiv.appendChild(detailsDiv);
            }
            
            entryDiv.appendChild(dataDiv);
            entriesDiv.appendChild(entryDiv);
        });
        
        historyDay.appendChild(entriesDiv);
        historyContainer.appendChild(historyDay);
    }
}

// Функция для получения метки типа записи
function getTypeLabel(type) {
    switch(type) {
        case 'attacks': return 'Нападения';
        case 'money': return 'Деньги';
        case 'items': return 'Предметы';
        default: return type;
    }
}

// Функция для загрузки истории при загрузке страницы
function loadHistory() {
    displayHistory();
}

// Функция для очистки истории
function clearHistory() {
    localStorage.removeItem('log-history');
    displayHistory();
}

// Функция обработки двойного щелчка на записи истории
function handleHistoryEntryDblClick(event) {
    // Ищем ближайший родительский элемент с классом history-entry
    const historyEntry = event.target.closest('.history-entry');
    if (!historyEntry) return;
    
    // Запрашиваем подтверждение у пользователя
    if (confirm('Удалить эту запись из истории?')) {
        // Находим индекс записи
        const allEntries = document.querySelectorAll('.history-entry');
        const index = Array.from(allEntries).indexOf(historyEntry);
        
        if (index !== -1) {
            // Загружаем историю
            let history = JSON.parse(localStorage.getItem('log-history') || '[]');
            
            // Определяем, к какой дате относится запись
            const dateContainer = historyEntry.closest('.history-entries');
            const dateEntries = dateContainer.querySelectorAll('.history-entry');
            const entryIndexInDate = Array.from(dateEntries).indexOf(historyEntry);
            
            // Находим дату
            const dateHeader = dateContainer.previousElementSibling;
            const dateText = dateHeader.textContent.split(' (')[0];
            
            // Фильтруем записи по дате и находим нужную
            const entriesForDate = history.filter(entry => {
                return new Date(entry.date).toLocaleDateString() === dateText;
            });
            
            if (entriesForDate.length > entryIndexInDate) {
                // Находим запись в общем массиве
                const entryToRemove = entriesForDate[entryIndexInDate];
                const indexInFullHistory = history.findIndex(entry => entry.date === entryToRemove.date);
                
                if (indexInFullHistory !== -1) {
                    // Удаляем запись
                    history.splice(indexInFullHistory, 1);
                    localStorage.setItem('log-history', JSON.stringify(history));
                    
                    // Обновляем отображение
                    displayHistory();
                }
            }
        }
    }
}

// Функция для загрузки статистики
function loadStats() {
    displayMonstersStats();
    displayMoneyStats();
    displayItemsStats(); // Обновлено для отображения частоты выпадения предметов
}

// Функция для отображения статистики по монстрам
function displayMonstersStats() {
    const statsContainer = document.getElementById('total-monsters-stats');
    const totalStats = getTotalMonstersStats();
    
    if (Object.keys(totalStats).length === 0) {
        statsContainer.innerHTML = '<p>Нет данных о монстрах</p>';
        return;
    }
    
    // Сортируем монстров по количеству убийств (по убыванию)
    const sortedMonsters = Object.entries(totalStats).sort((a, b) => b[1] - a[1]);
    
    let html = '<table class="stats-table">';
    html += '<tr><th>Монстр</th><th>Количество</th></tr>';
    
    for (const [monster, count] of sortedMonsters) {
        html += `<tr>
            <td>
                <img src="images/${monster}.gif" class="item-image" style="width: 30px; height: 30px;" onerror="this.style.display='none'">
                ${monster}
            </td>
            <td>${count}</td>
        </tr>`;
    }
    
    html += '</table>';
    
    // Добавляем общее количество
    const totalCount = sortedMonsters.reduce((sum, [_, count]) => sum + count, 0);
    html += `<p style="text-align: center; color: green; font-weight: bold;"><strong>Всего монстров убито:</strong> ${totalCount}</p>`;
    
    statsContainer.innerHTML = html;
}

// Функция для получения общей статистики по монстрам
function getTotalMonstersStats() {
    // Получаем все записи истории
    const history = JSON.parse(localStorage.getItem('log-history') || '[]');
    
    // Фильтруем только записи типа 'attacks'
    const attackEntries = history.filter(entry => entry.type === 'attacks');
    
    // Создаем общую статистику
    const totalStats = {};
    
    // Суммируем все результаты
    attackEntries.forEach(entry => {
        for (const [monster, count] of Object.entries(entry.data)) {
            totalStats[monster] = (totalStats[monster] || 0) + count;
        }
    });
    
    return totalStats;
}

// Функция для отображения статистики по деньгам
function displayMoneyStats() {
    const statsContainer = document.getElementById('total-money-stats');
    const totalCopper = getTotalMoneyStats();
    
    if (totalCopper === 0) {
        statsContainer.innerHTML = '<p>Нет данных о деньгах</p>';
        return;
    }
    
    // Преобразуем медь в золото, серебро и медь
    const gold = Math.floor(totalCopper / 10000);
    const remainder = totalCopper % 10000;
    const silver = Math.floor(remainder / 100);
    const copper = remainder % 100;
    
    let html = `<p style="text-align: center; color: green; font-weight: bold;"><strong>Всего заработано:</strong></p>`;
    html += `<div class="money-stats" style="text-align: center;">
        ${gold} <img src="images/1.svg" class="coin" alt="золото">, 
        ${silver} <img src="images/2.svg" class="coin" alt="серебро">, 
        ${copper} <img src="images/3.svg" class="coin" alt="медь">
    </div>`;
    
    statsContainer.innerHTML = html;
}

// Функция для получения общей статистики по деньгам
function getTotalMoneyStats() {
    // Получаем все записи истории
    const history = JSON.parse(localStorage.getItem('log-history') || '[]');
    
    // Фильтруем только записи типа 'money'
    const moneyEntries = history.filter(entry => entry.type === 'money');
    
    // Счетчик для общей суммы меди
    let totalCopper = 0;
    
    // Суммируем все результаты
    moneyEntries.forEach(entry => {
        const totalMatch = entry.data.match(/Итого: (\d+) .+?, (\d+) .+?, (\d+)/);
        if (totalMatch) {
            const gold = parseInt(totalMatch[1]) || 0;
            const silver = parseInt(totalMatch[2]) || 0;
            const copper = parseInt(totalMatch[3]) || 0;
            totalCopper += gold * 10000 + silver * 100 + copper;
        }
    });
    
    return totalCopper;
}

// Функция для отображения статистики по предметам
function displayItemsStats() {
    const statsContainer = document.getElementById('total-items-stats');
    const frequencyStats = getTotalItemsStatsWithFrequency();
    
    if (Object.keys(frequencyStats).length === 0) {
        statsContainer.innerHTML = '<p>Нет данных о предметах</p>';
        return;
    }
    
    // Сортируем предметы по количеству выпадений (по убыванию)
    const sortedItems = Object.entries(frequencyStats).sort((a, b) => b[1].count - a[1].count);
    
    let html = '<table class="stats-table">';
    html += '<tr><th>Предмет</th><th>Количество выпадений</th><th>Частота (%)</th><th>Шкала</th></tr>';
    
    for (const [item, data] of sortedItems) {
        html += `<tr>
            <td>
                <img src="images/${item}.gif" class="item-image" style="width: 30px; height: 30px;" onerror="this.style.display='none'">
                ${item}
            </td>
            <td>${data.count}</td>
            <td>${data.frequency}</td>
            <td>
                <div class="scale">
                    <div style="width: ${data.frequency}%;"></div>
                </div>
            </td>
        </tr>`;
    }
    
    html += '</table>';
    
    // Добавляем общее количество
    const totalCount = Object.values(frequencyStats).reduce((sum, data) => sum + data.count, 0);
    html += `<p style="text-align: center; color: green; font-weight: bold;"><strong>Всего предметов собрано:</strong> ${totalCount}</p>`;
    
    statsContainer.innerHTML = html;
}

// Функция для получения общей статистики по предметам с частотой
function getTotalItemsStatsWithFrequency() {
    // Получаем все записи истории
    const history = JSON.parse(localStorage.getItem('log-history') || '[]');
    
    // Фильтруем только записи типа 'items'
    const itemEntries = history.filter(entry => entry.type === 'items');
    
    // Создаем общую статистику
    const totalStats = {};
    
    // Суммируем все результаты
    itemEntries.forEach(entry => {
        for (const [item, count] of Object.entries(entry.data)) {
            totalStats[item] = (totalStats[item] || 0) + count;
        }
    });
    
    // Вычисляем общее количество выпадений
    const totalCount = Object.values(totalStats).reduce((sum, count) => sum + count, 0);
    
    // Создаем объект для хранения частоты
    const frequencyStats = {};
    
    // Вычисляем частоту для каждого предмета
    for (const [item, count] of Object.entries(totalStats)) {
        frequencyStats[item] = {
            count: count,
            frequency: ((count / totalCount) * 100).toFixed(2) // Форматируем до двух знаков после запятой
        };
    }
    
    return frequencyStats;
}

// Функция для очистки всей статистики
function clearAllStats() {
    if (confirm('Вы уверены, что хотите сбросить всю статистику? Это действие нельзя отменить.')) {
        localStorage.removeItem('log-history');
        localStorage.removeItem('attack-records');
        localStorage.removeItem('money-record');
        
        // Обновляем отображение
        loadRecords();
        loadHistory();
        loadStats();
        
        alert('Вся статистика успешно сброшена.');
    }
}