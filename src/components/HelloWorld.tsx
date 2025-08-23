import { useState } from "react";

export default function HelloWorld(props: { msg: string }) {
  return (
    <>
      <h1>{props.msg}</h1>

      <p>
        Check out
        <a
          href="https://github.com/crxjs/create-crxjs"
          target="_blank"
          rel="noreferrer"
        >
          create-crxjs
        </a>
        , the official starter
      </p>

      <p className="read-the-docs">
        Click on the Vite, React and CRXJS logos to learn more
      </p>
    </>
  );
}
