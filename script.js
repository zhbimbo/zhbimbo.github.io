document.addEventListener('DOMContentLoaded', function() {
    let map;
    let placemarks = [];
    const isMobile = window.innerWidth <= 767;

    // Проверка загрузки API Яндекс.Карт
    if (!window.ymaps) {
        console.error('Yandex Maps API не загружен');
        return;
    }

    // Инициализация карты
    ymaps.ready(function() {
        try {
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

            // Альтернативная стилизация через CSS
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

            // Загрузка данных
            loadPlacesData();

        } catch (e) {
            console.error('Ошибка инициализации карты:', e);
            
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
                alert('Не удалось загрузить карту. Пожалуйста, проверьте интернет-соединение и обновите страницу.');
            }
        }
    });

    // Загрузка данных из JSON
    function loadPlacesData() {
        fetch('data.json')
            .then(response => {
                if (!response.ok) throw new Error('Ошибка загрузки данных');
                return response.json();
            })
            .then(data => {
                data.forEach(place => {
                    const placemark = createPlacemark(place);
                    placemarks.push(placemark);
                    map.geoObjects.add(placemark);
                });
                document.getElementById('count').textContent = data.length;
            })
            .catch(error => {
                console.error('Ошибка загрузки данных:', error);
                alert('Не удалось загрузить данные о местах');
            });
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

function isOpenNow(hoursString) {
    if (hoursString === 'Круглосуточно') return true;
    
    try {
        const now = new Date();
        const currentDay = now.getDay(); // 0 - воскресенье, 1 - понедельник и т.д.
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        
        // Разбиваем строку на части по запятым (для разных периодов)
        const periods = hoursString.split(',').map(p => p.trim());
        
        for (const period of periods) {
            // Разделяем дни и время
            const [daysPart, timeRange] = period.split(':').map(s => s.trim());
            if (!timeRange) continue;
            
            // Обрабатываем диапазон времени
            const [openTimeStr, closeTimeStr] = timeRange.split('–').map(s => s.trim());
            
            // Определяем диапазон дней
            let days = [];
            if (daysPart.includes('–')) {
                // Диапазон дней (например, "Пн–Пт")
                const [startDay, endDay] = daysPart.split('–').map(s => s.trim());
                const startIndex = parseDay(startDay);
                const endIndex = parseDay(endDay);
                
                if (endIndex >= startIndex) {
                    // Обычный диапазон (Пн-Пт)
                    for (let i = startIndex; i <= endIndex; i++) {
                        days.push(i);
                    }
                } else {
                    // Диапазон через воскресенье (Сб-Пн)
                    for (let i = startIndex; i <= 6; i++) days.push(i);
                    for (let i = 0; i <= endIndex; i++) days.push(i);
                }
            } else if (daysPart.includes(',')) {
                // Перечисление дней (например, "Пн,Ср,Пт")
                days = daysPart.split(',').map(d => parseDay(d.trim()));
            } else {
                // Один день
                days = [parseDay(daysPart)];
            }
            
            // Проверяем, совпадает ли текущий день
            if (!days.includes(currentDay)) continue;
            
            // Парсим время открытия и закрытия
            const [openHours, openMinutes] = openTimeStr.split(':').map(Number);
            const [closeHours, closeMinutes] = closeTimeStr.split(':').map(Number);
            
            // Создаем даты для сравнения
            const openDate = new Date();
            openDate.setHours(openHours, openMinutes, 0, 0);
            
            const closeDate = new Date();
            closeDate.setHours(closeHours, closeMinutes, 0, 0);
            
            // Если время закрытия меньше времени открытия (например, работает до 5 утра)
            if (closeHours < openHours || (closeHours === openHours && closeMinutes <= openMinutes)) {
                closeDate.setDate(closeDate.getDate() + 1);
            }
            
            // Проверяем, попадает ли текущее время в диапазон
            if (now >= openDate && now <= closeDate) {
                return true;
            }
        }
        
        return false;
    } catch (e) {
        console.error('Ошибка парсинга времени:', e, 'для строки:', hoursString);
        return true; // Если не удалось распарсить, показываем заведение
    }
}

// Вспомогательная функция для преобразования дня недели в число
function parseDay(dayStr) {
    const daysMap = {
        'Пн': 1, 'Понедельник': 1,
        'Вт': 2, 'Вторник': 2,
        'Ср': 3, 'Среда': 3,
        'Чт': 4, 'Четверг': 4,
        'Пт': 5, 'Пятница': 5,
        'Сб': 6, 'Суббота': 6,
        'Вс': 0, 'Воскресенье': 0
    };
    
    return daysMap[dayStr] ?? 0;
}
    // Функция расчета времени до закрытия
// Функция расчета времени до открытия/закрытия с новой логикой
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
        
        // Если время закрытия меньше времени открытия (например, работает до 2 ночи)
        if (closeHours < openHours || (closeHours === openHours && closeMinutes <= openMinutes)) {
            closeDate.setDate(closeDate.getDate() + 1);
        }
        
        // Проверяем, открыто ли заведение сейчас
        const isOpen = now >= openDate && now <= closeDate;
        
        if (!isOpen) {
            // Заведение закрыто - показываем время до открытия
            // Если время открытия уже прошло сегодня, значит оно на завтра
            if (openDate <= now) {
                openDate.setDate(openDate.getDate() + 1);
            }
            
            const diffMs = openDate - now;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            
            if (diffHours > 0) {
                return { 
                    text: `Откроется через ${diffHours} ч ${diffMinutes} мин`, 
                    color: diffHours <= 1 ? '#4CAF50' : '#ff3333', // зеленый за 1 час до открытия
                    type: 'opening'
                };
            } else {
                return { 
                    text: `Откроется через ${diffMinutes} мин`, 
                    color: '#4CAF50', // зеленый когда меньше часа
                    type: 'opening'
                };
            }
        } else {
            // Заведение открыто - показываем время до закрытия только если осталось меньше 3 часов
            const diffMs = closeDate - now;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            
            if (diffHours < 3) {
                if (diffHours > 0) {
                    return { 
                        text: `Закроется через ${diffHours} ч ${diffMinutes} мин`, 
                        color: diffHours <= 1 ? '#ff3333' : '#ff8000', // красный за 1 час до закрытия
                        type: 'closing'
                    };
                } else {
                    return { 
                        text: `Закроется через ${diffMinutes} мин`, 
                        color: '#ff3333', // красный когда меньше часа
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
        const ratingFilter = document.getElementById('ratingFilter').value;
        const districtFilter = document.getElementById('districtFilter').value;
        const hoursFilter = document.getElementById('hoursFilter').value;
        const searchQuery = document.getElementById('searchInput').value.toLowerCase();

        let visibleCount = 0;

        placemarks.forEach(placemark => {
            const data = placemark.properties.get('customData');
            const rating = parseFloat(data.description.split('/')[0]);
            
            const matchesRating = ratingFilter === 'all' || rating >= parseFloat(ratingFilter);
            const matchesDistrict = districtFilter === 'all' || data.district === districtFilter;
            const matchesSearch = data.name.toLowerCase().includes(searchQuery);
            
            // Новая логика фильтрации по времени
            let matchesHours = true;
            if (hoursFilter === 'now') {
                matchesHours = isOpenNow(data.hours);
            } else if (hoursFilter === '24/7') {
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
    });

    document.getElementById('close-sidebar')?.addEventListener('click', function() {
        const sidebar = document.getElementById('desktop-sidebar');
        sidebar.classList.remove('visible');
        setTimeout(() => {
            sidebar.classList.add('hidden');
        }, 500);
    });

    document.getElementById('ratingFilter').addEventListener('change', filterPlacemarks);
    document.getElementById('districtFilter').addEventListener('change', filterPlacemarks);
    document.getElementById('hoursFilter').addEventListener('change', filterPlacemarks);
    document.getElementById('searchInput').addEventListener('input', filterPlacemarks);

    // Геолокация
    document.getElementById('toggleLocation').addEventListener('click', function() {
        if (navigator.geolocation) {
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
                },
                function() {
                    alert("Не удалось определить ваше местоположение");
                }
            );
        } else {
            alert("Геолокация не поддерживается вашим браузером");
        }
    });

    // Обработка свайпа для мобильной панели
    let startY = 0;
    const swipeHandle = document.querySelector('.swipe-handle');
    
    swipeHandle.addEventListener('touchstart', function(e) {
        startY = e.touches[0].clientY;
    }, { passive: true });
    
    swipeHandle.addEventListener('touchmove', function(e) {
        const currentY = e.touches[0].clientY;
        const diff = startY - currentY;
        
        if (diff < 0) {
            const panel = document.getElementById('mobile-bottom-sheet');
            const newPosition = Math.max(-diff, 0);
            panel.style.transform = `translateY(${newPosition}px)`;
            
            if (newPosition > 100) {
                panel.classList.remove('visible');
                setTimeout(() => {
                    panel.classList.add('hidden');
                    panel.style.transform = '';
                }, 300);
            }
        }
    }, { passive: true });
    
    swipeHandle.addEventListener('touchend', function(e) {
        const panel = document.getElementById('mobile-bottom-sheet');
        panel.style.transform = '';
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
});
