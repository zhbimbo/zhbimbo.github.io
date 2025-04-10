let map;
let placemarks = [];
let allPlaces = []; // Сохраняем оригинальные данные

const getIconByRating = (rating) => {
    if (rating >= 4) return 'icons/star-green.png';
    if (rating >= 3) return 'icons/star-yellow.png';
    return 'icons/star-red.png';
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
            allPlaces = data; // Сохраняем оригинальные данные
            
            data.forEach(place => {
                const ratingMatch = place.description.match(/\d\.\d|\d/);
                const rating = ratingMatch ? parseFloat(ratingMatch[0]) : 0;
                const icon = getIconByRating(rating);

                const placemark = new ymaps.Placemark(
                    place.coordinates,
                    {
                        balloonContentHeader: `<b>${place.name}</b>`,
                        balloonContentBody: `
                            <div style="text-align: center;">
                                <img src="${place.photo}" alt="${place.name}" style="width: 100%; max-width: 200px; margin-bottom: 10px;">
                                <p><b>Адрес:</b> ${place.address}</p>
                                <p><b>Телефон:</b> ${place.phone}</p>
                                <p><b>Режим работы:</b> ${place.hours}</p>
                                <p><b>Рейтинг:</b> ${place.description}</p>
                                <a href="${place.reviewLink}" target="_blank" style="color: blue;">Читать обзор</a>
                            </div>
                        `,
                        district: place.district,
                        hours: place.hours,
                        rating: rating,
                        originalData: place // Сохраняем оригинальные данные
                    },
                    {
                        iconLayout: 'default#image',
                        iconImageHref: icon,
                        iconImageSize: [30, 30],
                        iconImageOffset: [-15, -15],
                        hideIconOnBalloonOpen: false,
                        balloonOffset: [0, -40]
                    }
                );

                placemark.events.add('click', (e) => {
                    e.preventDefault();
                    openCustomBalloon(placemark.properties.get('originalData'));
                    
                    // Центрируем карту на маркере с небольшим смещением вверх
                    map.panTo(placemark.geometry.getCoordinates(), {
                        flying: true,
                        callback: () => {
                            // Не открываем стандартный балун
                        }
                    });
                });

                placemarks.push(placemark);
                map.geoObjects.add(placemark);
            });

            updateStats(data.length);
        })
        .catch(error => console.error('Ошибка загрузки данных:', error));
});

// Обновлённая функция фильтрации
const filterMarkers = () => {
    const ratingFilter = parseFloat(document.getElementById('ratingFilter').value) || 0;
    const districtFilter = document.getElementById('districtFilter').value;
    const hoursFilter = document.getElementById('hoursFilter').value;
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();

    map.geoObjects.removeAll();

    const filtered = placemarks.filter(placemark => {
        const properties = placemark.properties.getAll();
        const rating = properties.rating;
        const district = properties.district;
        const hours = properties.hours;
        const name = properties.balloonContentHeader.toLowerCase();
        const address = properties.originalData.address.toLowerCase();

        const matchesRating = isNaN(ratingFilter) || rating >= ratingFilter;
        const matchesDistrict = districtFilter === 'all' || district === districtFilter;
        const matchesHours = hoursFilter === 'all' || hours === hoursFilter;
        const matchesSearch = searchQuery === '' || 
                             name.includes(searchQuery) || 
                             address.includes(searchQuery);

        return matchesRating && matchesDistrict && matchesHours && matchesSearch;
    });

    filtered.forEach(placemark => map.geoObjects.add(placemark));
    updateStats(filtered.length);
};

// Навешиваем обработчики на все фильтры
document.getElementById('ratingFilter')?.addEventListener('change', filterMarkers);
document.getElementById('districtFilter')?.addEventListener('change', filterMarkers);
document.getElementById('hoursFilter')?.addEventListener('change', filterMarkers);
document.getElementById('searchInput')?.addEventListener('input', filterMarkers);

// Остальные функции остаются без изменений
// ...
