// 1. В начале файла (после объявления переменных)
let map;
let placemarks = [];
let selectedPlacemark = null;

// Функция для определения типа устройства
const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Функция получения иконки по рейтингу (оставляем как было)
const getIconByRating = (rating) => {
  if (rating >= 4) return 'icons/star-green.png';
  if (rating >= 3) return 'icons/star-yellow.png';
  return 'icons/star-red.png';
};

// 2. Добавляем НОВУЮ функцию создания маркеров (вставляем после getIconByRating)
const createPlacemark = (place) => {
  const ratingMatch = place.description.match(/\d\.\d|\d/);
  const rating = ratingMatch ? parseFloat(ratingMatch[0]) : 0;
  
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
      customData: { // Все данные храним здесь
        name: place.name,
        photo: place.photo,
        address: place.address,
        phone: place.phone,
        hours: place.hours,
        reviewLink: place.reviewLink,
        district: place.district,
        rating: rating
      }
    },
    {
      iconLayout: 'default#image',
      iconImageHref: getIconByRating(rating),
      iconImageSize: [30, 30],
      iconImageOffset: [-15, -15],
      hideIconOnBalloonOpen: false
    }
  );

// Подсветка выбранного маркера
const highlightPlacemark = (placemark) => {
  // Сбрасываем подсветку у всех маркеров
  placemarks.forEach(p => {
    p.options.set('iconImageSize', [30, 30]);
    p.options.set('iconImageOffset', [-15, -15]);
  });
  
  // Подсвечиваем выбранный
  if (placemark) {
    placemark.options.set('iconImageSize', [40, 40]);
    placemark.options.set('iconImageOffset', [-20, -20]);
  }
  selectedrk = rk;
};

// Открытие боковой панели (ПК)
const openDesktopSidebar = (place) => {
  document.getElementById('sidebar-title').textContent = place.name;
  document.getElementById('sidebar-image').src = place.photo;
  document.getElementById('sidebar-address').textContent = place.address;
  document.getElementById('sidebar-phone').textContent = place.phone;
  document.getElementById('sidebar-hours').textContent = place.hours;
  document.getElementById('sidebar-rating').textContent = place.description;
  document.getElementById('sidebar-review-link').href = place.reviewLink;
  
  const sidebar = document.getElementById('desktop-sidebar');
  sidebar.classList.remove('hidden');
  sidebar.classList.add('visible');
};

// Открытие нижней панели (мобильные)
const openMobileBottomSheet = (place) => {
  document.getElementById('balloon-title').textContent = place.name;
  document.getElementById('balloon-image').src = place.photo;
  document.getElementById('balloon-address').textContent = place.address;
  document.getElementById('balloon-phone').textContent = place.phone;
  document.getElementById('balloon-hours').textContent = place.hours;
  document.getElementById('balloon-rating').textContent = place.description;
  document.getElementById('balloon-review-link').href = place.reviewLink;
  
  const bottomSheet = document.getElementById('mobile-bottom-sheet');
  bottomSheet.classList.remove('hidden');
  bottomSheet.classList.add('visible');
};

// Закрытие панелей
const closePanels = () => {
  document.getElementById('desktop-sidebar').classList.remove('visible');
  document.getElementById('desktop-sidebar').classList.add('hidden');
  
  document.getElementById('mobile-bottom-sheet').classList.remove('visible');
  document.getElementById('mobile-bottom-sheet').classList.add('hidden');
  
  highlightPlacemark(null);
};

// Обработчик свайпа для мобильной панели
const setupSwipeHandlers = () => {
  const bottomSheet = document.getElementById('mobile-bottom-sheet');
  
  bottomSheet.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
    isDragging = true;
  }, { passive: true });

  bottomSheet.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    
    if (diff > 0) {
      bottomSheet.style.transform = `translateY(${diff}px)`;
    }
  }, { passive: false });

  bottomSheet.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;
    
    const currentY = e.changedTouches[0].clientY;
    const diff = currentY - startY;
    
    if (diff > 100) {
      closePanels();
    }
    bottomSheet.style.transform = '';
  });
};

