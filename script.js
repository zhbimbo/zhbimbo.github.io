ymaps.ready(() => {
    const map = new ymaps.Map('map', {
        center: [55.7558, 37.6173], // Центр Москвы
        zoom: 12,
        controls: [] // Убираем все стандартные элементы управления
    });

    // Если нужно добавить только определённые элементы, укажите их явно:
    // controls: ['zoomControl', 'geolocationControl']

    // Остальной код остаётся без изменений...
});
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

    // Загрузка данных о заведениях
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            data.forEach(place => {
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
                        `
                    },
                    {
                        iconLayout: 'default#image',
                        iconImageHref: icon, // Указываем иконку
                        iconImageSize: [30, 30], // Размер иконки
                        iconImageOffset: [-15, -15] // Смещение иконки
                    }
                );

                placemarks.push(placemark); // Сохраняем маркер
                map.geoObjects.add(placemark); // Добавляем маркер на карту
            });

            updateStats(placemarks.length); // Обновляем статистику
        });

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
            const district = placemark.properties.get('balloonContentBody').match(/<b>Адрес:<\/b> ([^<]+)/)[1].split(',')[1].trim();
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

    // Функция для обновления статистики
    const updateStats = (count) => {
        document.getElementById('count').innerText = count;
    };

    // Обработчики событий для фильтров
    document.getElementById('ratingFilter').addEventListener('change', filterMarkers);
    document.getElementById('districtFilter').addEventListener('change', filterMarkers);
    document.getElementById('hoursFilter').addEventListener('change', filterMarkers);

    // Поиск по названию или адресу
    document.getElementById('searchInput').addEventListener('input', (event) => {
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
