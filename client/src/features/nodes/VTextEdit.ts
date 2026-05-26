import type { INode } from "@shared/types";
import { VNode } from "./VNode";
// import { NODE_TYPES } from "./node-registry";


export default class VTextEdit extends VNode {
     private _title = ''
     private elTitle!: HTMLInputElement
     private vLine!: HTMLElement

     constructor(node: INode, container: HTMLElement) {
          super(node, container);

          // this.nodeEss.type = NODE_TYPES.TEXT_EDIT.id

          this.bodyInit()

          // this.body.addEventListener('dblclick', e => {
          //      this.turnOn_EditTitleMode()

          //      const x = e.clientX;
          //      const y = e.clientY;

          //      // Устанавливаем курсор на место клика
          //      const range = document.caretRangeFromPoint(x, y)

          //      if (range) {
          //           const selection = window.getSelection();
          //           selection.removeAllRanges(); // Убираем предыдущее выделение
          //           selection.addRange(range); // Устанавливаем новый диапазон
          //      }
          // })

          // this.bodyInit()
          this.elTitle = this.body.querySelector('.elTitle') as HTMLInputElement

          // this.elTitle.addEventListener('input', () => {
          //      const item = this.cItem.originalItem
          //      item.ess.title = this.elTitle.innerText
          //      this.data.text = elTitle.innerText
          //      item.save(false)
          //      // this.cConnections.refConnectors()

          //      // this.events.onTitleChanged()
          //      this.events.onChanged.on(this.data)
          // })

          this.elTitle.addEventListener('blur', () => {
               this.turnOff_EditTitleMode()
          })

          this.title = this.nodeEss.title || 'УРАААА!!!'

          // this.events.onChanged.add(() => {
          //      this.threads.forEach(th => {
          //           th.reDraw()
          //      })
          // })

     }
     bodyInit() {
          super.bodyInit();
          this.body.innerHTML += `            
            <div class="elTitle"></div>        
`
     }

     saveTitle(v = null) {
          const item = this.cItem.originalItem
          item.ess.title = v ?? this.title
          item.save(false)
     }
     set title(v: string | undefined) {
          this.nodeEss.title = v
          this.render()
     }
     get title() {
          return this.nodeEss.title || ''
     }
     turnOf_edit_byEsc(e) {
          if (e.key === 'Escape') {
               this.turnOff_EditTitleMode()
          }
     }
     set isSelected(v) {
          super.isSelected = v
          if (!v) {
               this.turnOff_EditTitleMode()
          }
     }
     text = {
          selectAll: () => {
               const selection = window.getSelection();
               // Очищаем предыдущее выделение
               selection.removeAllRanges();

               // Создаём новый диапазон (Range)
               const range = document.createRange();
               // Устанавливаем начало диапазона
               range.selectNodeContents(this.elTitle);
               // Добавляем диапазон в выделение
               selection.addRange(range);
          }
     }
     turnOn_EditTitleMode() {
          __globalVar.mode.textEditing = true // = DESK_MODE.TEXT_EDIT
          __globalVar.mode.textNode = true
          this.mode = NODE_MODE.EDIT_TITLE
          // this.elMove.turnOff()
          this.elTitle.contentEditable = true

          document.addEventListener('keydown', e => this.turnOf_edit_byEsc(e))
     }
     turnOff_EditTitleMode() {
          __globalVar.mode.textEditing = false// = DESK_MODE.DEF
          __globalVar.mode.textNode = false
          this.mode = NODE_MODE.MOVE_BLOCK
          // this.elMove.turnOn()
          this.elTitle.contentEditable = false

          document.removeEventListener('keydown', e => this.turnOf_edit_byEsc(e))
     }
     render() {
          super.render()
          const title = this.title
          if (title) {
               const str = title.replace(/\n/g, '<br/>')
               if (str !== this.elTitle.innerHTML) {
                    this.elTitle.innerHTML = str
                    // this.onChange()
               }
          }
     }
}