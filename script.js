document.addEventListener('DOMContentLoaded', function() {
    let map;
    let placemarks = [];
    let clusterer;
    const isMobile = window.innerWidth <= 767;

    // Проверка загрузки API Яндекс.Карт
    if (!window.ymaps) {
        console.error('Yandex Maps API не загружен');
        return;
    }

    // Вспомогательные функции для работы со временем
    function parseDays(daysString) {
        const daysMap = {
            'Пн': 1, 'Понедельник': 1,
            'Вт': 2, 'Вторник': 2,
            'Ср': 3, 'Среда': 3,
            'Чт': 4, 'Четверг': 4,
            'Пт': 5, 'Пятница': 5,
            'Сб': 6, 'Суббота': 6,
            'Вс': 0, 'Воскресенье': 0
        };
        
        const result = new Set();
        
        if (daysString.includes('–')) {
            // Диапазон дней
            const [start, end] = daysString.split('–').map(d => d.trim());
            const startDay = daysMap[start];
            const endDay = daysMap[end];
            
            if (startDay !== undefined && endDay !== undefined) {
                if (endDay >= startDay) {
                    for (let i = startDay; i <= endDay; i++) {
                        result.add(i);
                    }
                } else {
                    // Через воскресенье
                    for (let i = startDay; i <= 6; i++) result.add(i);
                    for (let i = 0; i <= endDay; i++) result.add(i);
                }
            }
        } else if (daysString.includes(',')) {
            // Перечисление дней
            daysString.split(',').forEach(day => {
                const trimmed = day.trim();
                if (daysMap[trimmed] !== undefined) {
                    result.add(daysMap[trimmed]);
                }
            });
        } else {
            // Один день
            const day = daysMap[daysString.trim()];
            if (day !== undefined) {
                result.add(day);
            }
        }
        
        return Array.from(result);
    }

    function timeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + (minutes || 0);
    }

    function isOpenNow(hoursString) {
        if (hoursString === 'Круглосуточно') return true;
        
        try {
            const now = new Date();
            const currentDay = now.getDay();
            const currentTime = now.getHours() * 60 + now.getMinutes();
            
            // Приводим к единому формату
            const normalizedHours = hoursString
                .replace(/пн/gi, 'Пн')
                .replace(/вт/gi, 'Вт')
                .replace(/ср/gi, 'Ср')
                .replace(/чт/gi, 'Чт')
                .replace(/пт/gi, 'Пт')
                .replace(/сб/gi, 'Сб')
                .replace(/вс/gi, 'Вс')
                .replace(/понед/gi, 'Понедельник')
                .replace(/вторник/gi, 'Вторник')
                .replace(/среда/gi, 'Среда')
                .replace(/четверг/gi, 'Четверг')
                .replace(/пятница/gi, 'Пятница')
                .replace(/суббота/gi, 'Суббота')
                .replace(/воскресенье/gi, 'Воскресенье');

            // Разбиваем на периоды
            const periods = normalizedHours.split(',').map(p => p.trim());
            
            for (const period of periods) {
                if (!period.includes(':')) continue;
                
                const [daysPart, timeRange] = period.split(':').map(s => s.trim());
                if (!timeRange) continue;
                
                // Парсим дни
                const days = parseDays(daysPart);
                if (!days.includes(currentDay)) continue;
                
                // Парсим время
                const [openTime, closeTime] = timeRange.split('–').map(t => t.trim());
                const openMinutes = timeToMinutes(openTime);
                const closeMinutes = timeToMinutes(closeTime);
                
                if (openMinutes <= closeMinutes) {
                    // Обычный диапазон в пределах одних суток
                    if (currentTime >= openMinutes && currentTime <= closeMinutes) {
                        return true;
                    }
                } else {
                    // Работает через полночь (например, до 5 утра)
                    if (currentTime >= openMinutes || currentTime <= closeMinutes) {
                        return true;
                    }
                }
            }
            
            return false;
        } catch (e) {
            console.error('Ошибка парсинга времени:', e, 'для строки:', hoursString);
            return false;
        }
    }

    function getTimeUntilClosing(hoursString) {
        if (hoursString === 'Круглосуточно') return null;
        
        try {
            const now = new Date();
            const currentDay = now.getDay();
            const currentTime = now.getHours() * 60 + now.getMinutes();
            
            const normalizedHours = hoursString
                .replace(/пн/gi, 'Пn')
                .replace(/вт/gi, 'Вт')
                .replace(/ср/gi, 'Ср')
                .replace(/чт/gi, 'Чт')
                .replace(/пт/gi, 'Пт')
                .replace(/сб/gi, 'Сб')
                .replace(/вс/gi, 'Вс');

            const periods = normalizedHours.split(',').map(p => p.trim());
            
            for (const period of periods) {
                if (!period.includes(':')) continue;
                
                const [daysPart, timeRange] = period.split(':').map(s => s.trim());
                if (!timeRange) continue;
                
                const days = parseDays(daysPart);
                if (!days.includes(currentDay)) continue;
                
                const [openTime, closeTime] = timeRange.split('–').map(t => t.trim());
                const openMinutes = timeToMinutes(openTime);
                const closeMinutes = timeToMinutes(closeTime);
                
                if (openMinutes <= closeMinutes) {
                    // Обычный диапазон
                    if (currentTime >= openMinutes && currentTime <= closeMinutes) {
                        // Открыто сейчас
                        const timeLeft = closeMinutes - currentTime;
                        if (timeLeft <= 180) { // Показывать только если осталось меньше 3 часов
                            const hoursLeft = Math.floor(timeLeft / 60);
                            const minutesLeft = timeLeft % 60;
                            
                            if (hoursLeft > 0) {
                                return { 
                                    text: `Закроется через ${hoursLeft} ч ${minutesLeft} мин`, 
                                    color: hoursLeft <= 1 ? '#ff3333' : '#ff8000',
                                    type: 'closing'
                                };
                            } else {
                                return { 
                                    text: `Закроется через ${minutesLeft} мин`, 
                                    color: '#ff3333',
                                    type: 'closing'
                                };
                            }
                        }
                    } else if (currentTime < openMinutes) {
                        // Ещё не открылось сегодня
                        const timeUntilOpen = openMinutes - currentTime;
                        const hoursLeft = Math.floor(timeUntilOpen / 60);
                        const minutesLeft = timeUntilOpen % 60;
                        
                        if (hoursLeft > 0) {
                            return { 
                                text: `Откроется через ${hoursLeft} ч ${minutesLeft} мин`, 
                                color: hoursLeft <= 1 ? '#4CAF50' : '#ff3333',
                                type: 'opening'
                            };
                        } else {
                            return { 
                                text: `Откроется через ${minutesLeft} мин`, 
                                color: '#4CAF50',
                                type: 'opening'
                            };
                        }
                    }
                } else {
                    // Работает через полночь
                    if (currentTime >= openMinutes || currentTime <= closeMinutes) {
                        // Открыто сейчас
                        let timeLeft;
                        if (currentTime >= openMinutes) {
                            timeLeft = (24 * 60 - currentTime) + closeMinutes;
                        } else {
                            timeLeft = closeMinutes - currentTime;
                        }
                        
                        if (timeLeft <= 180) {
                            const hoursLeft = Math.floor(timeLeft / 60);
                            const minutesLeft = timeLeft % 60;
                            
                            if (hoursLeft > 0) {
                                return { 
                                    text: `Закроется через ${hoursLeft} ч ${minutesLeft} мин`, 
                                    color: hoursLeft <= 1 ? '#ff3333' : '#ff8000',
                                    type: 'closing'
                                };
                            } else {
                                return { 
                                    text: `Закроется через ${minutesLeft} мин`, 
                                    color: '#ff3333',
                                    type: 'closing'
                                };
                            }
                        }
                    } else if (currentTime > closeMinutes && currentTime < openMinutes) {
                        // Закрыто, откроется позже
                        const timeUntilOpen = openMinutes - currentTime;
                        const hoursLeft = Math.floor(timeUntilOpen / 60);
                        const minutesLeft = timeUntilOpen % 60;
                        
                        if (hoursLeft > 0) {
                            return { 
                                text: `Откроется через ${hoursLeft} ч ${minutesLeft} мин`, 
                                color: hoursLeft <= 1 ? '#4CAF50' : '#ff3333',
                                type: 'opening'
                            };
                        } else {
                            return { 
                                text: `Откроется через ${minutesLeft} мин`, 
                                color: '#4CAF50',
                                type: 'opening'
                            };
                        }
                    }
                }
            }
            
            return null;
        } catch (e) {
            console.error('Ошибка расчета времени:', e);
            return null;
        }
    }

    function formatTimeInfo(timeInfo) {
        if (!timeInfo) return '';
        
        let emoji = '';
        if (timeInfo.type === 'closing') {
            emoji = timeInfo.color === '#ff3333' ? '🔴 ' : '🟠 ';
        } else {
            emoji = timeInfo.color === '#4CAF50' ? '🟢 ' : '🔵 ';
        }
        
        return emoji + timeInfo.text;
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

            // Инициализация кластеризатора
            clusterer = new ymaps.Clusterer({
                clusterDisableClickZoom: true,
                clusterOpenBalloonOnClick: false,
                clusterBalloonContentLayout: 'cluster#balloonAccordion',
                clusterBalloonPanelMaxMapArea: 0,
                clusterBalloonContentLayoutWidth: 300,
                clusterBalloonContentLayoutHeight: 200,
                clusterBalloonPagerSize: 5,
                clusterHideIconOnBalloonOpen: false,
                geoObjectHideIconOnBalloonOpen: false,
                clusterIcons: [
                    {
                        href: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjUiIGN5PSIyNSIgcj0iMjUiIGZpbGw9IiNGRjgwMDAiIGZpbGwtb3BhY2l0eT0iMC44Ii8+CjxjaXJjbGUgY3g9IjI1IiBjeT0iMjUiIHI9IjE4IiBmaWxsPSJ3aGl0ZSIvPgo8dGV4dCB4PSIyNSIgeT0iMjgiIGZvbnQtc2l6ZT0iMTYiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjRkY4MDAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj57Y291bnR9PC90ZXh0Pgo8L3N2Zz4=',
                        size: [50, 50],
                        offset: [-25, -25]
                    }
                ]
            });

            map.geoObjects.add(clusterer);

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
                    clusterer.add(placemark);
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
        if (rating >= 2.5) return 'icons/star-yellow.png';
        return 'icons/star-red.png';
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
            timeSpan.textContent = ` (${formatTimeInfo(timeInfo)})`;
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
            timeSpan.textContent = ` (${formatTimeInfo(timeInfo)})`;
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

        // Временно удаляем все метки из кластеризатора
        const allPlacemarks = clusterer.getGeoObjects();
        clusterer.removeAll();

        allPlacemarks.forEach(placemark => {
            const data = placemark.properties.get('customData');
            const rating = parseFloat(data.description.split('/')[0]);
            
            const matchesRating = ratingFilter === 'all' || rating >= parseFloat(ratingFilter);
            const matchesDistrict = districtFilter === 'all' || data.district === districtFilter;
            const matchesSearch = data.name.toLowerCase().includes(searchQuery);
            const matchesHours = hoursFilter === 'all' || 
                               (hoursFilter === 'now' && isOpenNow(data.hours)) ||
                               (hoursFilter === '24/7' && data.hours === 'Круглосуточно');

            if (matchesRating && matchesDistrict && matchesHours && matchesSearch) {
                clusterer.add(placemark);
                visibleCount++;
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
