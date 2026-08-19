import { Helper } from "./Helper";
import { core } from "@/features/core/core";
import type Helper_sub from "./Helper_sub";
import type { VNode } from "../../VNode";
import type VM_frame_main from "../VFrame_main";

class Btn {
  isActive = false;
  body: HTMLDivElement;
  private onTurnOnFunc!: () => void;
  private onTurnOffFunc!: () => void;
  constructor() {
    // this.mainHelper = mainHelper;
    this.body = document.createElement("div");
    this.body.className = "bt";

    this.body.addEventListener("click", async () => {
      this.active = !this.active;
      if (this.active) {
        this.onTurnOnFunc();
      } else {
        this.onTurnOffFunc();
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
  onTurnOn(f: () => void) {
    this.onTurnOnFunc = f;
  }
  onTurnOff(f: () => void) {
    this.onTurnOffFunc = f;
  }
}

export default class Helper_main extends Helper {
  subHelper?: Helper_sub;
  btns = new Map<string, Btn>();

  _level: number = 0;
  render() {
    // console.log("Helper_main");
    super.render();

    this.btnBlockEl.innerHTML = "";
    this.btns.clear();

    this.mainFrame.subFrames.forEach((subFrame) => {
      const btn = new Btn();
      const subFrame_id = subFrame.nodeEss._id || "";

      btn.onTurnOn(async () => {
        await (subFrame as VM_frame_main).addTextEditCloneNode(
          this.mainNode.nodeEss,
        );
        this.mainFrame.refreshHelpersUp();
      });
      btn.onTurnOff(() => {
        const h = this.toHelper.get(subFrame_id) as Helper_main;
        h.remove();

        h.removeWithNode();
        this.mainFrame.refreshHelpersUp();
      });
      this.btns.set(subFrame_id, btn);

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
    this.btns.forEach((btn) => {
      btn.active = false;
    });
    this.toHelper.forEach((_h, i) => {
      const btn = this.btns.get(i);
      if (btn) btn.active = true;
    });
    // btn.refresh();
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
