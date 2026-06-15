import { Helper } from "./Helper";
import { core, EVENTS } from "@/features/core/core";
import type Helper_sub from "./Helper_sub";
import type { VNode } from "../../VNode";
import type VM_area_main from "../VM_area_main";

class Btn {
  helperMain!: Helper_main;
  // subHelper?: Helper_sub;
  isActive = false;

  body: HTMLDivElement;
  constructor(helperMain: Helper_main) {
    this.helperMain = helperMain;
    this.body = document.createElement("div");
    this.body.className = "bt";

    this.body.addEventListener("click", async () => {
      this.active = !this.active;
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
}

export default class Helper_main extends Helper {
  subHelper?: Helper_sub;
  btns = new Map<string, Btn>();
  //   init() {
  //     super.init();

  //   }
  render() {
    super.render();
    // if (mainArea !== _mainArea) return;

    this.btnBlockEl.innerHTML = "";
    this.btns.clear();

    this.mainArea.subAreas.forEach((subArea) => {
      const btn = new Btn(this);
      this.btns.set(subArea.nodeEss._id || "", btn);
      btn.body.style.setProperty(
        "--color",
        `hsl(${subArea.nodeEss.exData?.bgColor || 0}, 100%, 50%)`,
      );
      btn.body.addEventListener("click", async () => {
        // core.store.emit(EVENTS.helper.main.btnConnection, {
        //   helperMain: this,
        //   subArea,
        // });
      });
      this.btnBlockEl.appendChild(btn.body);
    });
    // const helper_sub = [...subArea.helpers.values()].find((helper) =>
    //   helper.mainNode.nodeEss.exData?.ownerNodesIds?.includes(
    //     this.mainNode.nodeEss._id || "",
    //   ),
    // );
    // if (helper_sub) {
    //   btn.active = true;
    // }
  }
  constructor(mainNode: VNode, _mainArea: VM_area_main) {
    super(mainNode, _mainArea);

    // this.unsubscribers.push(

    // );
    this.unsubscribers.push(
      core.store.on(EVENTS.helper.sub.btnOk, ({ helperSub }) => {
        const subId = helperSub.mainNode.nodeEss.exData?.ownerNodesIds?.[0];
        if (!subId) return;
        if (this.mainNode.nodeEss._id !== subId) return;

        const btn = this.btnsConnection.get(
          helperSub.mainArea.nodeEss._id || "",
        );
        if (btn) {
          btn.active = false;
        }

        let f = false;
        this.btnsConnection.forEach((btn) => {
          f = f || btn.active;
        });
        if (!f) {
          core.nodeManager.okNode(this.mainNode.nodeEss._id || "");

          return;
        }
      }),
    );
  }
}
