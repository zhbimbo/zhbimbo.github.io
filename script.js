document.addEventListener('DOMContentLoaded', function() {
    let map;
    let placemarks = [];
    let clusterer;
    const isMobile = window.innerWidth <= 767;
    let currentFilters = {
        rating: 'all',
        district: 'all',
        hours: 'all',
        search: ''
    };

    // Проверка загрузки API Яндекс.Карт
    if (!window.ymaps) {
        console.error('Yandex Maps API не загружен');
        showError('Не удалось загрузить карты. Пожалуйста, проверьте интернет-соединение и обновите страницу.');
        return;
    }

    // Инициализация карты
    ymaps.ready(initMap);

    function initMap() {
        try {
            // Создаем индикатор загрузки
            const loader = showLoading();
            
            // Базовая инициализация карты
            map = new ymaps.Map('map', {
                center: [55.7558, 37.6173],
                zoom: 12,
                controls: [],
                // Опции для плавности
                smoothZoom: true,
                smoothDrag: true,
                inertia: true,
                inertiaDuration: 300
            });

            // Инициализация кластеризатора
            clusterer = new ymaps.Clusterer({
                clusterDisableClickZoom: true,
                clusterOpenBalloonOnClick: false,
                clusterBalloonContentLayout: 'cluster#balloonCarousel',
                clusterBalloonItemContentLayout: 'cluster#balloonCarouselItem',
                clusterIconColor: '#ff4500'
            });

            // Стилизация карты
            const mapContainer = map.container.getElement();
            mapContainer.style.filter = 'hue-rotate(10deg) saturate(1.1)';
            mapContainer.style.borderRadius = '12px';

            // Отключаем стандартные POI
            map.options.set('yandexMapDisablePoiInteractivity', true);

            // Настройки поведения
            const enabledBehaviors = isMobile 
                ? ['multiTouch', 'drag'] 
                : ['scrollZoom', 'rightMouseButtonMagnifier'];
            
            const disabledBehaviors = isMobile
                ? ['scrollZoom', 'rightMouseButtonMagnifier']
                : [];
            
            map.behaviors.enable(enabledBehaviors);
            map.behaviors.disable(disabledBehaviors);

            // Блокировка кликов на фоне
            map.events.add('click', function(e) {
                const target = e.get('target');
                if (!target?.properties) {
                    e.preventDefault();
                    return false;
                }
            });

            // Восстанавливаем фильтры из localStorage
            restoreFilters();
            
            // Загрузка данных
            loadPlacesData()
                .finally(() => hideLoading(loader));

        } catch (e) {
            console.error('Ошибка инициализации карты:', e);
            hideLoading(loader);
            showError('Ошибка при загрузке карты. Пожалуйста, попробуйте позже.');
            
            // Fallback-попытка
            try {
                map = new ymaps.Map('map', {
                    center: [55.7558, 37.6173],
                    zoom: 12,
                    smoothZoom: true,
                    smoothDrag: true,
                    inertia: true
                });
                loadPlacesData();
            } catch (fallbackError) {
                console.error('Fallback инициализация не удалась:', fallbackError);
            }
        }
    }

    // Загрузка данных из JSON
async function loadPlacesData() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        const data = await response.json();
        
        // Проверим структуру данных
        if (!Array.isArray(data)) {
            throw new Error("Данные должны быть массивом");
        }
        
        // Проверим первую запись (если есть)
        if (data.length > 0 && !data[0].coordinates) {
            console.warn("Первая запись не содержит координат:", data[0]);
        }

        localStorage.setItem('cachedPlaces', JSON.stringify(data));
        localStorage.setItem('lastUpdated', Date.now());
        
        processData(data);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        
        // Пробуем загрузить из кэша
        const cachedData = localStorage.getItem('cachedPlaces');
        if (cachedData) {
            console.log("Используем кэшированные данные");
            processData(JSON.parse(cachedData));
        } else {
            showError('Не удалось загрузить данные о местах');
        }
    }
}

