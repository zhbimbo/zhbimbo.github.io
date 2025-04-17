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

        // Загрузка тестовых данных
        const testData = [
            {
                name: "Тестовое заведение 1",
                coordinates: [55.7558, 37.6173],
                address: "ул. Тестовая, 1",
                phone: "+7 (999) 123-45-67",
                hours: "Круглосуточно",
                description: "Рейтинг: 4.5",
                district: "ЦАО",
                photo: "https://via.placeholder.com/300",
                reviewLink: "#"
            },
            {
                name: "Тестовое заведение 2",
                coordinates: [55.76, 37.62],
                address: "ул. Тестовая, 2",
                phone: "+7 (999) 765-43-21",
                hours: "Пн–Вс: 12:00–02:00",
                description: "Рейтинг: 3.2",
                district: "САО",
                photo: "https://via.placeholder.com/300",
                reviewLink: "#"
            }
        ];

        testData.forEach(place => {
            const placemark = createPlacemark(place);
            placemarks.push(placemark);
            map.geoObjects.add(placemark);
        });

        document.getElementById('count').textContent = testData.length;
    }

    // Создание метки
    function createPlacemark(place) {
        const rating = parseFloat(place.description.match(/\d\.\d|\d/)[0]);
        const placemark = new ymaps.Placemark(
            place.coordinates,
            {
                customData: place
            },
            {
                iconLayout: 'default#image',
                iconImageHref: getIconByRating(rating),
                iconImageSize: [30, 30]
            }
        );

        placemark.events.add('click', function(e) {
            const placeData = e.get('target').properties.get('customData');
            if (isMobile) {
                openMobilePanel(placeData);
            } else {
                openDesktopSidebar(placeData);
            }
        });

        return placemark;
    }

    // Иконки для меток
    function getIconByRating(rating) {
        if (rating >= 4) return 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png';
        if (rating >= 3) return 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png';
        return 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png';
    }

    // Открытие мобильной панели
    function openMobilePanel(placeData) {
        document.querySelector('.balloon-title').textContent = placeData.name;
        document.querySelector('.balloon-image').src = placeData.photo;
        document.querySelector('.balloon-address').textContent = placeData.address;
        document.querySelector('.balloon-phone').textContent = placeData.phone;
        document.querySelector('.balloon-hours').textContent = placeData.hours;
        document.querySelector('.balloon-rating').textContent = placeData.description;
        document.querySelector('.balloon-review-link').href = placeData.reviewLink;
        
        const mobileSheet = document.getElementById('mobile-bottom-sheet');
        mobileSheet.classList.remove('hidden');
        mobileSheet.classList.add('visible');
    }

    // Открытие десктопной панели
    function openDesktopSidebar(placeData) {
        document.getElementById('sidebar-title').textContent = placeData.name;
        document.getElementById('sidebar-image').src = placeData.photo;
        document.getElementById('sidebar-address').textContent = placeData.address;
        document.getElementById('sidebar-phone').textContent = placeData.phone;
        document.getElementById('sidebar-hours').textContent = placeData.hours;
        document.getElementById('sidebar-rating').textContent = placeData.description;
        document.getElementById('sidebar-review-link').href = placeData.reviewLink;
        
        const sidebar = document.getElementById('desktop-sidebar');
        sidebar.classList.remove('hidden');
        sidebar.classList.add('visible');
    }

    // Фильтрация
    function filterPlacemarks() {
        const ratingFilter = document.getElementById('ratingFilter').value;
        const districtFilter = document.getElementById('districtFilter').value;
        const hoursFilter = document.getElementById('hoursFilter').value;
        const searchQuery = document.getElementById('searchInput').value.toLowerCase();

        placemarks.forEach(placemark => {
            const data = placemark.properties.get('customData');
            const rating = parseFloat(data.description.match(/\d\.\d|\d/)[0]);
            
            const matchesRating = ratingFilter === 'all' || rating >= parseFloat(ratingFilter);
            const matchesDistrict = districtFilter === 'all' || data.district === districtFilter;
            const matchesHours = hoursFilter === 'all' || data.hours === hoursFilter;
            const matchesSearch = data.name.toLowerCase().includes(searchQuery);

            if (matchesRating && matchesDistrict && matchesHours && matchesSearch) {
                placemark.options.set('visible', true);
            } else {
                placemark.options.set('visible', false);
            }
        });
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
        document.getElementById('mobile-bottom-sheet').classList.add('hidden');
        document.getElementById('mobile-bottom-sheet').classList.remove('visible');
    });

    document.getElementById('close-sidebar')?.addEventListener('click', function() {
        document.getElementById('desktop-sidebar').classList.add('hidden');
        document.getElementById('desktop-sidebar').classList.remove('visible');
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
                },
                function() {
                    alert("Не удалось определить ваше местоположение");
                }
            );
        } else {
            alert("Геолокация не поддерживается вашим браузером");
        }
    });
});
