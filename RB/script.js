//кнопки
let changeLvl = document.getElementById('changeLvl');
let changeYear = document.getElementById('changeYear');
let clearTxtArea = document.getElementById('clearTxtArea');
let clearSelectedItems = document.getElementById('clearSelectedItems');

//текстовое поле
let txtArea = document.getElementById('txtArea');

//текущие уровни
let lvlsCurr = {
  L: 'base',
  L1: 'base',
  L2: 'base',
  L3: 'base',
  L4: 'base',
};

//уровни до пересчета
let lvlsBefore = Object.assign({}, lvlsCurr);

//РБ текущего года
let retroBonusCurrYear = {
  base: false,
  silver: false,
  gold: false,
  platinum: false,
};

//РБ прошлого года 
let retroBonusPastYear = Object.assign({}, retroBonusCurrYear); 

//ранги уровней для возможности их сравнения
let lvlRang = {
  base: 1,
  silver: 2,
  gold: 3,
  platinum: 4,
};

let retroBonusValue = {
  base: 0,
  silver: 10000,
  gold: 20000,
  platinum: 30000,
};

//переменная для контроля переключения года только 1 раз
let isYearSwitched = false;

//переменная для контроля необходимости проверки спец. условий расчета РБ после проверки общих (проверка пройдет по всем условиям последовательно пока не сработает какое-либо из условий для пересчета РБ)
let isNeedtoCheckElse = false;

//массив для хранения списка заказов
let ordersList = [];

//при открытии страницы очистить значения инпутов
clearForm();
txtArea.value = '';
txtArea.style.height = document.body.offsetHeight - txtArea.offsetTop + 'px';


//клик по кнопке очистки формы
clearSelectedItems.onclick = function () {
  clearForm();
};

//клик по кнопке очистки текста
clearTxtArea.onclick = function () {
  txtArea.value = '';
};

//клик по кнопке перехода на след. год
changeYear.onclick = function () {
  lValue.value ? switchYear(lValue.value) : alert('нужно установить L');
};

//проверка, что нужные значения в селектах выбраны
function chckForm(type) {
  switch (type) {
    case 'common':
    return lvlTypeSelect.value && lvlValueSelect.value && lValue.value ? true : false;

    case 'forOrderChange':
    return ['complete', 'return'].includes(orderAction.value) && orderListForm.value ? true : false;
  }
}

//очистить все выбранные значения формы
function clearForm() {
  for (let i of document.getElementsByTagName('select')) {
    if (i.selectedOptions[0]) {
      i.selectedOptions[0].selected = false;
    }
  }

}

//костыль__ переменная для сохранения уровней от старого до нового
let levelsArr = '';

//клик по кнопке измения уровня
changeLvl.onclick = function () {
   //если было выбрано создание заказа, то создаем заказ и останавливаем скрипт
  if (orderAction.value === 'create') {
    createOrder();
    return false;
  }

  //если не заполнены все нужные селекты, то останавливаем скрипт
  if (!chckForm('common')) {  
    alert('не все значения выбраны');
    return false;
  }

  //сохранить текущие уровни до добавления новых уровней из формы
  saveCurLvls();
  //обновить текущие уровни новыми из формы
  updCurLvls();

  //рассчитать РБ
  isNeedtoCheckElse = true; 
  checkCommonСonditions();
  if (chckForm('forOrderChange')) {
    let order = ordersList[orderListForm.options.selectedIndex];
    if (isNeedtoCheckElse && orderAction.value === 'complete') {
        checkSpecСonditions(order);
    }
    changeOrderStatus(order);
  }
  printRslt('lvlChange');
}

