class BottomSheet {
    constructor(element) {
        this.element = element;
        this.handle = element.querySelector('.swipe-handle');
        this.content = element.querySelector('.bottom-sheet-content');
        this.closeButton = element.querySelector('.close-balloon');
        this.state = 'hidden';
        this.startY = 0;
        this.startTranslateY = 0;
        this.isDragging = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.calculateDimensions();
    }

    calculateDimensions() {
        this.collapsedHeight = window.innerHeight * 0.15;
        this.expandedHeight = window.innerHeight * 0.85;
        this.minTranslateY = -this.expandedHeight + this.collapsedHeight;
    }

    setupEventListeners() {
        this.handle.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
        document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.onTouchEnd.bind(this));
        
        this.handle.addEventListener('mousedown', this.onMouseStart.bind(this));
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        document.addEventListener('mouseup', this.onMouseEnd.bind(this));
        
        this.closeButton.addEventListener('click', () => this.hide());
        window.addEventListener('resize', this.calculateDimensions.bind(this));
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
        
        if (currentTranslateY > -threshold) {
            this.collapse();
        } else {
            this.expand();
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
            this.state = 'hidden';
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
}

document.addEventListener('DOMContentLoaded', () => {
    const bottomSheet = new BottomSheet(document.getElementById('mobile-bottom-sheet'));
    
    // Здесь будет код инициализации карты и обработчиков
    // ...
});
