
export default class MovingGlobal {
    private y: number = 0
    private x: number = 0
    private sX: number = 0
    private sY: number = 0
    private onStart: (x: number, y: number) => void = () => { }
    private onStop: (x: number, y: number) => void = () => { }
    private onMove: ({ x, y, shiftKey, ctrlKey, altKey, dx, dy }: { x: number, y: number, shiftKey: boolean, ctrlKey: boolean, altKey: boolean, dx: number, dy: number }) => void = () => { }
    private isOn = false
    private xx: number = 0
    private yy: number = 0
    private kSlowly: number = 0.01



    constructor({
        onMove = () => { },
        onStop = () => { },
        onStart = () => { },
        kSlowly = 1
    }) {

        this.onMove = onMove
        this.onStop = onStop
        this.onStart = onStart
        this.kSlowly = kSlowly

        document.addEventListener('mousemove', this.onMouseMove)
    }
    private onMouseMove = (e: MouseEvent) => {
        this.xx = e.clientX
        this.yy = e.clientY

        if (!this.isOn) return
        // Tools.stopEvent(e)
        let dx = e.clientX - this.sX
        let dy = e.clientY - this.sY
        if (e.shiftKey) {
            dx = dx * this.kSlowly
            dy = dy * this.kSlowly
        }
        this.x = this.sX + dx
        this.y = this.sY + dy

        this.onMove({ x: this.x, y: this.y, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, altKey: e.altKey, dx, dy })
    }
    start(e?: MouseEvent) {
        this.isOn = true

        if (!e) {
            this.sX = this.xx
            this.sY = this.yy
        } else {
            this.sX = e.clientX
            this.sY = e.clientY
        }
        this.onStart(this.x, this.y)
    }
    stop() {
        this.isOn = false

        this.onStop(this.x, this.y)
    }

}