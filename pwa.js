(function () {
  const PWA_VERSION = "20260703_pwa_1";

  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(`./sw.js?v=${PWA_VERSION}`, {
        scope: "./"
      });
      await registration.update();
    } catch (error) {
      console.warn("PWA registration failed", error);
    }
  });

  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
})();
