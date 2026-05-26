import { core } from "@features/core/core";
import SelectionRect from "./SelectionRect";

import "./SelectManager.scss";
import type { VNode } from "@/features/nodes/VNode";
import { TransformMove } from "./TransformMove";


export class SelectManager {
    private body: HTMLElement
    // is_mdown = false

    // p1 = {x:0,y:0}
    // p2 =  {x:0,y:0}

    // private is_on = true
    // m_sel = []
    // is_multi_sel = false
    // is_sel = false
    // is_moved = false
    // wasSelecting = false
    // wasButtons: number = 0
    // onMove
    selectedNodes = new Map<string, VNode>()

    transformMove: TransformMove = new TransformMove(this)


    // private elGlobalMoving: MovingGlobal
    // /** @type HTMLElement */
    // mainView
    // /** @type Thread[] */
    // selectedThreads= []

    private onMouseDown(e: MouseEvent) {
        if (!this.is_on) return
        this.wasButtons = e.buttons

        // if (__globalVar.mode === DESK_MODE.TEXT_EDIT) return;

        // if (Global_var.mode === Global_var.MODE_SET_PARENT) return;

        // if (__globalVar.mode.threads) return;

        if (e.buttons === 1) {

            if (core.mode.selectMoving) return;//если двигаю объекты мышкой, то не срабатывать
            const x = e.pageX
            const y = e.pageY

            this.wasSelecting = false

            // const selNode = this.checkNodeByPoint(x, y)
            // if (selNode) {
            //     this.wasSelecting = true
            //     if (selNode.mode === NODE_MODE.EDIT_TITLE) {
            //         return;
            //     }
            //     if (!selNode._isSelected) {
            //         this.selectingNode(selNode, e)
            //         __desk.rightMenu.showForSelected()
            //     }
            // }

            // this.is_mdown = true;

            // this.is_moved = false

            if (this.wasSelecting) {
                this.transform.moving.start(e)
            } else {
                if (!e.ctrlKey) this.clearSelection()
                this.selecting.start(e)
            }


        }
        // if (!e.ctrlKey && !e.altKey) {
        //     if (this.is_sel) {
        //         this.unsel_all()
        //     }
        // }

    }

    onVNodeClick(e: PointerEvent, vnode: VNode) {
        if (e.ctrlKey) {
            if (vnode.isSelected) {
                this.selectedNodes.set(vnode._id, vnode)
            } else {
                this.selectedNodes.delete(vnode._id)
            }
        } else {
            this.clearSelection()
            vnode.select()
            this.selectedNodes.set(vnode._id, vnode)
        }

    }

    constructor() {
        this.body = document.createElement("elSelection");
        this.body.classList.add("selectBox");
        document.body.appendChild(this.body);

        const mainBlock = document.body

        const selectionRect = new SelectionRect(mainBlock, (rect, mouseEvent) => {

            if (!core.mode.selectMoving && (rect.width < 10 || rect.height < 10)) {
                this.clearSelection()
                return;
            }

            if (!core.mode.selectMoving && !mouseEvent.ctrlKey) this.clearSelection()
            core.nodeRenderer.elements.forEach((vnode) => {
                if (vnode.checkInRect(rect)) {
                    if (!vnode.isSelected) {
                        this.selectedNodes.set(vnode._id, vnode)
                        vnode.select()
                    }
                }
            })
            core.mode.selectMoving = false

            // if (this.wasButtons === 1) {
            //     // if (!this.wasSelecting) {
            //     //     this.clearSelection()
            //     // }

            //     // mainView.removeEventListener('selectstart', this.globalSelecting);

            //     if (this.is_mdown) {
            //         this.is_mdown = false;


            //     }
            // }
        });

        // mainBlock.addEventListener('mousedown', e => this.onMouseDown(e));
        // mainBlock.addEventListener('mouseup', e => {

        // });

    }


    selectingNode(node, e, zoneSelecting = false) {
        if (e.buttons === 1) {
            if (e.ctrlKey || zoneSelecting) {
                this.wasSelecting = true
                if (!node.isSelected) {
                    if (node.isSelectAble) {
                        node.isSelected = true
                        this.selectedNodes.push(node)
                    }

                }

            } else {
                this.clearSelection()

                if (node.isSelectAble) {
                    this.wasSelecting = true
                    node.isSelected = true
                    this.selectedNodes = []
                    this.selectedNodes.push(node)
                }

            }
        }
    }

