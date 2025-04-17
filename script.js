document.addEventListener('DOMContentLoaded', function() {
    let map;
    let placemarks = [];
    let selectedPlacemark = null;
    let cookiesAccepted = false;

    // Cookie-уведомление [[2]]
    if (!localStorage.getItem('cookiesAccepted')) {
        document.getElementById('cookie-consent').classList.remove('hidden');
    }

    function acceptCookies() {
        localStorage.setItem('cookiesAccepted', 'true');
        document.getElementById('cookie-consent').classList.add('hidden');
    }

    // Геолокация [[7]]
    function getLocation() {
        if (navigator.geolocation && cookiesAccepted) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    map.setCenter([position.coords.latitude, position.coords.longitude], 14);
                },
                () => alert("Геолокация недоступна")
            );
        }
    }

    // Класс BottomSheet
    class BottomSheet {
        constructor(element) {
            this.element = element;
            this.handle = element.querySelector('.swipe-handle');
            this.content = element.querySelector('.bottom-sheet-content');
            this.state = 'hidden';
            this.collapsedHeight = window.innerHeight * 0.15;
            this.expandedHeight = window.innerHeight * 0.85;
            this.minTranslateY = -this.expandedHeight + this.collapsedHeight;
            this.init();
        }

        init() {
            this.setupEventListeners();
            window.addEventListener('resize', this.handleResize.bind(this));
        }

        setupEventListeners() {
            this.handle.addEventListener('touchstart', this.startDrag.bind(this));
            document.addEventListener('touchmove', this.moveDrag.bind(this));
            document.addEventListener('touchend', this.endDrag.bind(this));
            this.element.querySelector('.close-balloon').addEventListener('click', this.hide.bind(this));
        }

        startDrag(e) {
            this.startY = e.touches[0].clientY;
            this.startTranslateY = this.getCurrentTranslateY();
            this.isDragging = true;
            this.element.style.transition = 'none';
        }

        moveDrag(e) {
            if (!this.isDragging) return;
            const diff = e.touches[0].clientY - this.startY;
            const newTranslateY = this.startTranslateY + diff;
            this.element.style.transform = `translateY(${newTranslateY}px)`;
        }

        endDrag() {
            const currentY = this.getCurrentTranslateY();
            if (currentY < -this.collapsedHeight * 0.5) {
                this.expand();
            } else {
                this.collapse();
            }
        }

        show() {
            this.element.style.transform = 'translateY(85vh)';
            this.element.classList.add('visible');
            this.state = 'collapsed';
        }

        hide() {
            this.element.style.transform = 'translateY(100vh)';
            setTimeout(() => {
                this.element.classList.remove('visible');
                this.state = 'hidden';
            }, 300);
        }

        expand() {
            this.element.style.transform = 'translateY(0)';
            this.state = 'expanded';
        }

        collapse() {
            this.element.style.transform = 'translateY(85vh)';
            this.state = 'collapsed';
        }

        getCurrentTranslateY() {
            const transform = window.getComputedStyle(this.element).transform;
            return transform ? parseFloat(transform.split(',')[5]) : 0;
        }
    }

    const bottomSheet = new BottomSheet(document.getElementById('mobile-bottom-sheet'));

    // Фильтры
    function filterPlacemarks() {
        const rating = document.getElementById('ratingFilter').value;
        const district = document.getElementById('districtFilter').value;
        const hours = document.getElementById('hoursFilter').value;
        const search = document.getElementById('searchInput').value.toLowerCase();
        
        placemarks.forEach(placemark => {
            const data = placemark.properties.get('customData');
            const show = 
                (rating === 'all' || data.description.split('/')[0] >= rating) && // Исправлено [[5]]
                (district === 'all' || data.district === district) &&
                (hours === 'all' || data.hours === hours) &&
                data.name.toLowerCase().includes(search);
            
            placemark.options.set('visible', show);
        });
    }

    // Маркеры
    const getIconByRating = (rating) => {
        if (rating >= 4) return 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png';
        if (rating >= 3) return 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png';
        return 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png';
    };

    // Инициализация карты
    ymaps.ready(() => {
        map = new ymaps.Map('map', {
            center: [55.7558, 37.6173],
            zoom: 12,
            controls: []
        });

        // Загрузка данных
        fetch('data.json')
            .then(response => response.json())
            .then(data => {
                data.forEach(place => {
                    const rating = parseFloat(place.description.split('/')[0]);
                    const placemark = new ymaps.Placemark(
                        place.coordinates,
                        {
                            balloonContentBody: `
                                <img src="${place.photo}" style="max-width:200px;margin-bottom:10px;">
                                <p><b>Адрес:</b> ${place.address}</p>
                                <p><b>Телефон:</b> ${place.phone}</p>
                                <p><b>Режим работы:</b> ${place.hours}</p>
                                <p><b>Рейтинг:</b> ${place.description}</p>
                                <a href="${place.reviewLink}" target="_blank">Читать обзор</a>
                            `,
                            customData: place
                        },
                        {
                            iconLayout: 'default#image',
                            iconImageHref: getIconByRating(rating),
                            iconImageSize: [30, 30],
                            iconAnimation: 'bounce',
                            iconAnimationTimeout: 2000
                        }
                    );
                    placemark.events.add('click', (e) => {
                        const placeData = e.get('target').properties.get('customData');
                        openMobilePanel(placeData);
                    });
                    placemarks.push(placemark);
                    map.geoObjects.add(placemark);
                });
                document.getElementById('count').textContent = data.length;
            })
            .catch(error => {
                console.error("Ошибка загрузки данных:", error);
                document.getElementById('count').textContent = "Ошибка: " + error.message;
            });

        // Обработчики
        document.getElementById('toggleFilters').addEventListener('click', () => {
            document.getElementById('filters-panel').classList.toggle('visible');
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#filters-panel') && !e.target.closest('#toggleFilters')) {
                document.getElementById('filters-panel').classList.remove('visible');
            }
        });

        document.getElementById('ratingFilter').addEventListener('change', filterPlacemarks);
        document.getElementById('districtFilter').addEventListener('change', filterPlacemarks);
        document.getElementById('hoursFilter').addEventListener('change', filterPlacemarks);
        document.getElementById('searchInput').addEventListener('input', filterPlacemarks);
    });

    // Панель деталей
    function openMobilePanel(placeData) {
        document.querySelector('.balloon-title').textContent = placeData.name;
        document.querySelector('.balloon-image').src = placeData.photo;
        document.querySelector('.balloon-address').textContent = placeData.address;
        document.querySelector('.balloon-phone').textContent = placeData.phone;
        document.querySelector('.balloon-hours').textContent = placeData.hours;
        document.querySelector('.balloon-rating').textContent = placeData.description;
        document.querySelector('.balloon-review-link').href = placeData.reviewLink;
        bottomSheet.show();
    }
});
