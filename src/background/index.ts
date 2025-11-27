chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message);

  if (message.type === "TILT_STARTED") {
    console.log("TILT_STARTED - creating notification");
    chrome.notifications.create({
      type: "basic",
      title: "Chess Break",
      message: "Tilt prevention started. You will be notified when it ends.",
      iconUrl: "public/logo.png",
    }, (notificationId) => {
      console.log("TILT_STARTED notification created with ID:", notificationId);
      if (chrome.runtime.lastError) {
        console.error("Notification error:", chrome.runtime.lastError);
      }
    });
  }
  if (message.type === "TILT_ENDED") {
    console.log("TILT_ENDED - creating notification");
    chrome.notifications.create({
      type: "basic",
      title: "Chess Break",
      message: `Tilt prevention ended after ${message.data.timeout}ms`,
      iconUrl: "public/logo.png",
    }, (notificationId) => {
      console.log("TILT_ENDED notification created with ID:", notificationId);
      if (chrome.runtime.lastError) {
        console.error("Notification error:", chrome.runtime.lastError);
      }
    });
  }
});