    move_mult_sel(dp, move_e) {
        for (let i in this.m_sel) {
            let e = this.m_sel[i]
            e.move(dp)
        }
    }
    unsel_all() {
        for (let i in this.m_sel) {
            let e = this.m_sel[i]

            e.blur_card()
        }
        this.m_sel = []
        this.is_multi_sel = false
        this.is_sel = false
    }
    remove_ess(ess) {
        delete this.m_sel[ess.id]
        this.refresh()
    }
    refresh() {
        let t = 0
        let ess
        for (let i in this.m_sel) {
            t++
            ess = this.m_sel[i]
        }

        if (t > 1) {
            for (let i in this.m_sel) {
                let e = this.m_sel[i]
                e.el_drag_all.is_on = true
                e.el_title.set_blur()
            }
            this.is_multi_sel = true
        }
        else {
            if (t === 1) {
                // ess.el_drag_all.is_on = false
            }
            else {
                this.is_sel = false
            }
            this.is_multi_sel = false
        }
    }

    add_ess(ess) {
        this.m_sel[ess.id] = ess

        this.refresh()
        this.is_sel = true

        if (this.count === 1) {
            Global_var.selected_ess = ess

        }
    }
    get count() {
        let t = 0
        for (let i in this.m_sel) {
            t++
        }
        return t
    }
    // globalSelecting = (e) => {
    //     // Tools.stopEvent(e)
    // }
    // transform = {
    //     moving: {
    //         mode: 0,
    //         isMoved: false,
    //         s_x: 0,
    //         s_y: 0,
    //         stopContextMenu: e => {
    //             e.preventDefault();
    //         },
    //         stopByClick: e => {
    //             const _this = this.transform.moving
    //             // if (e.buttons === 1) {
    //             //     Tools.stopEvent(e)
    //             // }
    //             if (e.buttons === 2) {
    //                 for (const selectedNode of this.selectedNodes) {
    //                     selectedNode.moving.esc()
    //                 }
    //             }
    //             _this.stop(e)
    //         },
    //         startContextMenu: e => {
    //             const _this = this.transform.moving
    //             setTimeout(() => {
    //                 document.removeEventListener("contextmenu", _this.stopContextMenu)
    //             }, 100)
    //         },
    //         startByHotKey: () => {
    //             const _this = this.transform.moving
    //             _this.start()
    //             _this.mode = 1

    //             document.addEventListener("contextmenu", _this.stopContextMenu);

    //             document.addEventListener('mousedown', _this.stopByClick)
    //             document.addEventListener('mouseup', _this.startContextMenu)


    //         },
    //         start: (e) => {
    //             const _this = this.transform.moving
    //             this.elGlobalMoving.onStart = () => { }
    //             this.elGlobalMoving.onStop = () => { }

    //             _this.isMoved = false

    //             for (const selectedNode of this.selectedNodes) {
    //                 selectedNode.moving.start()
    //             }
    //             this.elGlobalMoving.onMove = this.transform.moving.doing

    //             document.addEventListener('mouseup', _this.stop)

    //             this.elGlobalMoving.start(e)
    //             _this.s_x = this.selectedNodes[0].body.offsetLeft
    //             _this.s_y = this.selectedNodes[0].body.offsetTop
    //         },
    //         doing: (e) => {
    //             const _this = this.transform.moving
    //             let x = e.dx / __desk.scale
    //             let y = e.dy / __desk.scale

    //             if (e.shiftKey) {
    //                 x = 0
    //             }

    //             if (e.ctrlKey) {
    //                 const gx = Math.round((_this.s_x + e.dx) / GRID.H) * GRID.H
    //                 const dx = _this.s_x - gx

    //                 // const gy = Math.round((_this.s_y + e.dy)/GRID.V)*GRID.V
    //                 // const dy = _this.s_y - gy
    //                 x = -dx
    //                 // y = -dy
    //             }
    //             if (e.ctrlKey && e.shiftKey) {
    //                 y = 0
    //             }
    //             for (const selectedNode of this.selectedNodes) {
    //                 selectedNode.moving.doing(x, y)
    //             }
    //             _this.isMoved = true
    //             __globalVar.mode.selectMoving = true
    //         },
    //         stop: (e) => {
    //             const _this = this.transform.moving
    //             if (_this.isMoved) {
    //                 for (const selectedNode of this.selectedNodes) {
    //                     selectedNode.moving.stop()
    //                 }
    //             }

