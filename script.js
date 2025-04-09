let map; // Глобальная переменная для карты
let placemarks = []; // Массив для хранения всех маркеров

// Функция для определения иконки по рейтингу
const getIconByRating = (rating) => {
    if (rating >= 4) {
        return 'icons/star-green.png'; // Зелёная звезда
    } else if (rating >= 3) {
        return 'icons/star-yellow.png'; // Жёлтая звезда
    } else {
        return 'icons/star-red.png'; // Красная звезда
    }
};

// Инициализация карты
ymaps.ready(() => {
    console.log('API Яндекс.Карт загружен.'); // Проверяем загрузку API
    map = new ymaps.Map('map', { // Глобальная переменная map
        center: [55.7558, 37.6173], // Центр Москвы
        zoom: 12,
        controls: [] // Убираем стандартные элементы управления
    });

    console.log('Карта инициализирована.'); // Проверяем инициализацию карты

    // Загрузка данных о заведениях
    fetch('data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Ошибка загрузки данных: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Загруженные данные:', data); // Выводим данные в консоль
            if (data.length === 0) {
                console.error('Данные пусты или отсутствуют.');
            }

            data.forEach(place => {
                console.log('Место:', place); // Проверяем каждое место
                const rating = parseFloat(place.description.match(/\d\.\d/)[0]); // Извлекаем рейтинг
                const icon = getIconByRating(rating); // Определяем иконку

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
                        district: place.district
                    },
                    {
                        iconLayout: 'default#image',
                        iconImageHref: icon,
                        iconImageSize: [30, 30],
                        iconImageOffset: [-15, -15]
                    }
                );

                placemarks.push(placemark);
                map.geoObjects.add(placemark); // Добавляем маркер на карту
            });

            updateStats(placemarks.length); // Обновляем статистику
        })
        .catch(error => {
            console.error('Ошибка загрузки данных:', error);
        });
});

// Функция для обновления статистики
const updateStats = (count) => {
    const countElement = document.getElementById('count');
    if (countElement) {
        countElement.innerText = count;
    } else {
        console.error('Элемент с id="count" не найден в DOM.');
    }
};

// Функция для фильтрации маркеров
const filterMarkers = () => {
    const selectedRating = document.getElementById('ratingFilter').value;
    const selectedDistrict = document.getElementById('districtFilter').value;
    const selectedHours = document.getElementById('hoursFilter').value;

    // Сначала удаляем все маркеры с карты
    placemarks.forEach(placemark => map.geoObjects.remove(placemark));

    // Фильтруем заведения
    const filteredPlacemarks = placemarks.filter(placemark => {
        const rating = parseFloat(placemark.properties.get('balloonContentBody').match(/\d\.\d/)[0]);
        const district = placemark.properties.get('district'); // Берём район из данных
        const hours = placemark.properties.get('balloonContentBody').match(/<b>Режим работы:<\/b> ([^<]+)/)[1];

        const matchesRating = selectedRating === 'all' || rating >= parseFloat(selectedRating);
        const matchesDistrict = selectedDistrict === 'all' || district === selectedDistrict;
        const matchesHours = selectedHours === 'all' || hours === selectedHours;

        return matchesRating && matchesDistrict && matchesHours;
    });

    // Добавляем подходящие маркеры на карту
    filteredPlacemarks.forEach(placemark => map.geoObjects.add(placemark));

    // Обновляем статистику
    updateStats(filteredPlacemarks.length);
};

// Поиск по названию или адресу
document.getElementById('searchInput')?.addEventListener('input', (event) => {
    const query = event.target.value.toLowerCase(); // Введённый текст

    // Сначала удаляем все маркеры с карты
    placemarks.forEach(placemark => map.geoObjects.remove(placemark));

    // Фильтруем заведения
    const filteredPlacemarks = placemarks.filter(placemark => {
        const name = placemark.properties.get('balloonContentHeader').toLowerCase();
        return name.includes(query);
    });

    // Добавляем подходящие маркеры на карту
    filteredPlacemarks.forEach(placemark => map.geoObjects.add(placemark));

    // Обновляем статистику
    updateStats(filteredPlacemarks.length);
});

// Обработчики событий для кнопок управления фильтрами и легендой
document.getElementById('toggleFilters')?.addEventListener('click', () => {
    const filtersPanel = document.getElementById('filters-panel');
    filtersPanel.classList.toggle('hidden');
});

document.getElementById('toggleLegend')?.addEventListener('click', () => {
    const legend = document.getElementById('legend');
    legend.classList.toggle('hidden');
});
