ymaps.ready(() => {
    const map = new ymaps.Map('map', {
        center: [55.7558, 37.6173], // Центр Москвы
        zoom: 12
    });

    fetch('data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Ошибка загрузки данных: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Данные успешно загружены:', data); // Проверка в консоли
            data.forEach(place => {
                const placemark = new ymaps.Placemark(
                    place.coordinates,
                    {
                        balloonContentHeader: place.name,
                        balloonContentBody: `${place.description} <br> <a href="${place.reviewLink}" target="_blank">Читать обзор</a>`
                    }
                );
                map.geoObjects.add(placemark);
            });
        })
        .catch(error => {
            console.error('Ошибка:', error); // Вывод ошибки в консоль
        });
});