    //             document.removeEventListener('mousedown', _this.stopByClick)
    //             document.removeEventListener('mouseup', _this.startContextMenu)
    //             document.removeEventListener('mouseup', _this.stop)

    //             this.elGlobalMoving.stop()

    //             _this.mode = 0
    //             __globalVar.mode.selectMoving = false

    //             //
    //             for (const cItem of __desk.nodeList.cItems) {
    //                 const node = cItem.nodeV
    //                 if (node && node.isInRect(e.clientX, e.clientY, 1, 1)) {

    //                     if (!node._isSelected) {
    //                         node.onSelectedDrop && node.onSelectedDrop()
    //                     }
    //                 }
    //             }
    //         }
    //     }
    //     , align00: {
    //         doing: () => {
    //             if (this.selectedNodes.length < 1) return
    //             const paddingBottom = 0
    //             const paddingLeft = GRID.H
    //             const m = [...this.selectedNodes]
    //             m.sort((a, b) => a.y - b.y)

    //             let x, y, h
    //             for (const nodeV of m) {
    //                 const nRect = nodeV.body.getBoundingClientRect()
    //                 if (!y) {
    //                     y = nodeV.body.offsetTop
    //                     x = nodeV.body.offsetLeft
    //                 } else {
    //                     const xx = Math.round((nodeV.x - x) / paddingLeft)

    //                     nodeV.moveTo(x + xx * paddingLeft, y, true)

    //                 }

    //                 y += nodeV.body.offsetHeight + paddingBottom
    //             }
    //         }
    //     }
    //     , align01: () => {
    //         if (this.selectedNodes.length < 1) return
    //         const paddingBottom = 0

    //         const m = [...this.selectedNodes]
    //         m.sort((a, b) => a.y - b.y)

    //         let x, y, h
    //         for (const nodeV of m) {
    //             const nRect = nodeV.body.getBoundingClientRect()
    //             if (!y) {
    //                 y = nodeV.body.offsetTop
    //                 x = nodeV.body.offsetLeft
    //             } else {
    //                 nodeV.moveTo(x, y, true)
    //             }
    //             y += nodeV.body.offsetHeight + paddingBottom
    //         }
    //     }
    //     , align03: {
    //         doing: () => {
    //             if (this.selectedNodes.length < 1) return
    //             const paddingBottom = 0
    //             const paddingLeft = GRID.H
    //             const m = [...this.selectedNodes]
    //             m.sort((a, b) => a.y - b.y)

    //             const xx = m[0].body.offsetLeft
    //             for (const nodeV of m) {
    //                 nodeV.moveTo(xx, null, true)
    //             }
    //         }
    //     }

    // }
    // thread = {
    //     add: th => {
    //         this.selectedThreads.push(th)
    //         __globalVar.mode.threads_selected = true
    //     },
    //     clear: () => {
    //         this.selectedThreads.forEach(el =>
    //             el.unselect())
    //         __globalVar.mode.threads_selected = false
    //         this.selectedThreads = []
    //     }
    // }
    // inObjThreading = {
    //     x: 0, y: 0, w: 0, h: 0, hoverCon: null,
    //     startConn: null,

    //     start: (connector) => {
    //         const _this = this.inObjThreading
    //         this.elGlobalMoving.onMove = _this.doing
    //         __globalVar.mode.threads = true

    //         this.elGlobalMoving.start()
    //         document.addEventListener('mouseup', _this.stop)

    //         //обновляем данные по расположению всех коннекторов
    //         // __connectors.forEach(conn=>{
    //         //     conn.refOverRect()
    //         // })
    //         _this.startConn = connector
    //         this.selectedNodes.forEach(node => {
    //             node.start_threading(connector.id)
    //         })
    //     },
    //     doing: (e) => {
    //         const _this = this.inObjThreading
    //         _this.hoverCon = null
    //         __desk.nodeList.nodeVs.some(node => {
    //             if (node) {