function checkCommonСonditions() {
  //наибольший уровень прошлого года
  let Lpast_py = lvlRang[lvlsBefore.L3] < lvlRang[lvlsBefore.L4] ? lvlsBefore.L4 : lvlsBefore.L3;

  if (lvlRang[lvlsCurr.L1] > lvlRang[lvlsBefore.L]) {
    levelsArr = calcLvlsFromTo(lvlsBefore.L, lvlsCurr.L1);
    correctRB('current', levelsArr, 'add');
  } 
  else if (lvlRang[lvlsCurr.L1] < lvlRang[lvlsBefore.L1]) {
    levelsArr = calcLvlsFromTo(lvlsBefore.L1, lvlsCurr.L1);
    correctRB('current', levelsArr, 'reduce');
  } 
  else if (lvlRang[lvlsCurr.L3] > lvlRang[Lpast_py]) {
    levelsArr = calcLvlsFromTo(Lpast_py, lvlsCurr.L3);
    correctRB('past', levelsArr, 'add');
  } 
  else if (lvlRang[lvlsCurr.L3] < lvlRang[lvlsBefore.L3]) {
    levelsArr = calcLvlsFromTo(lvlsBefore.L3, lvlsCurr.L3);
    correctRB('past', levelsArr, 'reduce');
  }
}

//логика проверки РБ, если явной смены уровня не было, при завершении заказа
function checkSpecСonditions(order) {
  if (order.year === 'current') {
    if (lvlRang[order.curLvlsList.L] < lvlRang[lvlsCurr.L1]) {
      levelsArr = calcLvlsFromTo(order.curLvlsList.L1, lvlsCurr.L1);
      correctRB('current', levelsArr, 'add');
    } 
  }
  else if (order.year === 'past') {
    if (lvlRang[order.curLvlsList.L] < lvlRang[lvlsCurr.L3]) {
      levelsArr = calcLvlsFromTo(order.curLvlsList.L1, lvlsCurr.L3);
      correctRB('past', levelsArr, 'add');
    }
  }
}

//получить перечень уровней между старым и новым
function calcLvlsFromTo(level_1, level_2) {
  let levelIndexFrom = Math.min(lvlRang[level_1], lvlRang[level_2]);
  let levelIndexTo = Math.max(lvlRang[level_1], lvlRang[level_2]);
  let lvlsArr = [];

  for (let i in lvlRang) {
    if (lvlRang[i] > levelIndexFrom && lvlRang[i] <= levelIndexTo) {
      lvlsArr.push(i);
    }
  }
  return lvlsArr;
}

//посчитать РБ (перевести флаг выплаты РБ в противоположное значение)
function correctRB(year, levelsArr, action) {
  let rbLvls = year === 'current' ? retroBonusCurrYear : retroBonusPastYear;
  let targetRbStatus = action === 'add' ? true : false;
  let rbSum = 0;
  for (let i of levelsArr) {
    if (rbLvls[i] != targetRbStatus) {
      rbSum += retroBonusValue[i];
      rbLvls[i] = !rbLvls[i];
    }
  }
  isNeedtoCheckElse = false; 
  printRslt('rbEdit', action, rbSum)
}

//сохранить текущие уровни перед пересчетом
function saveCurLvls() {
  lvlsBefore = Object.assign({}, lvlsCurr);
}

//обновить текущие уровни новым из формы
function updCurLvls() {
  lvlsCurr[lvlTypeSelect.value] = lvlValueSelect.value;
  lvlsCurr.L = lValue.value;
}

//обновить уровни при переходе на следующий год, L надо  указать явно, т.к. нет логики пересчета уровней
function switchYear(L) {
  if (!isYearSwitched) {
    //запомнить уровни текущего года до перехода в след. для их отображения в текстовом поле
    let lvlsBfrYearChange = Object.assign({}, lvlsCurr);
    //накопительный и ручной уровень т.г. делаем уровнями пр.г, устанавливаем L
    lvlsCurr.L = L;
    lvlsCurr.L3 = lvlsCurr.L1;
    lvlsCurr.L1 = 'base';
    lvlsCurr.L4 = lvlsCurr.L2;
    lvlsCurr.L2 = 'base';

    //данные о выплате РБ т.г. добавить в РБ п.г., обнулить показатели выплаты РБ т.г.
    retroBonusPastYear = Object.assign({}, retroBonusCurrYear);
    retroBonusCurrYear = {
      base: false,
      silver: false,
      gold: false,
      platinum: false,
    };

    //у заказов поменять год создания с текущего на прошлый
    for (let order of ordersList) {
        order.year = 'past'
    } 
    //обновить инфу в селекте истории заказрв
    updateOrderListForm();
    //пометка, что переход на след. год уже производился
    isYearSwitched = true;
    printRslt('yearChange', lvlsBfrYearChange)
  }
    else {
    alert('год уже переключался');
  }
}

