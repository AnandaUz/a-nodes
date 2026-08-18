import { Helper } from "./Helper";
import { core } from "@/features/core/core";
import type Helper_sub from "./Helper_sub";
import type { VNode } from "../../VNode";
import type VM_frame_main from "../VFrame_main";
import type VM_frame from "../VFrame";
import VTextEditClone from "../../VTextEditClone";

class Btn {
  mainHelper!: Helper_main;
  isActive = false;
  subFrame!: VM_frame;
  toHelper!: Helper;
  fromHelpers!: Helper;

  body: HTMLDivElement;
  constructor(mainHelper: Helper_main) {
    this.mainHelper = mainHelper;
    this.body = document.createElement("div");
    this.body.className = "bt";

    this.body.addEventListener("click", async () => {
      this.active = !this.active;

      // const mainFrame = this.mainHelper.mainFrame;
      if (this.active) {
        const r = await (this.subFrame as VM_frame_main).addTextEditCloneNode(
          this.mainHelper.mainNode.nodeEss,
        );
        if (r && r.helper) {
          this.mainHelper.toHelper.push(r.helper);
          (r.helper as Helper_main).fromHelpers.push(this.mainHelper);
        }
      } else {
        if (this.toHelper) {
          (this.toHelper as Helper_main).removeWithNode();

          this.mainHelper.level = 0;
        }
      }
      this.subFrame.refreshHelpers();
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
    this.subFrame.helpers.some((h) => {
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
            (h as Helper_main).fromHelpers?.push(this.mainHelper);
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
  fromHelpers: Helper[] = [];
  toHelper: Helper[] = [];
  _level: number = 0;
  render() {
    // console.log("Helper_main");
    super.render();

    this.btnBlockEl.innerHTML = "";
    this.btns.clear();

    this.mainFrame.subFrames.forEach((subFrame) => {
      const btn = new Btn(this);
      this.btns.set(subFrame.nodeEss._id || "", btn);
      btn.subFrame = subFrame;
      btn.body.style.setProperty(
        "--color",
        `hsl(${subFrame.nodeEss.exData?.bgColor || 0}, 100%, 50%)`,
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
    this.mainFrame.removeHelper(this._id);
    core.nodeManager.putInTrashNode(this._id);
  }
  constructor(mainNode: VNode, _mainFrame: VM_frame_main) {
    super(mainNode, _mainFrame);

    // this.unsubscribers.push(

    // );
    // this.unsubscribers.push(
    //   core.store.on(EVENTS.helper.sub.btnOk, ({ helperSub }) => {
    //     const subId = helperSub.mainNode.nodeEss.exData?.ownerNodesIds?.[0];
    //     if (!subId) return;
    //     if (this.mainNode.nodeEss._id !== subId) return;

    //     const btn = this.btnsConnection.get(
    //       helperSub.mainFrame.nodeEss._id || "",
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
