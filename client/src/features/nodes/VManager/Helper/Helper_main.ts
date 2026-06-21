import { Helper } from "./Helper";
import { core } from "@/features/core/core";
import type Helper_sub from "./Helper_sub";
import type { VNode } from "../../VNode";
import type VM_area_main from "../VM_area_main";
import type VM_area from "../VM_area";
import VTextEditClone from "../../VTextEditClone";

class Btn {
  mainHelper!: Helper_main;
  isActive = false;
  subArea!: VM_area;
  toHelper!: Helper;
  fromHelper!: Helper;

  body: HTMLDivElement;
  constructor(mainHelper: Helper_main) {
    this.mainHelper = mainHelper;
    this.body = document.createElement("div");
    this.body.className = "bt";

    this.body.addEventListener("click", async () => {
      this.active = !this.active;

      if (this.active) {
        await (this.subArea as VM_area_main).addTextEdinCloneNode(
          this.mainHelper.mainNode.nodeEss,
        );
        this.mainHelper.mainArea.refreshHelpers();
      } else {
        if (this.toHelper) {
          (this.toHelper as Helper_main).removeWithNode();
          // this.subArea.refreshHelpers();
        }
      }
    });
  }
  set active(v: boolean) {
    this.isActive = v;
    v
      ? this.body.classList.add("active")
      : this.body.classList.remove("active");
  }
  get active() {
    return this.isActive;
  }

  refresh() {
    this.subArea.helpers.some((h) => {
      const toVNode = h.mainNode;
      if (toVNode instanceof VTextEditClone) {
        if (
          toVNode.nodeEss.exData?.ownerNodesIds?.includes(
            this.mainHelper.mainNode.nodeEss._id || "",
          )
        ) {
          this.toHelper = h;
          if (!this.mainHelper.toHelper.includes(h)) {
            this.mainHelper.toHelper.push(h);
            (h as Helper_main).fromHelper?.push(this.mainHelper);
          }

          return true;
        }
      }
    });
    if (this.toHelper) this.active = true;
    else this.active = false;
  }
}

export default class Helper_main extends Helper {
  subHelper?: Helper_sub;
  btns = new Map<string, Btn>();
  fromHelper: Helper[] = [];
  toHelper: Helper[] = [];
  _level: number = 0;
  render() {
    super.render();

    this.btnBlockEl.innerHTML = "";
    this.btns.clear();

    this.mainArea.subAreas.forEach((subArea) => {
      const btn = new Btn(this);
      this.btns.set(subArea.nodeEss._id || "", btn);
      btn.subArea = subArea;
      btn.body.style.setProperty(
        "--color",
        `hsl(${subArea.nodeEss.exData?.bgColor || 0}, 100%, 50%)`,
      );
      this.btnBlockEl.appendChild(btn.body);
    });

    this.refreshBtns();
  }
  set level(v: number) {
    this._level = v;
    this.body.style.setProperty("--level", v.toString());
  }
  get level() {
    return this._level;
  }
  refreshBtns() {
    this.btns.forEach((btn) => btn.refresh());
  }
  removeWithNode() {
    this.mainArea.removeHelper(this._id);
    core.nodeManager.putInTrashNode(this._id);
  }
  constructor(mainNode: VNode, _mainArea: VM_area_main) {
    super(mainNode, _mainArea);

    // this.unsubscribers.push(

    // );
    // this.unsubscribers.push(
    //   core.store.on(EVENTS.helper.sub.btnOk, ({ helperSub }) => {
    //     const subId = helperSub.mainNode.nodeEss.exData?.ownerNodesIds?.[0];
    //     if (!subId) return;
    //     if (this.mainNode.nodeEss._id !== subId) return;

    //     const btn = this.btnsConnection.get(
    //       helperSub.mainArea.nodeEss._id || "",
    //     );
    //     if (btn) {
    //       btn.active = false;
    //     }

    //     let f = false;
    //     this.btnsConnection.forEach((btn) => {
    //       f = f || btn.active;
    //     });
    //     if (!f) {
    //       core.nodeManager.okNode(this.mainNode.nodeEss._id || "");

    //       return;
    //     }
    //   }),
    // );
  }
}
