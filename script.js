// Основные переменные
let map;
let placemarks = [];
let selectedPlacemark = null;
let startY = 0;
let currentY = 0;
let isDragging = false;

// Проверка мобильного устройства
const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Получение иконки для маркера
const getIconByRating = (rating) => {
  if (rating >= 4) return 'icons/star-green.png';
  if (rating >= 3) return 'icons/star-yellow.png';
  return 'icons/star-red.png';
};

// Создание маркера
const createPlacemark = (place) => {
  const rating = parseFloat(place.description.match(/\d\.\d|\d/)[0]);
  
  const placemark = new ymaps.Placemark(
    place.coordinates,
    {
      balloonContentHeader: `<b>${place.name}</b>`,
      balloonContentBody: `
        <img src="${place.photo}" style="max-width:200px;margin-bottom:10px;">
        <p><b>Адрес:</b> ${place.address}</p>
        <p><b>Телефон:</b> ${place.phone}</p>
        <p><b>Режим работы:</b> ${place.hours}</p>
        <p><b>Рейтинг:</b> ${place.description}</p>
        <a href="${place.reviewLink}" target="_blank">Читать обзор</a>
      `,
      customData: place // Сохраняем все данные
    },
    {
      iconLayout: 'default#image',
      iconImageHref: getIconByRating(rating),
      iconImageSize: [30, 30],
      iconImageOffset: [-15, -15]
    }
  );

  // Обработчик клика на маркер (обновлённая часть)
  placemark.events.add('click', (e) => {
    const placeData = e.get('target').properties.get('customData');
    
    if (isMobile()) {
      openMobilePanel(placeData);
    } else {
      // Открываем боковую панель на ПК
      document.getElementById('sidebar-title').textContent = placeData.name;
      document.getElementById('sidebar-image').src = placeData.photo;
      document.getElementById('sidebar-address').textContent = placeData.address;
      document.getElementById('sidebar-phone').textContent = placeData.phone;
      document.getElementById('sidebar-hours').textContent = placeData.hours;
      document.getElementById('sidebar-rating').textContent = placeData.description;
      document.getElementById('sidebar-review-link').href = placeData.reviewLink;
      
      document.getElementById('desktop-sidebar').classList.remove('hidden');
      document.getElementById('desktop-sidebar').classList.add('visible');
    }
    
    // Подсветка маркера
    if (selectedPlacemark) {
      selectedPlacemark.options.set('iconImageSize', [30, 30]);
    }
    e.get('target').options.set('iconImageSize', [40, 40]);
    selectedPlacemark = e.get('target');
    
    // Центрируем карту
    map.panTo(e.get('target').geometry.getCoordinates());
    
    e.preventDefault();
  });

  return placemark;
};

const setupBottomSheet = () => {
  const bottomSheet = document.getElementById('mobile-bottom-sheet');
  const header = bottomSheet.querySelector('#balloon-header');

  header.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
    currentY = parseInt(bottomSheet.style.transform.replace('translateY(', '').replace('px)', '')) || 0; // Исправлено здесь
    isDragging = true;
    bottomSheet.style.transition = 'none';
  }, {passive: true});

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    
    const y = e.touches[0].clientY;
    const diff = y - startY;
    let newY = currentY + diff;
    
    // Ограничиваем перемещение
    if (newY > 0) newY = 0;
    if (newY < -window.innerHeight * 0.7) newY = -window.innerHeight * 0.7;
    
    bottomSheet.style.transform = `translateY(${newY}px)`;
  }, {passive: false});

  document.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;
    bottomSheet.style.transition = 'transform 0.3s ease';
    
    const y = e.changedTouches[0].clientY;
    const diff = y - startY;
    const currentPos = parseInt(bottomSheet.style.transform.replace('translateY(', '').replace('px)', '')) || 0;
    
    // Определяем, нужно ли закрыть или открыть полностью
    if (diff > 50) { // Свайп вниз
      if (currentPos > -window.innerHeight * 0.3) {
        closeMobilePanel();
      } else {
        bottomSheet.style.transform = 'translateY(0)';
      }
    } else if (diff < -50) { // Свайп вверх
      bottomSheet.style.transform = `translateY(${-window.innerHeight * 0.7}px)`;
    }
  });
};

const openMobilePanel = (placeData) => {
  const bottomSheet = document.getElementById('mobile-bottom-sheet');
  
  // Заполняем данные
  document.getElementById('balloon-title').textContent = placeData.name;
  document.getElementById('balloon-image').src = placeData.photo;
  document.getElementById('balloon-address').textContent = placeData.address;
  document.getElementById('balloon-phone').textContent = placeData.phone;
  document.getElementById('balloon-hours').textContent = placeData.hours;
  document.getElementById('balloon-rating').textContent = placeData.description;
  document.getElementById('balloon-review-link').href = placeData.reviewLink;
  
  // Показываем панель
  bottomSheet.classList.remove('hidden');
  setTimeout(() => {
    bottomSheet.classList.add('visible');
    bottomSheet.style.transform = 'translateY(-30%)';
  }, 10);
};

const closeMobilePanel = () => {
  const bottomSheet = document.getElementById('mobile-bottom-sheet');
  bottomSheet.style.transform = 'translateY(100%)';
  setTimeout(() => {
    bottomSheet.classList.remove('visible');
    bottomSheet.classList.add('hidden');
    if (selectedPlacemark) {
      selectedPlacemark.options.set('iconImageSize', [30, 30]);
      selectedPlacemark = null;
    }
  }, 300);
};

// Загрузка карты
ymaps.ready(() => {
  map = new ymaps.Map('map', {
    center: [55.7558, 37.6173],
    zoom: 12,
    controls: []
  });
  
 // 2. Инициализируем мобильную панель (ДОБАВЬТЕ ЭТОТ БЛОК)
  if (isMobile()) {
    setupBottomSheet();
  }
  
  // Загрузка данных
  fetch('data.json')
    .then(response => response.json())
    .then(data => {
      data.forEach(place => {
        const placemark = createPlacemark(place);
        placemarks.push(placemark);
        map.geoObjects.add(placemark);
      });
      document.getElementById('count').textContent = data.length;
    })
    .catch(error => console.error('Ошибка загрузки данных:', error));
});

// Закрытие панелей
document.getElementById('close-sidebar').addEventListener('click', () => {
  document.getElementById('desktop-sidebar').classList.remove('visible');
  document.getElementById('desktop-sidebar').classList.add('hidden');
  
  if (selectedPlacemark) {
    selectedPlacemark.options.set('iconImageSize', [30, 30]);
    selectedPlacemark = null;
  }
});

// Обработчик закрытия мобильной панели
document.getElementById('close-balloon').addEventListener('click', closeMobilePanel);

// Фильтры (исправленный обработчик)
document.getElementById('toggleFilters').addEventListener('click', (e) => {
  e.stopPropagation();
  const filtersPanel = document.getElementById('filters-panel');
  filtersPanel.classList.toggle('visible');
  filtersPanel.style.display = filtersPanel.classList.contains('visible') ? 'block' : 'none';
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('#filters-panel') && !e.target.closest('#toggleFilters')) {
    document.getElementById('filters-panel').classList.remove('visible');
  }
});
