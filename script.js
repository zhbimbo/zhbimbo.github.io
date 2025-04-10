// Глобальные переменные
let map;
let placemarks = [];
let isDragging = false;
let startY = 0;
let selectedPlacemark = null;

// Определение типа устройства
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
         window.innerWidth <= 768;
};

// Получение иконки по рейтингу
const getIconByRating = (rating) => {
  if (rating >= 4) return 'icons/star-green.png';
  if (rating >= 3) return 'icons/star-yellow.png';
  return 'icons/star-red.png';
};

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
  selectedPlacemark = placemark;
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

// Инициализация карты
const initMap = () => {
  ymaps.ready(() => {
    map = new ymaps.Map('map', {
      center: [55.7558, 37.6173],
      zoom: 12,
      controls: []
    });

    // Загрузка данных
    fetch('data.json')
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
      })
      .then(data => {
        data.forEach(place => {
          const ratingMatch = place.description.match(/\d\.\d|\d/);
          const rating = ratingMatch ? parseFloat(ratingMatch[0]) : 0;
          const icon = getIconByRating(rating);

          const placemark = new ymaps.Placemark(
            place.coordinates,
            {
              balloonContentHeader: `<b>${place.name}</b>`,
              balloonContentBody: `
                <img src="${place.photo}" style="max-width:200px;max-height:150px;margin-bottom:10px;">
                <p><b>Адрес:</b> ${place.address}</p>
                <p><b>Телефон:</b> ${place.phone}</p>
                <p><b>Режим работы:</b> ${place.hours}</p>
                <p><b>Рейтинг:</b> ${place.description}</p>
                <a href="${place.reviewLink}" target="_blank">Читать обзор</a>
              `,
              district: place.district,
              hours: place.hours,
              rating: rating,
              originalData: place
            },
            {
              iconLayout: 'default#image',
              iconImageHref: icon,
              iconImageSize: [30, 30],
              iconImageOffset: [-15, -15],
              hideIconOnBalloonOpen: false
            }
          );

          // Обработчик клика
          placemark.events.add('click', function(e) {
            const placeData = this.properties.get('originalData');
            
            if (isMobile()) {
              openMobileBottomSheet(placeData);
            } else {
              openDesktopSidebar(placeData);
            }
            
            highlightPlacemark(this);
            map.panTo(this.geometry.getCoordinates(), {
              flying: true,
              duration: 300
            });
            
            e.preventDefault();
            return false;
          });

          placemarks.push(placemark);
          map.geoObjects.add(placemark);
        });

        updateStats(data.length);
      })
      .catch(error => {
        console.error('Error loading data:', error);
        alert('Ошибка загрузки данных. Проверьте консоль для подробностей.');
      });
  });
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
