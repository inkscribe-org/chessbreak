import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./views/App.tsx";

import ChessBreak from "../util/chessbreak.ts";

const chessBreak = new ChessBreak();

if (chessBreak.isChessCom()) {
  console.log("chess.com detected");
  chessBreak.start();
}

const container = document.createElement("div");
container.id = "crxjs-app";
document.body.appendChild(container);
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