    //                 if (node.cItem.originalItem.ess.type !== NODE_TYPES.THREAD.typeInBase) {
    //                     if (node.isPointOver(__desk.mousePointGlobal.x, __desk.mousePointGlobal.y)) {

    //                         if (node.ess._id === _this.startConn.parentNode.ess._id) return
    //                         switch (_this.startConn.id) {
    //                             case CONNECTOR_ID.baseIn:
    //                                 _this.hoverCon = node.options.options[CONNECTOR_ID.baseOut].connector
    //                                 return true

    //                             case CONNECTOR_ID.baseOut:
    //                                 _this.hoverCon = node.options.options[CONNECTOR_ID.baseIn].connector
    //                                 return true
    //                         }
    //                     }
    //                 }
    //             }
    //         })
    //         // __connectors.some(conn=>{
    //         //     if (conn !== _this.startConn) {
    //         //         if (_this.startConn.dir !== conn.dir) {
    //         //             if (conn.isOver(__desk.mousePoint.x,__desk.mousePoint.y)) {
    //         //                 _this.hoverCon = conn
    //         //                 return true
    //         //             }
    //         //         }
    //         //     }
    //         // })
    //         this.selectedNodes.forEach(node => {
    //             const th = node.threadHelper

    //             if (_this.hoverCon) {
    //                 if (_this.hoverCon.id === CONNECTOR_ID.baseIn) {
    //                     th.connFrom = _this.hoverCon
    //                 } else {
    //                     th.connTo = _this.hoverCon
    //                 }
    //             } else {
    //                 if (_this.startConn.dir === CONNECTOR_ID.baseIn) {
    //                     th.connFrom = null
    //                 } else {
    //                     th.connTo = null
    //                 }
    //             }

    //             th.reDraw()
    //         })
    //     },
    //     stop: () => {
    //         const _this = this.inObjThreading
    //         __globalVar.mode.threads = false

    //         this.elGlobalMoving.stop()
    //         document.removeEventListener('mouseup', _this.stop)


    //         this.selectedNodes.forEach(sNode => {
    //             sNode.threadHelper.delete()
    //             sNode.threadHelper = null
    //         })

    //         let f = true
    //         /** @type Connector */
    //         const conn = _this.hoverCon
    //         if (!conn) {

    //         } else {
    //             let nodeFrom = null
    //             this.selectedNodes.forEach(sNode => {
    //                 if (_this.startConn.dir === CONNECTOR_DIR.in) {
    //                     const connFrom = sNode.options.options[_this.startConn.id].connector
    //                     const connTo = conn
    //                     sNode.options.connectConnects({ connFrom, connTo })

    //                     sNode.options.save()
    //                     sNode.events.onChanged.on(sNode.data)

    //                 } else {
    //                     nodeFrom = conn.parentNode
    //                     // const connTo = sNode.cConnections.getConnectorsById(_this.startConn.id)
    //                     /** @type Connector */
    //                     const connTo = sNode.options.options[_this.startConn.id].connector
    //                     const connFrom = conn
    //                     const c = nodeFrom.options.connectConnects({
    //                         connTo,
    //                         connFrom
    //                     })
    //                     connTo.parentNode.events.onChanged.on(connTo.parentNode.data)

    //                     nodeFrom.options.save()
    //                     // c.thread.reDraw()
    //                 }
    //             })

    //             this.selectedNodes.forEach(sNode => {
    //                 if (_this.startConn.dir === CONNECTOR_DIR.in) {
    //                     const connTo = conn
    //                     connTo.parentNode.events.onChanged.on()

    //                 } else {
    //                     sNode.events.onChanged.on()
    //                 }
    //             })

    //         }
    //         // __desk.hideAllConnectors()

    //     }
    // }
    // threading = {
    //     x: 0, y: 0, w: 0, h: 0,
    //     start: () => {
    //         const _this = this.threading
    //         this.elGlobalMoving.onMove = _this.doing
    //         __globalVar.mode.threads = true

    //         this.elGlobalMoving.start()
    //         document.addEventListener('mouseup', _this.stop)
    //     },
    //     doing: (e) => {
    //         const sNode = this.selectedNodes[0]
    //         for (const selectedThread of this.selectedThreads) {
    //             selectedThread.reDraw()
    //         }