function processData(data) {
    // Очищаем старые метки
    if (clusterer) {
        clusterer.removeAll();
    } else {
        clusterer = new ymaps.Clusterer({
            clusterDisableClickZoom: true,
            clusterOpenBalloonOnClick: false,
            clusterIconColor: '#ff4500'
        });
        map.geoObjects.add(clusterer); // Важно: кластеризатор должен быть добавлен на карту!
    }

    placemarks = [];

    if (!data || !Array.isArray(data)) {
        console.error("Данные не являются массивом:", data);
        showError("Ошибка: данные некорректны");
        return;
    }

    // Фильтруем только валидные метки
    const validPlaces = data.filter(place => {
        if (!place.coordinates || !Array.isArray(place.coordinates)) {
            console.warn("Пропущена запись без координат:", place.name);
            return false;
        }
        return true;
    });

    // Создаём метки
    validPlaces.forEach(place => {
        try {
            const placemark = createPlacemark(place);
            placemarks.push(placemark);
            clusterer.add(placemark);
        } catch (e) {
            console.error("Ошибка создания метки для", place.name, ":", e);
        }
    });

    // Обновляем счётчик
    document.getElementById('count').textContent = validPlaces.length;

    // Центрируем карту, если есть метки
    if (validPlaces.length > 0) {
        try {
            const bounds = ymaps.util.bounds.fromPoints(
                validPlaces.map(p => p.coordinates)
            );
            map.setBounds(bounds, { checkZoomRange: true });
        } catch (e) {
            console.error("Ошибка установки границ:", e);
            map.setCenter([55.7558, 37.6173], 12); // Москва по умолчанию
        }
    } else {
        showError("Нет мест для отображения");
    }

    // Применяем фильтры
    filterPlacemarks();
}

    // Создание метки
    function createPlacemark(place) {
        const rating = parseFloat(place.description.split('/')[0]);
        const placemark = new ymaps.Placemark(
            place.coordinates,
            {
                customData: place,
                balloonContentHeader: '',
                balloonContentBody: '',
                balloonContentFooter: ''
            },
            {
                iconLayout: 'default#imageWithContent',
                iconImageHref: getIconByRating(rating),
                iconImageSize: [40, 40],
                iconImageOffset: [-20, -40],
                interactivityModel: 'default#layer',
                hideIconOnBalloonOpen: false,
                balloonInteractivityModel: 'default#opaque'
            }
        );

        // Обработчик клика с анимацией
        placemark.events.add('click', function(e) {
            e.preventDefault();
            const target = e.get('target');
            
            // Анимация клика
            target.options.set('iconImageSize', [36, 36]);
            setTimeout(() => {
                target.options.set('iconImageSize', [40, 40]);
            }, 200);
            
            // Открываем панель
            const placeData = target.properties.get('customData');
            if (isMobile) {
                openMobilePanel(placeData);
            } else {
                openDesktopSidebar(placeData);
            }
            
            return false;
        });

        return placemark;
    }

    // Функция для получения иконки по рейтингу
    function getIconByRating(rating) {
        if (rating >= 4) return 'icons/star-green.png';
        if (rating >= 3) return 'icons/star-yellow.png';
        return 'icons/star-red.png';
    }

    // Функция проверки, работает ли заведение сейчас
    function isOpenNow(hoursString) {
        if (hoursString === 'Круглосуточно') return true;
        
        try {
            const [_, timeRange] = hoursString.split(': ');
            const [openTime, closeTime] = timeRange.split('–');
            
            const now = new Date();
            const currentHours = now.getHours();
            const currentMinutes = now.getMinutes();
            
            // Парсим время открытия
            const [openHours, openMinutes] = openTime.split(':').map(Number);
            
            // Парсим время закрытия
            const [closeHours, closeMinutes] = closeTime.split(':').map(Number);
            
            // Создаем даты для сравнения
            const openDate = new Date();
            openDate.setHours(openHours, openMinutes, 0, 0);
            
            const closeDate = new Date();
            closeDate.setHours(closeHours, closeMinutes, 0, 0);
            
            // Если время закрытия меньше времени открытия (например, работает до 2 ночи)
            if (closeHours < openHours || (closeHours === openHours && closeMinutes <= openMinutes)) {
                closeDate.setDate(closeDate.getDate() + 1);
            }
            
            return now >= openDate && now <= closeDate;
        } catch (e) {
            console.error('Ошибка парсинга времени:', e);
            return true;
        }
    }

    // Функция расчета времени до открытия/закрытия
    function getTimeUntilClosing(hoursString) {
        if (hoursString === 'Круглосуточно') return null;
        
        try {
            const [_, timeRange] = hoursString.split(': ');
            const [openTime, closeTime] = timeRange.split('–');
            
            const [openHours, openMinutes] = openTime.split(':').map(Number);
            const [closeHours, closeMinutes] = closeTime.split(':').map(Number);
            
            const now = new Date();
            const openDate = new Date();
            openDate.setHours(openHours, openMinutes, 0, 0);
            
            const closeDate = new Date();
            closeDate.setHours(closeHours, closeMinutes, 0, 0);
            
            // Если время закрытия меньше времени открытия
            if (closeHours < openHours || (closeHours === openHours && closeMinutes <= openMinutes)) {
                closeDate.setDate(closeDate.getDate() + 1);
            }
            
            // Проверяем, открыто ли заведение сейчас
            const isOpen = now >= openDate && now <= closeDate;
            
            if (!isOpen) {
                // Заведение закрыто - показываем время до открытия
                if (openDate <= now) {
                    openDate.setDate(openDate.getDate() + 1);
                }
                
                const diffMs = openDate - now;
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                
                if (diffHours > 0) {
                    return { 
                        text: `Откроется через ${diffHours} ч ${diffMinutes} мин`, 
                        color: diffHours <= 1 ? '#4CAF50' : '#ff3333',
                        type: 'opening'
                    };
                } else {
                    return { 
                        text: `Откроется через ${diffMinutes} мин`, 
                        color: '#4CAF50',
                        type: 'opening'
                    };
                }
            } else {
                // Заведение открыто - показываем время до закрытия
                const diffMs = closeDate - now;
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                
                if (diffHours < 3) {
                    if (diffHours > 0) {
                        return { 
                            text: `Закроется через ${diffHours} ч ${diffMinutes} мин`, 
                            color: diffHours <= 1 ? '#ff3333' : '#ff8000',
                            type: 'closing'
                        };
                    } else {
                        return { 
                            text: `Закроется через ${diffMinutes} мин`, 
                            color: '#ff3333',
                            type: 'closing'
                        };
                    }
                }
            }
            
            return null;
        } catch (e) {
            console.error('Ошибка расчета времени:', e);
            return null;
        }
    }

    // Функция открытия мобильной панели
    function openMobilePanel(placeData) {
        const rating = parseFloat(placeData.description.split('/')[0]);
        
        document.querySelector('.balloon-title').textContent = placeData.name;
        document.querySelector('.balloon-image').src = placeData.photo;
        document.querySelector('.balloon-address').textContent = placeData.address;
        document.querySelector('.balloon-phone').textContent = placeData.phone;
        document.querySelector('.balloon-hours').textContent = placeData.hours;
        document.querySelector('.balloon-district').textContent = placeData.district;
        document.querySelector('.balloon-review-link').href = placeData.reviewLink;
        document.querySelector('.balloon-rating-badge').textContent = rating.toFixed(1);
        
        // Очищаем предыдущее время до закрытия
        const hoursElement = document.querySelector('.balloon-hours');
        hoursElement.querySelector('span')?.remove();
        
        // Добавляем информацию о времени до закрытия
        const timeInfo = getTimeUntilClosing(placeData.hours);
        if (timeInfo) {
            const timeSpan = document.createElement('span');
            timeSpan.textContent = ` (${timeInfo.text})`;
            timeSpan.style.color = timeInfo.color;
            timeSpan.style.fontWeight = '500';
            hoursElement.appendChild(timeSpan);
        }
        
        const mobileSheet = document.getElementById('mobile-bottom-sheet');
        mobileSheet.classList.remove('hidden');
        setTimeout(() => {
            mobileSheet.classList.add('visible');
        }, 10);
        
        // Добавляем оверлей
        document.getElementById('map-overlay').classList.remove('hidden');
    }

    // Функция открытия десктопного сайдбара
    function openDesktopSidebar(placeData) {
        const rating = parseFloat(placeData.description.split('/')[0]);
        
        document.getElementById('sidebar-title').textContent = placeData.name;
        document.getElementById('sidebar-image').src = placeData.photo;
        document.getElementById('sidebar-address').textContent = placeData.address;
        document.getElementById('sidebar-phone').textContent = placeData.phone;
        document.getElementById('sidebar-hours').textContent = placeData.hours;
        document.getElementById('sidebar-district').textContent = placeData.district;
        document.getElementById('sidebar-review-link').href = placeData.reviewLink;
        document.getElementById('sidebar-rating-badge').textContent = rating.toFixed(1);
        
        // Очищаем предыдущее время до закрытия
        const hoursElement = document.getElementById('sidebar-hours');
        hoursElement.querySelector('span')?.remove();
        
        // Добавляем информацию о времени до закрытия
        const timeInfo = getTimeUntilClosing(placeData.hours);
        if (timeInfo) {
            const timeSpan = document.createElement('span');
            timeSpan.textContent = ` (${timeInfo.text})`;
            timeSpan.style.color = timeInfo.color;
            timeSpan.style.fontWeight = '500';
            hoursElement.appendChild(timeSpan);
        }
                
        const sidebar = document.getElementById('desktop-sidebar');
        sidebar.classList.remove('hidden');
        setTimeout(() => {
            sidebar.classList.add('visible');
        }, 10);
    }

       // Фильтрация заведений
    function filterPlacemarks() {
        currentFilters = {
            rating: document.getElementById('ratingFilter').value,
            district: document.getElementById('districtFilter').value,
            hours: document.getElementById('hoursFilter').value,
            search: document.getElementById('searchInput').value.toLowerCase()
        };
        
        localStorage.setItem('filters', JSON.stringify(currentFilters));
        
        let visibleCount = 0;

        placemarks.forEach(placemark => {
            const data = placemark.properties.get('customData');
            const rating = parseFloat(data.description.split('/')[0]);
            
            const matchesRating = currentFilters.rating === 'all' || rating >= parseFloat(currentFilters.rating);
            const matchesDistrict = currentFilters.district === 'all' || data.district === currentFilters.district;
            const matchesSearch = data.name.toLowerCase().includes(currentFilters.search);
            
            let matchesHours = true;
            if (currentFilters.hours === 'now') {
                matchesHours = isOpenNow(data.hours);
            } else if (currentFilters.hours === '24/7') {
                matchesHours = data.hours === 'Круглосуточно';
            }

            if (matchesRating && matchesDistrict && matchesHours && matchesSearch) {
                placemark.options.set('visible', true);
                visibleCount++;
            } else {
                placemark.options.set('visible', false);
            }
        });

        document.getElementById('count').textContent = visibleCount;
        
        // Для обновления кластеров просто удалите и добавьте их снова
        clusterer.removeAll();
        placemarks.forEach(pm => {
            if (pm.options.get('visible')) {
                clusterer.add(pm);
            }
        });
    }

    // Восстановление фильтров
    function restoreFilters() {
        const savedFilters = localStorage.getItem('filters');
        if (savedFilters) {
            currentFilters = JSON.parse(savedFilters);
            document.getElementById('ratingFilter').value = currentFilters.rating;
            document.getElementById('districtFilter').value = currentFilters.district;
            document.getElementById('hoursFilter').value = currentFilters.hours;
            document.getElementById('searchInput').value = currentFilters.search;
        }
    }

    // Показать индикатор загрузки
    function showLoading() {
        const loader = document.createElement('div');
        loader.className = 'loading-indicator';
        loader.textContent = 'Загрузка данных...';
        document.getElementById('map').appendChild(loader);
        return loader;
    }

    // Скрыть индикатор загрузки
    function hideLoading(loader) {
        if (loader) loader.remove();
    }

    // Показать ошибку
    function showError(message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        errorElement.style.position = 'absolute';
        errorElement.style.top = '50%';
        errorElement.style.left = '50%';
        errorElement.style.transform = 'translate(-50%, -50%)';
        errorElement.style.zIndex = '1000';
        errorElement.style.background = 'rgba(255, 255, 255, 0.9)';
        errorElement.style.padding = '15px 25px';
        errorElement.style.borderRadius = '20px';
        errorElement.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.2)';
        errorElement.style.color = '#ff4500';
        errorElement.style.fontWeight = '500';
        document.getElementById('map').appendChild(errorElement);
        
        setTimeout(() => {
            errorElement.remove();
        }, 5000);
    }

    // Обработчики событий
    document.getElementById('toggleFilters').addEventListener('click', function(e) {
        e.stopPropagation();
        const filtersPanel = document.getElementById('filters-panel');
        filtersPanel.classList.toggle('hidden');
        filtersPanel.classList.toggle('visible');
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('#filters-panel') && !e.target.closest('#toggleFilters')) {
            document.getElementById('filters-panel').classList.add('hidden');
            document.getElementById('filters-panel').classList.remove('visible');
        }
    });

    document.querySelector('.close-balloon')?.addEventListener('click', function() {
        const mobileSheet = document.getElementById('mobile-bottom-sheet');
        mobileSheet.classList.remove('visible');
        setTimeout(() => {
            mobileSheet.classList.add('hidden');
        }, 400);
        document.getElementById('map-overlay').classList.add('hidden');
    });

    document.getElementById('close-sidebar')?.addEventListener('click', function() {
        const sidebar = document.getElementById('desktop-sidebar');
        sidebar.classList.remove('visible');
        setTimeout(() => {
            sidebar.classList.add('hidden');
        }, 500);
    });

    // Быстрый поиск по району
    document.querySelectorAll('#districtFilter option').forEach(option => {
        if (option.value !== 'all') {
            option.addEventListener('click', function() {
                const districtName = option.textContent;
                ymaps.geocode(districtName, { results: 1 }).then(res => {
                    const firstGeoObject = res.geoObjects.get(0);
                    if (firstGeoObject) {
                        map.setCenter(firstGeoObject.geometry.getCoordinates(), 13);
                    }
                });
            });
        }
    });

    document.getElementById('ratingFilter').addEventListener('change', filterPlacemarks);
    document.getElementById('districtFilter').addEventListener('change', filterPlacemarks);
    document.getElementById('hoursFilter').addEventListener('change', filterPlacemarks);
    document.getElementById('searchInput').addEventListener('input', filterPlacemarks);

    // Геолокация
    document.getElementById('toggleLocation').addEventListener('click', function() {
        if (navigator.geolocation) {
            const loader = showLoading();
            
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    map.setCenter([position.coords.latitude, position.coords.longitude], 14);
                    
                    const placemark = new ymaps.Placemark(
                        [position.coords.latitude, position.coords.longitude],
                        {},
                        {
                            iconLayout: 'default#image',
                            iconImageHref: 'https://cdn-icons-png.flaticon.com/512/149/149060.png',
                            iconImageSize: [32, 32],
                            iconImageOffset: [-16, -16]
                        }
                    );
                    map.geoObjects.add(placemark);
                    setTimeout(() => {
                        map.geoObjects.remove(placemark);
                    }, 5000);
                    
                    hideLoading(loader);
                },
                function() {
                    hideLoading(loader);
                    showError("Не удалось определить ваше местоположение");
                }
            );
        } else {
            showError("Геолокация не поддерживается вашим браузером");
        }
    });

    // Обработка свайпа для мобильной панели
    let startY = 0;
    const swipeHandle = document.querySelector('.swipe-handle');
    const mobileSheet = document.getElementById('mobile-bottom-sheet');
    const mapOverlay = document.getElementById('map-overlay');
    
    swipeHandle.addEventListener('touchstart', function(e) {
        startY = e.touches[0].clientY;
    }, { passive: true });
    
    swipeHandle.addEventListener('touchmove', function(e) {
        const currentY = e.touches[0].clientY;
        const diff = startY - currentY;
        
        if (diff < 0) {
            const newPosition = Math.min(Math.abs(diff), 100);
            mobileSheet.style.transform = `translateY(${newPosition}px)`;
            
            // Затемнение фона при свайпе
            const opacity = 0.7 * (1 - newPosition / 100);
            mapOverlay.style.opacity = opacity;
            
            if (newPosition > 100) {
                mobileSheet.classList.remove('visible');
                setTimeout(() => {
                    mobileSheet.classList.add('hidden');
                    mobileSheet.style.transform = '';
                    mapOverlay.classList.add('hidden');
                }, 300);
            }
        }
    }, { passive: true });
    
    swipeHandle.addEventListener('touchend', function(e) {
        mobileSheet.style.transform = '';
        mapOverlay.style.opacity = '0.7';
    }, { passive: true });

    // Touch-оптимизации для мобильных устройств
    if (isMobile) {
        document.getElementById('map').addEventListener('touchmove', function(e) {
            e.stopPropagation();
        }, { passive: true });

        document.addEventListener('gesturestart', function(e) {
            e.preventDefault();
        });
    }
}); // Закрываем document.addEventListener('DOMContentLoaded')
