"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __fluxoCaptcha?: (token: string) => void;
    hcaptcha?: unknown;
  }
}

export function Captcha({ onToken }: { onToken: (token: string) => void }) {
  const sitekey = process.env.NEXT_PUBLIC_CAPTCHA_SITEKEY;

  useEffect(() => {
    if (!sitekey) return;
    window.__fluxoCaptcha = (token: string) => onToken(token);
    if (!document.querySelector("script[data-fluxo-captcha]")) {
      const script = document.createElement("script");
      script.src = "https://js.hcaptcha.com/1/api.js";
      script.async = true;
      script.defer = true;
      script.setAttribute("data-fluxo-captcha", "1");
      document.head.appendChild(script);
    }
    return () => {
      window.__fluxoCaptcha = undefined;
    };
  }, [sitekey, onToken]);

  if (!sitekey) return null;
  return (
    <div
      className="h-captcha"
      data-sitekey={sitekey}
      data-callback="__fluxoCaptcha"
    />
  );
}
