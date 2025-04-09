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
                        iconImageOffset: [-15, -15],
                        disableDefaultBalloon: true // Отключаем стандартный балун
                    }
                );

                placemarks.push(placemark);
                map.geoObjects.add(placemark); // Добавляем маркер на карту

                // Обработчик клика на маркер
                placemark.events.add('click', () => {
                    openCustomBalloon(place);

                    // Выделяем текущий маркер
                    placemarks.forEach(p => p.options.set('iconImageHref', getIconByRating(parseFloat(p.properties.get('balloonContentBody').match(/\d\.\d/)[0]))));
                    placemark.options.set('iconImageHref', 'icons/star-selected.png'); // Иконка для выбранного маркера
                });
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

// Обработчики событий для кнопок управления фильтрами
document.getElementById('toggleFilters')?.addEventListener('click', () => {
    const filtersPanel = document.getElementById('filters-panel');
    filtersPanel.classList.toggle('visible');
});

// Функция для открытия кастомного всплывающего окна
const openCustomBalloon = (place) => {
    const balloon = document.getElementById('custom-balloon');
    const title = document.getElementById('balloon-title');
    const image = document.getElementById('balloon-image');
    const address = document.getElementById('balloon-address');
    const phone = document.getElementById('balloon-phone');
    const hours = document.getElementById('balloon-hours');
    const rating = document.getElementById('balloon-rating');
    const reviewLink = document.getElementById('balloon-review-link');

    // Заполняем данные
    title.textContent = place.name;
    image.src = place.photo;
    address.textContent = place.address;
    phone.textContent = place.phone;
    hours.textContent = place.hours;
    rating.textContent = place.description;
    reviewLink.href = place.reviewLink;

    // Сбрасываем позицию блока перед открытием
    balloon.style.transform = 'translateY(100%)';
    balloon.setAttribute('data-y', window.innerHeight);

    // Открываем всплывающее окно
    balloon.classList.remove('hidden');
    balloon.classList.add('visible');
};

// Закрытие кастомного всплывающего окна
document.getElementById('close-balloon')?.addEventListener('click', () => {
    const balloon = document.getElementById('custom-balloon');
    balloon.classList.remove('visible');
    balloon.classList.add('hidden');
});

// Drag-and-drop для кастомного всплывающего окна
interact('#custom-balloon')
    .draggable({
        modifiers: [
            interact.modifiers.restrictEdges({
                outer: 'parent',
                endOnly: true
            }),
            interact.modifiers.restrict({
                restriction: 'parent',
                endOnly: true,
                elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
            })
        ],
        inertia: true,
        listeners: {
            move(event) {
                const target = event.target;
                const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                // Ограничиваем перемещение по оси Y
                if (y > 0 && y < window.innerHeight * 0.8) {
                    target.style.transform = `translateY(${y}px)`;
                    target.setAttribute('data-y', y);
                }
            },
            end(event) {
                const target = event.target;
                const y = parseFloat(target.getAttribute('data-y')) || 0;

                // Если блок вытянут больше чем на половину экрана, открываем его полностью
                if (y > window.innerHeight * 0.4) {
                    target.style.transform = `translateY(0)`;
                    target.setAttribute('data-y', 0);
                } else {
                    target.style.transform = `translateY(100%)`;
                    target.setAttribute('data-y', window.innerHeight);
                }
            }
        }
    });
