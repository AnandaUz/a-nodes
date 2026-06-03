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
    helperMain.elBtBlock.appendChild(this.body);

    this.body.addEventListener("click", async (e) => {
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
  btnsConnection = new Map<string, Btn>();
  //   init() {
  //     super.init();

  //   }
  constructor(nodeMain: VNode, _areaMain: VM_area_main) {
    super(nodeMain, _areaMain);

    this.unsubscribers.push(
      core.store.on(EVENTS.area.sub.connected, ({ areaSub, areaMain }) => {
        if (areaMain !== _areaMain) return;

        let btn = this.btnsConnection.get(areaSub.nodeEss._id || "");
        if (!btn) {
          btn = new Btn(this);
          this.btnsConnection.set(areaSub.nodeEss._id || "", btn);
          btn.body.style.setProperty(
            "--color",
            `hsl(${areaSub.nodeEss.exData?.color || 0}, 100%, 50%)`,
          );
          btn.body.addEventListener("click", async () => {
            core.store.emit(EVENTS.helper.main.btnConnection, {
              helperMain: this,
              areaSub,
            });
          });
        }
        const helper_sub = [...areaSub.helpers.values()].find((helper) =>
          helper.nodeMain.nodeEss.exData?.ownerNodesIds?.includes(
            this.nodeMain.nodeEss._id || "",
          ),
        );
        if (helper_sub) {
          btn.active = true;
        }
      }),
    );
    this.unsubscribers.push(
      core.store.on(EVENTS.helper.sub.btnOk, ({ helperSub }) => {
        const subId = helperSub.nodeMain.nodeEss.exData?.ownerNodesIds?.[0];
        if (!subId) return;
        if (this.nodeMain.nodeEss._id !== subId) return;

        const btn = this.btnsConnection.get(
          helperSub.areaMain.nodeEss._id || "",
        );
        if (btn) {
          btn.active = false;
        }

        let f = false;
        this.btnsConnection.forEach((btn) => {
          f = f || btn.active;
        });
        if (!f) {
          core.nodeManager.okNode(this.nodeMain.nodeEss._id || "");

          return;
        }
      }),
    );
  }
}
