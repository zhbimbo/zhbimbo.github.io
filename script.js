document.addEventListener('DOMContentLoaded', function() {
    // Инициализация карты
    let map;
    let placemarks = [];
    let selectedPlacemark = null;

    // Проверка мобильного устройства
    const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Класс BottomSheet
    class BottomSheet {
        constructor(element) {
            this.element = element;
            this.handle = element.querySelector('.swipe-handle');
            this.content = element.querySelector('.bottom-sheet-content');
            this.state = 'hidden';
            this.startY = 0;
            this.startTranslateY = 0;
            this.isDragging = false;
            this.velocity = 0;
            this.lastY = 0;
            this.lastTime = 0;
            this.collapsedHeight = window.innerHeight * 0.15; // Высота заголовка
            this.expandedHeight = window.innerHeight * 0.85; // Полная высота
            this.minTranslateY = -this.expandedHeight + this.collapsedHeight;
            this.init();
        }

        init() {
            this.setupEventListeners();
            window.addEventListener('resize', this.handleResize.bind(this));
        }

        setupEventListeners() {
            this.handle.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
            document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
            document.addEventListener('touchend', this.onTouchEnd.bind(this));
            this.handle.addEventListener('mousedown', this.onMouseStart.bind(this));
            document.addEventListener('mousemove', this.onMouseMove.bind(this));
            document.addEventListener('mouseup', this.onMouseEnd.bind(this));
            this.element.querySelector('.close-balloon').addEventListener('click', () => this.hide());
        }

        onTouchStart(e) {
            this.startDrag(e.touches[0].clientY);
        }

        onMouseStart(e) {
            this.startDrag(e.clientY);
        }

        startDrag(clientY) {
            this.startY = clientY;
            this.startTranslateY = this.getCurrentTranslateY();
            this.isDragging = true;
            this.element.style.transition = 'none';
            this.lastY = clientY;
            this.lastTime = Date.now();
        }

        onTouchMove(e) {
            if (!this.isDragging) return;
            e.preventDefault();
            this.handleMove(e.touches[0].clientY);
        }

        onMouseMove(e) {
            if (!this.isDragging) return;
            this.handleMove(e.clientY);
        }

        handleMove(clientY) {
            const now = Date.now();
            const deltaTime = now - this.lastTime;
            if (deltaTime > 0) {
                this.velocity = (clientY - this.lastY) / deltaTime;
                this.lastY = clientY;
                this.lastTime = now;
            }
            const diff = clientY - this.startY;
            let newTranslateY = this.startTranslateY + diff;
            newTranslateY = Math.min(Math.max(newTranslateY, this.minTranslateY), 0);
            this.element.style.transform = `translateY(${newTranslateY}px)`;
        }

        onTouchEnd() {
            this.endDrag();
        }

        onMouseEnd() {
            this.endDrag();
        }

        endDrag() {
            if (!this.isDragging) return;
            this.isDragging = false;
            this.element.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.8, 0.5, 1)';
            const currentTranslateY = this.getCurrentTranslateY();
            const threshold = this.expandedHeight * 0.3;
            if (Math.abs(this.velocity) > 0.2) {
                if (this.velocity > 0) {
                    this.collapse();
                } else {
                    this.expand();
                }
            } else {
                if (currentTranslateY > -threshold) {
                    this.collapse();
                } else {
                    this.expand();
                }
            }
        }

        getCurrentTranslateY() {
            const transform = this.element.style.transform;
            if (!transform || transform === 'none') return 0;
            const match = transform.match(/translateY\(([-\d.]+)px\)/);
            return match ? parseFloat(match[1]) : 0;
        }

        show() {
            this.element.classList.remove('hidden');
            this.element.classList.add('visible');
            this.state = 'collapsed';
            this.element.style.transform = `translateY(${-this.collapsedHeight}px)`;
        }

        hide() {
            this.element.style.transform = 'translateY(0)';
            setTimeout(() => {
                this.element.classList.remove('visible');
                this.element.classList.add('hidden');
                this.state = 'hidden';
                if (selectedPlacemark) {
                    selectedPlacemark.options.set('iconImageSize', [30, 30]);
                    selectedPlacemark = null;
                }
            }, 300);
        }

        expand() {
            this.element.style.transform = 'translateY(0)';
            this.element.classList.add('expanded');
            this.state = 'expanded';
        }

        collapse() {
            this.element.style.transform = `translateY(${-this.collapsedHeight}px)`;
            this.element.classList.remove('expanded');
            this.state = 'collapsed';
        }

        handleResize() {
            this.collapsedHeight = window.innerHeight * 0.15;
            this.expandedHeight = window.innerHeight * 0.85;
            this.minTranslateY = -this.expandedHeight + this.collapsedHeight;
            if (this.state === 'collapsed') {
                this.element.style.transform = `translateY(${-this.collapsedHeight}px)`;
            } else if (this.state === 'expanded') {
                this.element.style.transform = 'translateY(0)';
            }
        }
    }

    // Инициализация BottomSheet
    const bottomSheet = new BottomSheet(document.getElementById('mobile-bottom-sheet'));

    // Функции для работы с картой
    const getIconByRating = (rating) => {
        if (rating >= 4) return 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png';
        if (rating >= 3) return 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png';
        return 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png';
    };

    const createPlacemark = (place) => {
        const rating = parseFloat(place.description.match(/\d\.\d|\d/)[0]);
        const placemark = new ymaps.Placemark(
            place.coordinates,
            {
                balloonContentHeader: `<b>${place.name}</b>`,
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
            if (isMobile()) {
                openMobilePanel(placeData);
            } else {
                openDesktopSidebar(placeData);
            }
            if (selectedPlacemark) {
                selectedPlacemark.options.set('iconImageSize', [30, 30]);
            }
            e.get('target').options.set('iconImageSize', [40, 40]);
            selectedPlacemark = e.get('target');
            map.panTo(e.get('target').geometry.getCoordinates());
            e.preventDefault();
        });
        return placemark;
    };

    const openDesktopSidebar = (placeData) => {
        document.getElementById('sidebar-title').textContent = placeData.name;
        document.getElementById('sidebar-image').src = placeData.photo;
        document.getElementById('sidebar-address').textContent = placeData.address;
        document.getElementById('sidebar-phone').textContent = placeData.phone;
        document.getElementById('sidebar-hours').textContent = placeData.hours;
        document.getElementById('sidebar-rating').textContent = placeData.description;
        document.getElementById('sidebar-review-link').href = placeData.reviewLink;
        document.getElementById('desktop-sidebar').classList.remove('hidden');
        document.getElementById('desktop-sidebar').classList.add('visible');
    };

    const openMobilePanel = (placeData) => {
        document.querySelector('.balloon-title').textContent = placeData.name;
        document.querySelector('.balloon-image').src = placeData.photo;
        document.querySelector('.balloon-address').textContent = placeData.address;
        document.querySelector('.balloon-phone').textContent = placeData.phone;
        document.querySelector('.balloon-hours').textContent = placeData.hours;
        document.querySelector('.balloon-rating').textContent = placeData.description;
        document.querySelector('.balloon-review-link').href = placeData.reviewLink;
        bottomSheet.show();
    };

    const closeDesktopSidebar = () => {
        document.getElementById('desktop-sidebar').classList.remove('visible');
        document.getElementById('desktop-sidebar').classList.add('hidden');
        if (selectedPlacemark) {
            selectedPlacemark.options.set('iconImageSize', [30, 30]);
            selectedPlacemark = null;
        }
    };

    document.getElementById('close-sidebar').addEventListener('click', closeDesktopSidebar);

    const filterPlacemarks = () => {
        const ratingFilter = document.getElementById('ratingFilter').value;
        const districtFilter = document.getElementById('districtFilter').value;
        const hoursFilter = document.getElementById('hoursFilter').value;
        const searchQuery = document.getElementById('searchInput').value.toLowerCase();
        placemarks.forEach(placemark => {
            const placeData = placemark.properties.get('customData');
            const rating = parseFloat(placeData.description.match(/\d\.\d|\d/)[0]);
            const matchesRating = ratingFilter === 'all' || rating >= parseFloat(ratingFilter);
            const matchesDistrict = districtFilter === 'all' || placeData.district === districtFilter;
            const matchesHours = hoursFilter === 'all' || placeData.hours === hoursFilter;
            const matchesSearch = placeData.name.toLowerCase().includes(searchQuery);
            placemark.options.set('visible', matchesRating && matchesDistrict && matchesHours && matchesSearch);
        });
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
                    const placemark = createPlacemark(place);
                    placemarks.push(placemark);
                    map.geoObjects.add(placemark);
                });
                document.getElementById('count').textContent = data.length;
            })
            .catch(error => console.error('Ошибка загрузки данных:', error));

        // Обработчики фильтров
        document.getElementById('toggleFilters').addEventListener('click', (e) => {
            e.stopPropagation();
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
});
