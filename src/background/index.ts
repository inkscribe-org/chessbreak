chrome.runtime.onMessage.addListener(async (message) => {
  console.log("Background received message:", message);

  // Load options to check notification settings
  const options = await chrome.storage.sync.get(["showNotifications"]);
  const showNotifications = options.showNotifications ?? true; // default to true

  if (message.type === "TILT_STARTED" && showNotifications) {
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
  if (message.type === "TILT_ENDED" && showNotifications) {
    console.log("TILT_ENDED - creating notification");
    chrome.notifications.create({
      type: "basic",
      title: "Chess Break",
      message: `Tilt prevention ended after ${Math.round(message.data.timeout / 60000)} minutes`,
      iconUrl: "public/logo.png",
    }, (notificationId) => {
      console.log("TILT_ENDED notification created with ID:", notificationId);
      if (chrome.runtime.lastError) {
        console.error("Notification error:", chrome.runtime.lastError);
      }
    });
  }
});
