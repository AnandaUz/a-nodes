export interface ViewportState {
    x: number;
    y: number;
    scale: number;
}

export class Viewport {
    private el: HTMLElement;
    scene: HTMLElement; // нужен для фона и событий
    private state: ViewportState = { x: 0, y: 0, scale: 1 };

    private isPanning = false;
    private panStart = { x: 0, y: 0 };
    private panOrigin = { x: 0, y: 0 };

    // Touch: pinch-to-zoom
    private activeTouches: Map<number, { x: number; y: number }> = new Map();
    private pinchStartDist = 0;
    private pinchStartScale = 1;

    // Двойной тап (мобильный аналог dblclick)
    private lastTapTime = 0;
    private lastTapPos = { x: 0, y: 0 };
    onDoubleTap?: (clientX: number, clientY: number) => void;

    readonly minScale = 0.1;
    readonly maxScale = 4;
    readonly gridSize = 24; // совпадает с background-size в scss

    constructor(el: HTMLElement, scene: HTMLElement) {
        this.el = el;
        this.scene = scene;
        this.bindEvents();
        this.applyTransform();
    }

    // ─── Transform ───────────────────────────────────────────────

    private applyTransform() {
        const { x, y, scale } = this.state;
        this.el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;

        // Двигаем фоновую сетку синхронно с viewport
        const bgSize = this.gridSize * scale;
        const bgX = x % bgSize;
        const bgY = y % bgSize;
        this.scene.style.backgroundSize = `${bgSize}px ${bgSize}px`;
        this.scene.style.backgroundPosition = `${bgX}px ${bgY}px`;
    }

    getState(): Readonly<ViewportState> {
        return { ...this.state };
    }

    screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
        const { x, y, scale } = this.state;
        return {
            x: (screenX - x) / scale,
            y: (screenY - y) / scale,
        };
    }

    // ─── Pan helpers ──────────────────────────────────────────────

    private startPan(clientX: number, clientY: number) {
        this.isPanning = true;
        this.panStart  = { x: clientX, y: clientY };
        this.panOrigin = { x: this.state.x, y: this.state.y };
    }

    private movePan(clientX: number, clientY: number) {
        this.state.x = this.panOrigin.x + (clientX - this.panStart.x);
        this.state.y = this.panOrigin.y + (clientY - this.panStart.y);
        this.applyTransform();
    }

    // ─── Pan (мышь / стилус) ──────────────────────────────────────

    private isSpaceDown = false;

    private onPointerDown = (e: PointerEvent) => {
        if (e.pointerType === 'touch') return; // touch обрабатывается отдельно

        if (e.button !== 1 && !this.isSpaceDown) return;

        e.preventDefault();
        this.startPan(e.clientX, e.clientY);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        this.scene.style.cursor = 'grabbing';
    };

    private onPointerMove = (e: PointerEvent) => {
        if (e.pointerType === 'touch') return;
        if (!this.isPanning) return;
        this.movePan(e.clientX, e.clientY);
    };

    private onPointerUp = (e: PointerEvent) => {
        if (e.pointerType === 'touch') return;
        if (!this.isPanning) return;
        this.isPanning = false;
        this.scene.style.cursor = this.isSpaceDown ? 'grab' : '';
    };

    // ─── Zoom (Ctrl + wheel) ──────────────────────────────────────

    private onWheel = (e: WheelEvent) => {
        if (!e.ctrlKey) return;
        e.preventDefault();

        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        const rect   = this.scene.getBoundingClientRect();
        this.applyZoom(factor, e.clientX - rect.left, e.clientY - rect.top);
    };

    private applyZoom(factor: number, originX: number, originY: number) {
        const newScale = Math.min(this.maxScale, Math.max(this.minScale, this.state.scale * factor));

        this.state.x     = originX - (originX - this.state.x) * (newScale / this.state.scale);
        this.state.y     = originY - (originY - this.state.y) * (newScale / this.state.scale);
        this.state.scale = newScale;

        this.applyTransform();
    }

    // ─── Touch: pan + pinch + double tap ─────────────────────────

    private onTouchStart = (e: TouchEvent) => {
        e.preventDefault();

        for (const t of Array.from(e.changedTouches)) {
            this.activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
        }

        if (this.activeTouches.size === 1) {
            const t = e.changedTouches[0]!;
            this.startPan(t.clientX, t.clientY);

            // Двойной тап
            const now  = Date.now();
            const dx   = t.clientX - this.lastTapPos.x;
            const dy   = t.clientY - this.lastTapPos.y;
            const dist = Math.hypot(dx, dy);

            if (now - this.lastTapTime < 300 && dist < 20) {
                this.onDoubleTap?.(t.clientX, t.clientY);
                this.lastTapTime = 0;
            } else {
                this.lastTapTime = now;
                this.lastTapPos  = { x: t.clientX, y: t.clientY };
            }
        }

        if (this.activeTouches.size === 2) {
            this.isPanning       = false;
            this.pinchStartDist  = this.getPinchDist();
            this.pinchStartScale = this.state.scale;
        }
    };

    private onTouchMove = (e: TouchEvent) => {
        e.preventDefault();

        for (const t of Array.from(e.changedTouches)) {
            this.activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
        }

        if (this.activeTouches.size === 1 && this.isPanning) {
            const t = e.changedTouches[0]!;
            this.movePan(t.clientX, t.clientY);
            return;
        }

        if (this.activeTouches.size === 2) {
            const dist     = this.getPinchDist();
            const newScale = Math.min(
                this.maxScale,
                Math.max(this.minScale, this.pinchStartScale * (dist / this.pinchStartDist))
            );
            const center = this.getPinchCenter();
            const rect   = this.scene.getBoundingClientRect();
            const ox     = center.x - rect.left;
            const oy     = center.y - rect.top;

            this.state.x     = ox - (ox - this.state.x) * (newScale / this.state.scale);
            this.state.y     = oy - (oy - this.state.y) * (newScale / this.state.scale);
            this.state.scale = newScale;

            this.applyTransform();
        }
    };

    private onTouchEnd = (e: TouchEvent) => {
        for (const t of Array.from(e.changedTouches)) {
            this.activeTouches.delete(t.identifier);
        }

        if (this.activeTouches.size === 0) {
            this.isPanning = false;
        }

        if (this.activeTouches.size === 1) {
            // Остался один палец — возобновляем pan с его позиции
            const remaining = Array.from(this.activeTouches.values())[0]!;
            this.startPan(remaining.x, remaining.y);
        }
    };

    private getPinchDist(): number {
        const [a, b] = Array.from(this.activeTouches.values());
        if (!a || !b) return 1;
        return Math.hypot(b.x - a.x, b.y - a.y);
    }

    private getPinchCenter(): { x: number; y: number } {
        const [a, b] = Array.from(this.activeTouches.values());
        if (!a || !b) return { x: 0, y: 0 };
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }

    // ─── Space + drag ─────────────────────────────────────────────

    private onKeyDown = (e: KeyboardEvent) => {
        if (e.code !== 'Space' || e.repeat) return;
        const target = document.activeElement;
        if (target instanceof HTMLElement) {
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        }
        e.preventDefault();
        this.isSpaceDown = true;
        this.scene.style.cursor = 'grab';
    };

    private onKeyUp = (e: KeyboardEvent) => {
        if (e.code !== 'Space') return;
        this.isSpaceDown = false;
        if (!this.isPanning) this.scene.style.cursor = '';
    };

    // ─── Bind / Destroy ───────────────────────────────────────────

    private bindEvents() {
        this.scene.addEventListener('pointerdown', this.onPointerDown);
        this.scene.addEventListener('pointermove', this.onPointerMove);
        this.scene.addEventListener('pointerup',   this.onPointerUp);
        this.scene.addEventListener('wheel',       this.onWheel, { passive: false });

        this.scene.addEventListener('touchstart', this.onTouchStart, { passive: false });
        this.scene.addEventListener('touchmove',  this.onTouchMove,  { passive: false });
        this.scene.addEventListener('touchend',   this.onTouchEnd);

        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup',   this.onKeyUp);
    }

    destroy() {
        this.scene.removeEventListener('pointerdown', this.onPointerDown);
        this.scene.removeEventListener('pointermove', this.onPointerMove);
        this.scene.removeEventListener('pointerup',   this.onPointerUp);
        this.scene.removeEventListener('wheel',       this.onWheel);

        this.scene.removeEventListener('touchstart', this.onTouchStart);
        this.scene.removeEventListener('touchmove',  this.onTouchMove);
        this.scene.removeEventListener('touchend',   this.onTouchEnd);

        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup',   this.onKeyUp);
    }
}
