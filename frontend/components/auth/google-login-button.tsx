"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdApi {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }): void;
  renderButton(parent: HTMLElement, options: { width: number; text: string }): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } };
  }
}

/**
 * Botón "Iniciar sesión con Google" (Google Identity Services). Si falta
 * NEXT_PUBLIC_GOOGLE_CLIENT_ID, no se renderiza nada: el login por
 * correo/contraseña sigue funcionando igual.
 */
export function GoogleLoginButton({ onCredential }: { onCredential: (idToken: string) => void }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!clientId) return;
    const intervalo = setInterval(() => {
      if (!window.google || !contenedorRef.current) return;
      clearInterval(intervalo);
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => onCredential(response.credential),
      });
      window.google.accounts.id.renderButton(contenedorRef.current, {
        width: 320,
        text: "continue_with",
      });
    }, 100);
    return () => clearInterval(intervalo);
  }, [clientId, onCredential]);

  if (!clientId) return null;

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
      <div ref={contenedorRef} className="flex justify-center" />
    </>
  );
}
