import { Viewport } from './desk.viewport';
import './desk.scss';
import { Core } from '../core/core';

export class Desk {    
    nodesEl!:            HTMLElement;
    private sceneEl!:            HTMLElement;
    viewport!:           Viewport;    

    async mount(container: HTMLElement) {
        container.innerHTML = `
            <div class="desk-root">
                <div class="desk-scene">
                    <div class="desk-viewport">
                        <div class="desk-svg-layer"></div>
                        <div class="desk-nodes"></div>
                    </div>
                </div>

                <div class="desk-hint">
                    <span class="desk-hint__desktop">Двойной клик — новая нода / редактировать &nbsp;·&nbsp; Зум — <kbd>Ctrl</kbd> + колёсико &nbsp;·&nbsp; Пан — <kbd>Пробел</kbd> + ЛКМ</span>
                    <span class="desk-hint__mobile">Двойной тап — новая нода &nbsp;·&nbsp; Пан — один палец &nbsp;·&nbsp; Зум — щипок</span>
                </div>
            </div>
        `;

        const viewportEl = container.querySelector<HTMLElement>('.desk-viewport')!;
        // const svgLayerEl = container.querySelector<HTMLElement>('.desk-svg-layer')!;
        this.sceneEl     = container.querySelector<HTMLElement>('.desk-scene')!;
        this.nodesEl     = container.querySelector<HTMLElement>('.desk-nodes')!;
        
        this.viewport = new Viewport(viewportEl, this.sceneEl);              

        // Новая нода сразу открывается на редактирование
        // this.renderer.onNodeCreated = (_id: string) => {
        //     this.textEditor.startEditing(_id);
        // };

        // Двойной клик по пустому столу — новая нода
        this.sceneEl.addEventListener('dblclick', (e) => {
            if ((e.target as HTMLElement).closest('.desk-node')) return;
            const { x, y } = this.viewport.screenToWorld(e.clientX, e.clientY);
            Core.store.createNode(x, y);
        });         
    }

    unmount() {               
        this.viewport?.destroy();
        
    }
}
