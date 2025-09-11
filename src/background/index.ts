chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TILT_STARTED") {
    console.log("TILT_STARTED");
    chrome.notifications.create({
      type: "basic",
      title: "Chess Break",
      message: "Tilt prevention started. You will be notified when it ends.",
      iconUrl: "public/logo.png",
    });
  }
  if (message.type === "TILT_ENDED") {
    console.log("TILT_ENDED");
    chrome.notifications.create({
      type: "basic",
      title: "Chess Break",
      message: `Tilt prevention ended after ${message.data.timeout}ms`,
      iconUrl: "public/logo.png",
    });
  }
});
