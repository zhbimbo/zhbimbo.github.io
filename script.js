document.addEventListener('DOMContentLoaded', function() {
    let map;
    let placemarks = [];
    const isMobile = window.innerWidth <= 767;

    // Инициализация карты
    ymaps.ready(init);

    function init() {
        map = new ymaps.Map('map', {
            center: [55.7558, 37.6173],
            zoom: 12,
            controls: []
        });

        // Отключаем всплывающие балуны на всех устройствах
        map.options.set('suppressMapOpenBlock', true);

        // Загрузка данных из JSON
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
    }

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
            iconImageSize: [48, 48],
            iconImageOffset: [-24, -48],
            balloonCloseButton: false,
            hideIconOnBalloonOpen: false,
            balloonInteractivityModel: 'default#opaque'
        }
    );

    // Анимация при клике
placemark.events.add('click', function(e) {
    try {
        e.preventDefault();
        const target = e.get('target');
        const placeData = target.properties.get('customData');

        // Сбрасываем анимацию у всех маркеров
        placemarks.forEach(pm => {
            pm.options.set('iconImageHref', getIconByRating(
                parseFloat(pm.properties.get('customData').description.split('/')[0])
            );
        });

        // Анимируем текущий маркер
        target.options.set('iconImageHref', 'icons/star-orange.png');
        
        // Открываем соответствующую панель
        if (isMobile) {
            openMobilePanel(placeData);
        } else {
            openDesktopSidebar(placeData);
        }

        // Возвращаем стандартную иконку через 1.5 секунды
        setTimeout(() => {
            target.options.set('iconImageHref', getIconByRating(
                parseFloat(placeData.description.split('/')[0])
            ));
        }, 1500);

        return false;
    } catch (error) {
        console.error('Ошибка в обработчике маркера:', error);
        return false;
    }
});

    return placemark;
}

    // Используем ваши иконки
    function getIconByRating(rating) {
        if (rating >= 4) return 'icons/star-green.png';
        if (rating >= 3) return 'icons/star-yellow.png';
        return 'icons/star-red.png';
    }

    function openMobilePanel(placeData) {
        const rating = parseFloat(placeData.description.split('/')[0]);
        
        // Добавляем проверку на существование элементов
        const mobileSheet = document.getElementById('mobile-bottom-sheet');
        if (!mobileSheet) return;
        
        document.querySelector('.balloon-title').textContent = placeData.name;
        document.querySelector('.balloon-image').src = placeData.photo;
        document.querySelector('.balloon-address').textContent = placeData.address;
        document.querySelector('.balloon-phone').textContent = placeData.phone;
        document.querySelector('.balloon-hours').textContent = placeData.hours;
        document.querySelector('.balloon-district').textContent = placeData.district;
        document.querySelector('.balloon-review-link').href = placeData.reviewLink;
        document.querySelector('.balloon-rating-badge').textContent = rating.toFixed(1);
        
        mobileSheet.classList.remove('hidden');
        setTimeout(() => {
            mobileSheet.classList.add('visible');
        }, 10);
    }

    function openDesktopSidebar(placeData) {
        const rating = parseFloat(placeData.description.split('/')[0]);
        
        // Добавляем проверку на существование элементов
        const sidebar = document.getElementById('desktop-sidebar');
        if (!sidebar) return;
        
        document.getElementById('sidebar-title').textContent = placeData.name;
        document.getElementById('sidebar-image').src = placeData.photo;
        document.getElementById('sidebar-address').textContent = placeData.address;
        document.getElementById('sidebar-phone').textContent = placeData.phone;
        document.getElementById('sidebar-hours').textContent = placeData.hours;
        document.getElementById('sidebar-district').textContent = placeData.district;
        document.getElementById('sidebar-review-link').href = placeData.reviewLink;
        document.getElementById('sidebar-rating-badge').textContent = rating.toFixed(1);
        
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
            const matchesHours = hoursFilter === 'all' || data.hours === hoursFilter;
            const matchesSearch = data.name.toLowerCase().includes(searchQuery);

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

    // Закрытие панелей
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

    // Фильтры
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
                    
                    // Добавляем анимированную метку текущего местоположения
                    new ymaps.Placemark(
                        [position.coords.latitude, position.coords.longitude],
                        {},
                        {
                            iconLayout: 'default#image',
                            iconImageHref: 'https://cdn-icons-png.flaticon.com/512/149/149060.png',
                            iconImageSize: [32, 32],
                            iconImageOffset: [-16, -16]
                        }
                    ).then(placemark => {
                        map.geoObjects.add(placemark);
                        setTimeout(() => {
                            map.geoObjects.remove(placemark);
                        }, 5000);
                    });
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
        
        if (diff < 0) { // Свайп вниз
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
});
