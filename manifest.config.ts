import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

export default defineManifest({
  manifest_version: 3,
  name: pkg.name,
  version: pkg.version,
  icons: {
    48: "logo128.png",
  },
  action: {
    default_icon: {
      48: "logo128.png",
    },
    default_popup: "src/popup/index.html",
  },
  permissions: ["storage", "notifications", "tabs"],
  content_scripts: [
    {
      js: ["src/content/main.tsx"],
      matches: ["https://www.chess.com/*"],
    },
  ],
  background: {
    service_worker: "src/background/index.ts",
  },
  options_page: "src/options/index.html",
});
