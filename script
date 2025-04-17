document.addEventListener('DOMContentLoaded', function() {
    let map;
    let placemarks = [];
    let selectedPlacemark = null;

    // Проверка устройства
    const isMobile = () => 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Отключаем балуны Яндекс.Карт [[1]]
    ymaps.ready(() => {
        map = new ymaps.Map('map', {
            center: [55.7558, 37.6173],
            zoom: 12,
            controls: [],
            balloonAutoOpen: false, // [[1]]
            hintAutoOpen: false
        });
    });

    // Класс BottomSheet
    class BottomSheet {
        constructor(element) {
            this.element = element;
            this.handle = element.querySelector('.swipe-handle');
            this.state = 'hidden';
            this.collapsedHeight = window.innerHeight * 0.15; // [[7]]
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
            this.handle.addEventListener('mousedown', this.startDrag.bind(this));
            document.addEventListener('mousemove', this.moveDrag.bind(this));
            document.addEventListener('mouseup', this.endDrag.bind(this));
            this.element.querySelector('.close-balloon').addEventListener('click', this.hide.bind(this));
        }

        startDrag(e) {
            this.startY = e.clientY || e.touches[0].clientY;
            this.startTranslateY = this.getCurrentTranslateY();
            this.isDragging = true;
            this.element.style.transition = 'none';
            this.lastY = this.startY;
            this.lastTime = Date.now();
        }

        moveDrag(e) {
            if (!this.isDragging) return;
            e.preventDefault();
            const currentY = e.clientY || e.touches[0].clientY;
            const diff = currentY - this.startY;
            let newTranslateY = this.startTranslateY + diff;
            newTranslateY = Math.min(Math.max(newTranslateY, this.minTranslateY), 0);
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
            this.element.style.transform = `translateY(${this.collapsedHeight}px)`;
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
            this.element.style.transform = `translateY(${this.collapsedHeight}px)`;
            this.state = 'collapsed';
        }

        getCurrentTranslateY() {
            const transform = window.getComputedStyle(this.element).transform;
            return transform ? parseFloat(transform.split(',')[5]) : 0;
        }

        handleResize() {
            this.collapsedHeight = window.innerHeight * 0.15;
            this.expandedHeight = window.innerHeight * 0.85;
            this.minTranslateY = -this.expandedHeight + this.collapsedHeight;
        }
    }

    // Инициализация BottomSheet
    const mobileSheetElement = document.getElementById('mobile-bottom-sheet');
    if (mobileSheetElement) {
        const bottomSheet = new BottomSheet(mobileSheetElement);
    }

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
                iconImageSize: [30, 30]
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

    // Десктопная панель
    const openDesktopSidebar = (placeData) => {
        const elements = {
            title: document.getElementById('sidebar-title'),
            image: document.getElementById('sidebar-image'),
            address: document.getElementById('sidebar-address'),
            phone: document.getElementById('sidebar-phone'),
            hours: document.getElementById('sidebar-hours'),
            rating: document.getElementById('sidebar-rating'),
            link: document.getElementById('sidebar-review-link'),
            container: document.getElementById('desktop-sidebar')
        };

        // Проверяем все элементы на существование [[4]]
        if (Object.values(elements).some(el => !el)) {
            console.error("Элементы десктопной панели не найдены [[2]]");
            return;
        }

        elements.title.textContent = placeData.name;
        elements.image.src = placeData.photo;
        elements.address.textContent = placeData.address;
        elements.phone.textContent = placeData.phone;
        elements.hours.textContent = placeData.hours;
        elements.rating.textContent = placeData.description;
        elements.link.href = placeData.reviewLink;
        elements.container.classList.remove('hidden');
        elements.container.classList.add('visible');
    };

    // Мобильная панель
    const openMobilePanel = (placeData) => {
        const balloonTitle = document.querySelector('.balloon-title');
        if (!balloonTitle) return;
        balloonTitle.textContent = placeData.name;
        document.querySelector('.balloon-image').src = placeData.photo;
        document.querySelector('.balloon-address').textContent = placeData.address;
        document.querySelector('.balloon-phone').textContent = placeData.phone;
        document.querySelector('.balloon-hours').textContent = placeData.hours;
        document.querySelector('.balloon-rating').textContent = placeData.description;
        document.querySelector('.balloon-review-link').href = placeData.reviewLink;
        bottomSheet.show();
    };

    // Закрытие панелей
    const closeDesktopSidebar = () => {
        const sidebar = document.getElementById('desktop-sidebar');
        if (sidebar) {
            sidebar.classList.remove('visible');
            sidebar.classList.add('hidden');
        }
    };
    document.getElementById('close-sidebar').addEventListener('click', closeDesktopSidebar);

    // Фильтры
    const filterPlacemarks = () => {
        const ratingFilter = document.getElementById('ratingFilter').value;
        const districtFilter = document.getElementById('districtFilter').value;
        const hoursFilter = document.getElementById('hoursFilter').value;
        const searchQuery = document.getElementById('searchInput').value.toLowerCase();

        placemarks.forEach(placemark => {
            const data = placemark.properties.get('customData');
            const rating = parseFloat(data.description.match(/\d\.\d|\d/)[0]);
            const show = 
                (ratingFilter === 'all' || rating >= parseFloat(ratingFilter)) &&
                (districtFilter === 'all' || data.district === districtFilter) &&
                (hoursFilter === 'all' || data.hours === hoursFilter) &&
                data.name.toLowerCase().includes(searchQuery);
            placemark.options.set('visible', show);
        });
    };

    // Инициализация карты
    ymaps.ready(() => {
        if (!map) {
            console.error("Карта не инициализирована [[9]]");
            return;
        }

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
            .catch(error => console.error('Ошибка:', error));

        // Обработчики фильтров
        const filtersPanel = document.getElementById('filters-panel');
        if (filtersPanel) {
            document.getElementById('toggleFilters').addEventListener('click', (e) => {
                e.stopPropagation();
                filtersPanel.classList.toggle('visible');
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('#filters-panel') && !e.target.closest('#toggleFilters')) {
                    filtersPanel.classList.remove('visible');
                }
            });
        }

        // Слушатели фильтров
        document.getElementById('ratingFilter').addEventListener('change', filterPlacemarks);
        document.getElementById('districtFilter').addEventListener('change', filterPlacemarks);
        document.getElementById('hoursFilter').addEventListener('change', filterPlacemarks);
        document.getElementById('searchInput').addEventListener('input', filterPlacemarks);
    });

    // Проверка элементов
    const checkElements = () => {
        const required = [
            'filters-panel',
            'mobile-bottom-sheet',
            'desktop-sidebar',
            'sidebar-title',
            'sidebar-image',
            'sidebar-address',
            'sidebar-phone',
            'sidebar-hours',
            'sidebar-rating',
            'sidebar-review-link'
        ];
        required.forEach(id => {
            if (!document.getElementById(id)) {
                console.error(`Элемент ${id} не найден [[4]]`);
            }
        });
    };
    checkElements();

    // Анимация иконок
    const applyButtonAnimations = () => {
        document.querySelectorAll('.animated-button').forEach(btn => {
            btn.addEventListener('mouseover', () => btn.style.transform = 'scale(1.1)');
            btn.addEventListener('mouseout', () => btn.style.transform = 'scale(1)');
        });
    };
    applyButtonAnimations(); // [[6]]

    // Убедитесь, что карта существует [[9]]
    if (!map) {
        console.error("Карта не инициализирована, долбоёб [[3]]");
    }
});
