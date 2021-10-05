import React from "react";
import Head from "next/head";
import { useContinueSignInWithPopup } from "../../packages/next-auth-popup";

export default function AuthPopup(props: {}) {
  useContinueSignInWithPopup();

  return (
    <>
      <Head>
        <title>Sign In</title>
      </Head>
      <div className="container">
        <Spinner alt="Signing in..." />;
        <style jsx>
          {`
            .container {
              display: flex;
              position: absolute;
              top: 0;
              bottom: 0;
              left: 0;
              right: 0;
              align-items: center;
              justify-content: center;
            }
          `}
        </style>
      </div>
    </>
  );
}

function Spinner(props: { alt: string }) {
  const { alt } = props;
  const size = "1.1em";
  return (
    <>
      <div className="wrapper">
        <div className="loader">{alt}</div>
      </div>
      <style jsx>{`
        .wrapper {
          display: inline-flex;
          vertical-align: text-bottom;
        }
        .loader {
          text-indent: -9999em;
          overflow: hidden;
          width: ${size};
          height: ${size};
          border-radius: 50%;
          background: #ffffff;
          background: conic-gradient(
            rgba(164, 164, 164, 0) 0%,
            rgba(164, 164, 164, 0) 20%,
            rgba(164, 164, 164, 1) 80%
          );
          position: relative;
          animation: spin 0.7s infinite linear;
          transform: translateZ(0);
        }
        .loader:after {
          background: white;
          width: 70%;
          height: 70%;
          border-radius: 50%;
          content: "";
          margin: auto;
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          right: 0;
        }
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            -webkit-transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
}