    //         // sNode.reDraw_threads(__desk.mousePoint.x,__desk.mousePoint.y)
    //     },
    //     stop: (e) => {
    //         const _this = this.threading
    //         __globalVar.mode.threads = false

    //         this.elGlobalMoving.stop()
    //         document.removeEventListener('mouseup', _this.stop)

    //         let f = true
    //         for (const cItem of __desk.nodeList.cItems) {
    //             const node = cItem.nodeV
    //             if (node && node.isInRect(e.clientX, e.clientY, 1, 1)) {

    //                 if (!node._isSelected) {
    //                     for (const selectedThread of this.selectedThreads) {
    //                         const item = selectedThread.cItem.originalItem
    //                         const sEss = item.ess
    //                         sEss.points[1] = node.cItem.originalItem.ess._id
    //                         item.save(false)
    //                         selectedThread.findNodes()
    //                         selectedThread.reDraw()
    //                     }
    //                     f = false
    //                 }
    //             }
    //         }
    //         if (f) {
    //             for (const selectedThread of this.selectedThreads) {
    //                 selectedThread.delete()
    //             }
    //             this.thread.clear()
    //         }


    //     }
    // }
    // selecting = {
    //     x: 0, y: 0, w: 0, h: 0,
    //     start: (e) => {
    //         const _this = this.selecting
    //         this.elGlobalMoving.onMove = _this.doing
    //         // this.elGlobalMoving.onStop = _this.stop

    //         _this.x = 0
    //         _this.y = 0
    //         _this.w = 0
    //         _this.h = 0

    //         this.p1.x = e.x
    //         this.p1.y = e.y
    //         this.elGlobalMoving.start(e)
    //         document.addEventListener('mouseup', _this.stop)
    //     },
    //     doing: (e) => {
    //         this.p2.x = e.x
    //         this.p2.y = e.y

    //         let x, y, w, h
    //         if (this.p1.x < this.p2.x) {
    //             x = this.p1.x
    //             this.body.classList.remove('v2')
    //         }
    //         else {
    //             x = this.p2.x
    //             this.body.classList.add('v2')
    //         }
    //         if (this.p1.y < this.p2.y) {
    //             y = this.p1.y
    //         }
    //         else {
    //             y = this.p2.y
    //         }
    //         w = Math.abs(this.p1.x - this.p2.x)
    //         h = Math.abs(this.p1.y - this.p2.y)

    //         const _this = this.selecting
    //         _this.x = x
    //         _this.y = y
    //         _this.w = w
    //         _this.h = h

    //         const st = this.body.style
    //         st.left = x + 'px'
    //         st.top = y + 'px'
    //         st.width = w + 'px'
    //         st.height = h + 'px'
    //     },
    //     stop: (e) => {
    //         const _this = this.selecting
    //         this.body.style.left = 0
    //         this.body.style.top = 0
    //         this.body.style.width = 0
    //         this.body.style.height = 0

    //         for (let i in __desk.nodeList.cItems) {
    //             const cItem = __desk.nodeList.cItems[i]

    //             const node = cItem.nodeV
    //             if (!node) {
    //                 continue
    //             }

    //             if (node.isInRect(_this.x, _this.y, _this.w, _this.h)) {
    //                 if (e.altKey) {
    //                     this.remove_ess(ess)
    //                 }
    //                 else {
    //                     const _e = { buttons: 1 }
    //                     this.selectingNode(node, _e, true)
    //                 }
    //             }
    //         }
    //         this.elGlobalMoving.stop()
    //         document.removeEventListener('mouseup', _this.stop)

    //         __desk.rightMenu.showForSelected()
    //     }
    // }

    clearSelection() {
        this.selectedNodes.forEach((vnode) => {
            vnode.unselect()
        })
        this.selectedNodes.clear()
    }

    // checkNodeByPoint(x: number, y: number) {



    //     for (let i in __desk.nodeList.nodeVs) {
    //         /** @type NodeV */
    //         const node = __desk.nodeList.nodeVs[i]
    //         if (!node) {
    //             continue
    //         }
    //         if (node.isPointOver && node.isPointOver(x, y)) {
    //             if (node.isSelectAble) return node
    //             else continue
    //         }
    //     }
    //     return false
    // }



}
