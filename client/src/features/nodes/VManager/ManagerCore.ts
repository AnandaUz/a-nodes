import VM_area_main from "./VM_area_main";
import type VM_area_sub from "./VM_area_sub";

export class ManagerCore {
  areas = {
    main: new Map<string, VM_area_main>(),
    subs: new Map<string, VM_area_sub>(),
  };
  constructor() {}

  init() {}
}
