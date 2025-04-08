ymaps.ready(() => {
    const map = new ymaps.Map('map', {
        center: [55.7558, 37.6173], // Центр Москвы
        zoom: 12
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
                        balloonContentHeader: place.name,
                        balloonContentBody: `${place.description} <br> <a href="${place.reviewLink}" target="_blank">Читать обзор</a>`
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
        });

    // Фильтрация по рейтингу
    document.getElementById('ratingFilter').addEventListener('change', (event) => {
        const selectedRating = event.target.value;

        // Сначала удаляем все маркеры с карты
        placemarks.forEach(placemark => map.geoObjects.remove(placemark));

        // Фильтруем заведения
        if (selectedRating === 'all') {
            placemarks.forEach(placemark => map.geoObjects.add(placemark));
        } else {
            placemarks.forEach(placemark => {
                const rating = parseFloat(placemark.properties.get('balloonContentBody').match(/\d\.\d/)[0]);
                if (rating >= parseFloat(selectedRating)) {
                    map.geoObjects.add(placemark);
                }
            });
        }
    });

    // Поиск по названию или адресу
    document.getElementById('searchInput').addEventListener('input', (event) => {
        const query = event.target.value.toLowerCase(); // Введённый текст

        // Сначала удаляем все маркеры с карты
        placemarks.forEach(placemark => map.geoObjects.remove(placemark));

        // Фильтруем заведения
        placemarks.forEach(placemark => {
            const name = placemark.properties.get('balloonContentHeader').toLowerCase();
            if (name.includes(query)) {
                map.geoObjects.add(placemark);
            }
        });
    });
});
