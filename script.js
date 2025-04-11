// Основные переменные
let map;
let placemarks = [];
let selectedPlacemark = null;

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

  placemark.events.add('click', (e) => {
    const placeData = e.get('target').properties.get('customData');
    
    if (isMobile()) {
      // Открываем нижнюю панель на мобильных
      document.getElementById('balloon-title').textContent = placeData.name;
      document.getElementById('balloon-image').src = placeData.photo;
      document.getElementById('balloon-address').textContent = placeData.address;
      document.getElementById('balloon-phone').textContent = placeData.phone;
      document.getElementById('balloon-hours').textContent = placeData.hours;
      document.getElementById('balloon-rating').textContent = placeData.description;
      document.getElementById('balloon-review-link').href = placeData.reviewLink;
      
      document.getElementById('mobile-bottom-sheet').classList.remove('hidden');
      document.getElementById('mobile-bottom-sheet').classList.add('visible');
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

// Загрузка карты
ymaps.ready(() => {
  map = new ymaps.Map('map', {
    center: [55.7558, 37.6173],
    zoom: 12,
    controls: []
  });

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

document.getElementById('close-balloon').addEventListener('click', () => {
  document.getElementById('mobile-bottom-sheet').classList.remove('visible');
  document.getElementById('mobile-bottom-sheet').classList.add('hidden');
  if (selectedPlacemark) {
    selectedPlacemark.options.set('iconImageSize', [30, 30]);
    selectedPlacemark = null;
  }
});

// Фильтры
document.getElementById('toggleFilters').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('filters-panel').classList.toggle('visible');
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('#filters-panel') && !e.target.closest('#toggleFilters')) {
    document.getElementById('filters-panel').classList.remove('visible');
  }
});
