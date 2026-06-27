import html from "./welcome.html?raw";
import "./welcome.scss";

export function welcomePage() {
  return {
    html,
    title: "Добро пожаловать — Liner",
    init() {
      // document.querySelector(".google-btn")?.addEventListener("click", () => {
      //   (window as any).google?.accounts?.id?.prompt((notification: any) => {
      //     console.log("isNotDisplayed:", notification.isNotDisplayed());
      //     console.log(
      //       "getNotDisplayedReason:",
      //       notification.getNotDisplayedReason(),
      //     );
      //     console.log("isSkippedMoment:", notification.isSkippedMoment());
      //     console.log("getSkippedReason:", notification.getSkippedReason());
      //     console.log("isDismissedMoment:", notification.isDismissedMoment());
      //     console.log("getDismissedReason:", notification.getDismissedReason());
      //   });
      // });

      (window as any).google?.accounts?.id?.renderButton(
        document.querySelector(".for-google-btn"),
        { theme: "outline", size: "large" },
      );
    },
  };
}
