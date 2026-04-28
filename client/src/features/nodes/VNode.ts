import type { INode } from "@shared/types";
import { Core } from "../core/core";

export class VNode {
    private container: HTMLElement;
    private body: HTMLElement;
    private isDragging: boolean = false;
    private pointerOffset = { x: 0, y: 0 };

    public _id: string;
    public x: number;
    public y: number;
    
    constructor(node: INode) {

        this._id = node._id;
        this.x = node.x ?? 0;
        this.y = node.y ?? 0;
        
        this.container = Core.desk.nodesEl;
       
        this.body = document.createElement('div');
        this.body.className = 'vNode';
        this.body.dataset['_id'] = node._id;   

       
        this.applyPosition();
        this.container.appendChild(this.body);         
        this.bind();  
    }
    applyPosition() {
        this.body.style.transform = `translate(${this.x}px, ${this.y}px)`;
    }

    updatePosition() {
        this.applyPosition();
    }
    remove() {
        this.body.remove();
    }
    bind() {
        this.body.addEventListener('pointerdown', this.onPointerDown);
        this.body.addEventListener('pointermove', this.onPointerMove);
        this.body.addEventListener('pointerup',   this.onPointerUp);
    }

    unbind() {
        this.body.removeEventListener('pointerdown', this.onPointerDown);
        this.body.removeEventListener('pointermove', this.onPointerMove);
        this.body.removeEventListener('pointerup',   this.onPointerUp);
    }
    private onPointerDown = (e: PointerEvent) => {
        if (e.button !== 0) return;     
        
        e.preventDefault();
        e.stopPropagation();

        this.isDragging = true;

        const worldPos = Core.desk.viewport.screenToWorld(e.clientX, e.clientY);
        this.pointerOffset = {
            x: worldPos.x - (this.x || 0),
            y: worldPos.y - (this.y || 0),
        };

        this.body.setPointerCapture(e.pointerId);
        this.body.classList.add('is-dragging');
    };

    private onPointerMove = (e: PointerEvent) => {
        if (!this.isDragging) return;

        const worldPos = Core.desk.viewport.screenToWorld(e.clientX, e.clientY);

        this.x = worldPos.x - this.pointerOffset.x;
        this.y = worldPos.y - this.pointerOffset.y;
        this.applyPosition();
        Core.store.moveNode(this._id,this.x,this.y);       
    };

    private onPointerUp = () => {
        if (!this.isDragging) return;

        // const nodeEl = this.renderer.getElement(this.draggingId);
        this.body.classList.remove('is-dragging');

        this.isDragging = false;
        Core.store.updateNode(this._id,this);
    };
}