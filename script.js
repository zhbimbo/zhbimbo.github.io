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

    // Обработчик клика на маркер
    placemark.events.add('click', (e) => {
        const placeData = e.get('target').properties.get('customData');
        if (isMobile()) {
            openMobilePanel(placeData);
        } else {
            openDesktopSidebar(placeData);
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

// Открытие десктопной панели
const openDesktopSidebar = (placeData) => {
    document.getElementById('sidebar-title').textContent = placeData.name;
    document.getElementById('sidebar-image').src = placeData.photo;
    document.getElementById('sidebar-address').textContent = placeData.address;
    document.getElementById('sidebar-phone').textContent = placeData.phone;
    document.getElementById('sidebar-hours').textContent = placeData.hours;
    document.getElementById('sidebar-rating').textContent = placeData.description;
    document.getElementById('sidebar-review-link').href = placeData.reviewLink;
    document.getElementById('desktop-sidebar').classList.remove('hidden');
    document.getElementById('desktop-sidebar').classList.add('visible');
};

// Открытие мобильной панели
const openMobilePanel = (placeData) => {
    const bottomSheet = document.getElementById('custom-balloon');
    // Заполняем данные
    document.getElementById('balloon-title').textContent = placeData.name;
    document.getElementById('balloon-image').src = placeData.photo;
    document.getElementById('balloon-address').textContent = placeData.address;
    document.getElementById('balloon-phone').textContent = placeData.phone;
    document.getElementById('balloon-hours').textContent = placeData.hours;
    document.getElementById('balloon-rating').textContent = placeData.description;
    document.getElementById('balloon-review-link').href = placeData.reviewLink;

    // Уменьшение фото
    document.getElementById('balloon-image').style.maxWidth = '100px';

    // Показываем панель
    bottomSheet.classList.remove('hidden');
    setTimeout(() => {
        bottomSheet.classList.add('visible');
        bottomSheet.style.transform = 'translateY(-30%)';
    }, 10);
};

// Закрытие мобильной панели
const closeMobilePanel = () => {
    const bottomSheet = document.getElementById('custom-balloon');
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

// Закрытие десктопной панели
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

// Фильтры
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

// Фильтрация маркеров
const filterPlacemarks = () => {
    const ratingFilter = document.getElementById('ratingFilter').value;
    const districtFilter = document.getElementById('districtFilter').value;
    const hoursFilter = document.getElementById('hoursFilter').value;
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();

    placemarks.forEach(placemark => {
        const placeData = placemark.properties.get('customData');
        const rating = parseFloat(placeData.description.match(/\d\.\d|\d/)[0]);
        const matchesRating = ratingFilter === 'all' || rating >= parseFloat(ratingFilter);
        const matchesDistrict = districtFilter === 'all' || placeData.district === districtFilter;
        const matchesHours = hoursFilter === 'all' || placeData.hours === hoursFilter;
        const matchesSearch = placeData.name.toLowerCase().includes(searchQuery);

        placemark.options.set('visible', matchesRating && matchesDistrict && matchesHours && matchesSearch);
    });
};

// Инициализация карты
ymaps.ready(() => {
    map = new ymaps.Map('map', {
        center: [55.7558, 37.6173],
        zoom: 12,
        controls: []
    });

    // Инициализация мобильной панели
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

    // Обработчики событий для фильтров
    document.getElementById('ratingFilter').addEventListener('change', filterPlacemarks);
    document.getElementById('districtFilter').addEventListener('change', filterPlacemarks);
    document.getElementById('hoursFilter').addEventListener('change', filterPlacemarks);
    document.getElementById('searchInput').addEventListener('input', filterPlacemarks);
});

// Настройка свайпа для мобильной панели
const setupBottomSheet = () => {
    const bottomSheet = document.getElementById('custom-balloon');
    const touchZone = bottomSheet.querySelector('#touch-zone');

    touchZone.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        currentY = parseInt(bottomSheet.style.transform.replace('translateY(', '').replace('px)', '')) || 0;
        isDragging = true;
        bottomSheet.style.transition = 'none';
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const y = e.touches[0].clientY;
        const diff = y - startY;
        let newY = currentY + diff;

        // Ограничиваем перемещение
        if (newY > 0) newY = 0;
        if (newY < -window.innerHeight * 0.7) newY = -window.innerHeight * 0.7;

        bottomSheet.style.transform = `translateY(${newY}px)`;
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        bottomSheet.style.transition = 'transform 0.3s ease';

        const y = e.changedTouches[0].clientY;
        const diff = y - startY;
        const currentPos = parseInt(bottomSheet.style.transform.replace('translateY(', '').replace('px)', '')) || 0;

        // Определяем, нужно ли закрыть или открыть полностью
        if (diff > 50 && currentPos < -window.innerHeight * 0.3) {
            closeMobilePanel(); // Закрываем панель при свайпе вниз
        } else if (diff < -50 && currentPos > -window.innerHeight * 0.7) {
            bottomSheet.style.transform = `translateY(${-window.innerHeight * 0.7}px)`; // Открываем панель до 70% экрана
        }
    });
};
