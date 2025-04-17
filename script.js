document.addEventListener('DOMContentLoaded', function() {
    let map;
    let placemarks = [];
    let selectedPlacemark = null;
    let currentTheme = 'light';

    // Геолокация [[5]]
    function getLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    map.setCenter([position.coords.latitude, position.coords.longitude], 14);
                },
                () => alert("Геолокация недоступна :(")
            );
        }
    }

    // Темная тема [[3]]
    function toggleTheme() {
        document.body.classList.toggle('dark-mode');
        currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        document.getElementById('mobile-bottom-sheet').classList.toggle('dark-mode');
        document.getElementById('desktop-sidebar').classList.toggle('dark-mode');
        document.getElementById('header').classList.toggle('dark-mode');
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
                this.collapse();
            } else {
                this.expand();
            }
        }

        show() {
            this.element.style.transform = `translateY(${window.innerHeight}px)`;
            setTimeout(() => {
                this.element.style.transform = `translateY(${-this.collapsedHeight}px)`;
                this.state = 'collapsed';
            }, 100);
        }

        hide() {
            this.element.style.transform = 'translateY(100%)';
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
            this.element.style.transform = `translateY(${-this.collapsedHeight}px)`;
            this.state = 'collapsed';
        }

        getCurrentTranslateY() {
            const transform = window.getComputedStyle(this.element).transform;
            return transform ? parseFloat(transform.split(',')[5]) : 0;
        }
    }

    // Инициализация BottomSheet
    const bottomSheet = new BottomSheet(document.getElementById('mobile-bottom-sheet'));

    // Слайдер рейтинга [[1]]
    const slider = document.getElementById('ratingSlider');
    noUiSlider.create(slider, {
        start: [0],
        connect: [true, false],
        range: {
            min: 0,
            max: 5
        },
        pips: {
            mode: 'count',
            values: 6,
            density: 3
        }
    });
    slider.noUiSlider.on('update', (values) => {
        document.getElementById('ratingDisplay').textContent = `${Math.floor(values[0])}+`;
    });

    // Фильтрация
    function filterPlacemarks() {
        const rating = slider.noUiSlider.get();
        const district = document.getElementById('districtFilter').value;
        const hours = document.getElementById('hoursFilter').value;
        const search = document.getElementById('searchInput').value.toLowerCase();
        
        placemarks.forEach(placemark => {
            const data = placemark.properties.get('customData');
            const show = 
                data.description >= rating &&
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

        // Анимация загрузки
        document.getElementById('map').classList.add('loading');
        
        // Загрузка данных
        fetch('data.json')
            .then(response => response.json())
            .then(data => {
                data.forEach(place => {
                    const rating = parseFloat(place.description.match(/\d\.\d|\d/)[0]);
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
                            iconImageOffset: [-15, -15]
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
                document.getElementById('map').classList.remove('loading');
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
            if (!e.target.closest('#filters-panel')) {
                document.getElementById('filters-panel').classList.remove('visible');
            }
        });

        slider.noUiSlider.on('end', filterPlacemarks);
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

    // Эффекты
    document.querySelectorAll('.animated-button').forEach(btn => {
        btn.addEventListener('click', () => btn.classList.add('clicked'));
        btn.addEventListener('transitionend', () => btn.classList.remove('clicked'));
    });
});
