import html from "./test.html?raw";

import "./test.scss";

export function testPage() {
  return {
    html,
    async init() {
      let btn = document.createElement("button");
      btn.innerText = "Нажми";
      document.body.appendChild(btn);

      btn.addEventListener("click", () => {});

      const promise = new Promise((resolve) => {
        btn.addEventListener("click", () => {
          resolve(1);
        });
      });

      const result = await promise;

      btn = document.createElement("button");
      btn.innerText = "Нажми";
      document.body.appendChild(btn);

      console.log(result);
    },
  };
}