//создать заказ
function createOrder() {
  let newOrder = {}
  newOrder.id = ordersList.length
  newOrder.year = 'current';
  newOrder.status = 'inWork';
  newOrder.curLvlsList = Object.assign({}, lvlsCurr);
  ordersList.push(newOrder);
  updateOrderListForm();
  printRslt('orderActivity', newOrder.id)
}

//завершить или вернуть заказ
function changeOrderStatus(order) {
order.status = orderAction.value;
order.curLvlsList = Object.assign({}, lvlsCurr);
updateOrderListForm();
printRslt('orderActivity', order.id)
}

//обновить форму с перечнем заказов
function updateOrderListForm(){
orderListForm.innerHTML = '';
for (let order of ordersList) {
  let newOption = `<option value="${order.id}">${order.id}, год: ${order.year}, статус: ${order.status}, ${JSON.stringify(order.curLvlsList)}</option>`;
  orderListForm.insertAdjacentHTML('beforeEnd', newOption);
  }
  
  //подогнать ширину select под ширину самого широкого option
  let maxOptionWidth = 0;
  for (let option of orderListForm.options) {
    maxOptionWidth = Math.max(maxOptionWidth, option.scrollWidth);
  }
  orderListForm.style.width = Math.max(maxOptionWidth + 20, 185) + 'px';
}

function printRslt(eventType, ...arg) {
  let separator = '---' + '\r\n';

  switch (eventType) {
    case 'lvlChange':  
      txtArea.value += "Уровни до: " + JSON.stringify(lvlsBefore) + '\r\n';
      txtArea.value += "Уровни после: " +  JSON.stringify(lvlsCurr) + '\r\n';
      txtArea.value += separator;
    break;

    case 'rbEdit':
      txtArea.value += arg[0] + ' ' + arg[1] + '\r\n';
      txtArea.value += separator;
    break;

    case 'yearChange':
      txtArea.value += "Переход на следующий год" + '\r\n';
      txtArea.value += "Ур. до смены года: " +  JSON.stringify(arg[0]) + '\r\n';
      txtArea.value += "После смены: " +  JSON.stringify(lvlsCurr) + '\r\n'; 
      txtArea.value += "РБ пр.г: " + JSON.stringify(retroBonusPastYear) + '\r\n'
      txtArea.value += "РБ т.г: " + JSON.stringify(retroBonusCurrYear) + '\r\n'
      txtArea.value += separator;
    break;

    case 'orderActivity':
      txtArea.value += orderAction.selectedOptions[0].text + " заказа с ИД " + arg[0] + '\r\n';
      txtArea.value += separator;
    break;
  }
}

//костыль для визуального выделения опций в форме с историей заказов
orderListForm.onblur = function() {
	orderListForm.options[orderListForm.options.selectedIndex].style.backgroundColor = '#cecece'
}

orderListForm.onfocus = function() {
for (let options of orderListForm.options) {
if (options.selectedIndex != orderListForm.options.selectedIndex ) {
	options.style.backgroundColor = 'transparent'
    }
  }
}

//если выбрано создание заказа, то отключить остальные селекты и включить при смене выбора
orderAction.onclick = function() {
  if (orderAction.selectedOptions[0].value == 'create') {
    lvlTypeSelect.disabled = true;
    lvlValueSelect.disabled = true;
    lValue.disabled = true;
  }
  else{
    lvlTypeSelect.disabled = false;
    lvlValueSelect.disabled = false;
    lValue.disabled = false;
  }
}

//вывести в консоль текущие уровни и данные по РБ
document.body.ondblclick = function() {
console.log(`Текущие уровни: ${JSON.stringify(lvlsCurr)} 
РБ т.г: ${JSON.stringify(retroBonusCurrYear)} 
РБ пр.г: ${JSON.stringify(retroBonusPastYear)}`)
}