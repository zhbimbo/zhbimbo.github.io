ymaps.ready(() => {
    const map = new ymaps.Map('map', {
        center: [55.7558, 37.6173], // Центр Москвы
        zoom: 12
    });

    let placemarks = []; // Массив для хранения всех маркеров

    // Загрузка данных о заведениях
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            data.forEach(place => {
                const placemark = new ymaps.Placemark(
                    place.coordinates,
                    {
                        balloonContentHeader: place.name,
                        balloonContentBody: `${place.description} <br> <a href="${place.reviewLink}" target="_blank">Читать обзор</a>`
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
            // Если выбрано "Все", показываем все маркеры
            placemarks.forEach(placemark => map.geoObjects.add(placemark));
        } else {
            // Иначе показываем только заведения с выбранным рейтингом
            placemarks.forEach(placemark => {
                const rating = parseFloat(placemark.properties.get('balloonContentBody').match(/\d\.\d/)[0]);
                if (rating >= parseFloat(selectedRating)) {
                    map.geoObjects.add(placemark);
                }
            });
        }
    });
});
