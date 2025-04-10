let map;
let placemarks = [];

const getIconByRating = (rating) => {
    if (rating >= 4) return 'icons/star-green.png';
    if (rating >= 3) return 'icons/star-yellow.png';
    return 'icons/star-red.png';
};

// Проверка на мобильное устройство
const isMobile = () => window.innerWidth <= 767;

// Открытие боковой панели (ПК)
const openDesktopSidebar = (place) => {
    document.getElementById('sidebar-title').textContent = place.name;
    document.getElementById('sidebar-image').src = place.photo;
    document.getElementById('sidebar-address').textContent = place.address;
    document.getElementById('sidebar-phone').textContent = place.phone;
    document.getElementById('sidebar-hours').textContent = place.hours;
    document.getElementById('sidebar-rating').textContent = place.description;
    document.getElementById('sidebar-review-link').href = place.reviewLink;
    
    document.getElementById('desktop-sidebar').classList.remove('hidden');
    document.getElementById('desktop-sidebar').classList.add('visible');
};

// Открытие нижней панели (мобилки)
const openMobileBottomSheet = (place) => {
    document.getElementById('balloon-title').textContent = place.name;
    document.getElementById('balloon-image').src = place.photo;
    document.getElementById('balloon-address').textContent = place.address;
    document.getElementById('balloon-phone').textContent = place.phone;
    document.getElementById('balloon-hours').textContent = place.hours;
    document.getElementById('balloon-rating').textContent = place.description;
    document.getElementById('balloon-review-link').href = place.reviewLink;
    
    document.getElementById('mobile-bottom-sheet').classList.remove('hidden');
    document.getElementById('mobile-bottom-sheet').classList.add('visible');
};

// Инициализация карты
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

                placemark.events.add('click', function() {
                    const placeData = this.properties.get('originalData');
                    
                    if (isMobile()) {
                        openMobileBottomSheet(placeData);
                    } else {
                        openDesktopSidebar(placeData);
                    }
                    
                    map.panTo(this.geometry.getCoordinates(), {
                        flying: true,
                        duration: 300
                    });
                });

                placemarks.push(placemark);
                map.geoObjects.add(placemark);
            });

            updateStats(data.length);
        });
});

// Фильтрация маркеров
function filterMarkers() {
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
}

// Обновление статистики
function updateStats(count) {
    document.getElementById('count').textContent = count;
}

// Закрытие панелей
document.getElementById('close-sidebar').addEventListener('click', function() {
    document.getElementById('desktop-sidebar').classList.remove('visible');
    document.getElementById('desktop-sidebar').classList.add('hidden');
});

document.getElementById('close-balloon').addEventListener('click', function() {
    document.getElementById('mobile-bottom-sheet').classList.remove('visible');
    document.getElementById('mobile-bottom-sheet').classList.add('hidden');
});

// Свайп для мобильной панели
let startY;

document.getElementById('mobile-bottom-sheet').addEventListener('touchstart', function(e) {
    startY = e.touches[0].clientY;
}, {passive: true});

document.getElementById('mobile-bottom-sheet').addEventListener('touchmove', function(e) {
    const currentY = e.touches[0].clientY;
    const diff = startY - currentY;
    
    if (diff < 0) {
        e.preventDefault();
        this.style.transform = `translateY(${-diff}px)`;
    }
}, {passive: false});

document.getElementById('mobile-bottom-sheet').addEventListener('touchend', function(e) {
    const currentY = e.changedTouches[0].clientY;
    const diff = startY - currentY;
    
    if (diff > 100) {
        this.classList.remove('visible');
        this.classList.add('hidden');
    }
    this.style.transform = '';
});

// Обработчики фильтров
document.getElementById('toggleFilters').addEventListener('click', function() {
    document.getElementById('filters-panel').classList.toggle('visible');
});

document.getElementById('ratingFilter').addEventListener('change', filterMarkers);
document.getElementById('districtFilter').addEventListener('change', filterMarkers);
document.getElementById('hoursFilter').addEventListener('change', filterMarkers);
document.getElementById('searchInput').addEventListener('input', filterMarkers);
