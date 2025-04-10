let map;
let placemarks = [];

const getIconByRating = (rating) => {
    if (rating >= 4) return 'icons/star-green.png';
    if (rating >= 3) return 'icons/star-yellow.png';
    return 'icons/star-red.png';
};

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
                        rating: rating
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
                    openCustomBalloon(place);
                });

                placemarks.push(placemark);
                map.geoObjects.add(placemark);
            });

            updateStats(data.length);
        })
        .catch(error => console.error('Error:', error));
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
        const address = placemark.properties.get('balloonContentBody').toLowerCase();

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

// Навешиваем обработчики
document.getElementById('ratingFilter').addEventListener('change', filterMarkers);
document.getElementById('districtFilter').addEventListener('change', filterMarkers);
document.getElementById('hoursFilter').addEventListener('change', filterMarkers);
document.getElementById('searchInput').addEventListener('input', filterMarkers);

// Остальные функции без изменений
function updateStats(count) {
    document.getElementById('count').textContent = count;
}

function openCustomBalloon(place) {
    const balloon = document.getElementById('custom-balloon');
    balloon.querySelector('#balloon-title').textContent = place.name;
    balloon.querySelector('#balloon-image').src = place.photo;
    balloon.querySelector('#balloon-address').textContent = place.address;
    balloon.querySelector('#balloon-phone').textContent = place.phone;
    balloon.querySelector('#balloon-hours').textContent = place.hours;
    balloon.querySelector('#balloon-rating').textContent = place.description;
    balloon.querySelector('#balloon-review-link').href = place.reviewLink;
    
    balloon.classList.remove('hidden');
    balloon.classList.add('visible');
}

document.getElementById('close-balloon').addEventListener('click', function() {
    document.getElementById('custom-balloon').classList.remove('visible');
    document.getElementById('custom-balloon').classList.add('hidden');
});

document.getElementById('toggleFilters').addEventListener('click', function() {
    document.getElementById('filters-panel').classList.toggle('visible');
});