// Фильтрация маркеров
const filterMarkers = () => {
  const ratingValue = parseFloat(document.getElementById('ratingFilter').value) || 0;
  const districtValue = document.getElementById('districtFilter').value;
  const hoursValue = document.getElementById('hoursFilter').value;
  const searchValue = document.getElementById('searchInput').value.toLowerCase();

  map.geoObjects.removeAll();

  const filtered = placemarks.filter(placemark => {
    const props = placemark.properties.getAll();
    const rating = props.rating;
    const district = props.district;
    const hours = props.hours;
    const name = props.balloonContentHeader.toLowerCase();
    const address = props.originalData.address.toLowerCase();

    const ratingMatch = isNaN(ratingValue) || rating >= ratingValue;
    const districtMatch = districtValue === 'all' || district === districtValue;
    const hoursMatch = hoursValue === 'all' || hours === hoursValue;
    const searchMatch = searchValue === '' || 
                       name.includes(searchValue) || 
                       address.includes(searchValue);

    return ratingMatch && districtMatch && hoursMatch && searchMatch;
  });

  filtered.forEach(placemark => map.geoObjects.add(placemark));
  updateStats(filtered.length);
  closePanels();
};

// Обновление статистики
const updateStats = (count) => {
  document.getElementById('count').textContent = count;
};

// 4. ЗАМЕНЯЕМ старый код загрузки данных в ymaps.ready():
ymaps.ready(() => {
  map = new ymaps.Map('map', {
    center: [55.7558, 37.6173],
    zoom: 12,
    controls: []
  });

  fetch('data.json')
    .then(response => response.json())
    .then(data => {
      data.forEach(place => {
        const placemark = createPlacemark(place); // Используем новую функцию
        placemarks.push(placemark);
        map.geoObjects.add(placemark);
      });
      updateStats(data.length);
    })
    .catch(error => console.error('Data load error:', error));
});
  // 3. Обработчик клика для маркера
  placemark.events.add('click', (e) => {
    try {
      const placeData = e.get('target').properties.get('customData');
      console.log('Marker clicked, data:', placeData); // Для отладки
      
      if (isMobile()) {
        openMobileBottomSheet(placeData);
      } else {
        openDesktopSidebar(placeData);
      }
      
      // Подсветка выбранного маркера
      if (selectedPlacemark) {
        selectedPlacemark.options.set('iconImageSize', [30, 30]);
      }
      e.get('target').options.set('iconImageSize', [40, 40]);
      selectedPlacemark = e.get('target');
      
      map.panTo(e.get('target').geometry.getCoordinates());
      e.preventDefault();
    } catch (err) {
      console.error('Marker click error:', err);
    }
    return false;
  });

  return placemark;
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  setupSwipeHandlers();
  
  // Обработчики интерфейса
  document.getElementById('close-sidebar').addEventListener('click', closePanels);
  document.getElementById('close-balloon').addEventListener('click', closePanels);
  
  // Исправленный обработчик кнопки фильтров
  document.getElementById('toggleFilters').addEventListener('click', function(e) {
    e.stopPropagation();
    const filtersPanel = document.getElementById('filters-panel');
    filtersPanel.classList.toggle('visible');
  });

  // Обработчики фильтров
  document.getElementById('ratingFilter').addEventListener('change', filterMarkers);
  document.getElementById('districtFilter').addEventListener('change', filterMarkers);
  document.getElementById('hoursFilter').addEventListener('change', filterMarkers);
  document.getElementById('searchInput').addEventListener('input', filterMarkers);
  
  // Закрытие фильтров при клике вне панели
  document.addEventListener('click', (e) => {
    const filtersPanel = document.getElementById('filters-panel');
    const toggleBtn = document.getElementById('toggleFilters');
    
    if (!filtersPanel.contains(e.target) && e.target !== toggleBtn) {
      filtersPanel.classList.remove('visible');
    }
  });
});
