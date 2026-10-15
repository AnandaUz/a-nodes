import type { LNode } from "./LNode";

export default class TRepeatMode {
  private owner: LNode;
  private _mode = 0;
  private _date: Date | null = null;

  set mode(v: number) {
    this._mode = v;
    this.refreshIndicator();
  }
  get mode() {
    return this._mode;
  }

  constructor(owner: LNode) {
    this.owner = owner;
  }

  setDelay(delay: number) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + delay);

    this.owner.hide();
    this.date = d;
  }
  get date() {
    return this._date;
  }
  set date(v: Date | null) {
    if (v) {
      this._date = new Date(v.getTime());
      this._date.setHours(0, 0, 0, 0);
    } else {
      this._date = null;
    }

    this.refreshIndicator();
  }
  refreshIndicator() {
    const vNode = this.owner.vNode;
    if (!vNode) return;
    if (this.mode > 0 || this._date) {
      vNode.repeatMode.showIndicator();
    } else {
      vNode.repeatMode.hideIndicator();
    }
  }
  // set showAtDay(date: Date) {}
}
