import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.jsx";
import "./input.css";
import { API_URL } from "./config/api";
import { googleClientId, isGoogleAuthConfigured } from "./config/auth";
import { installApiFetchResilience, warmBackendConnection } from "./config/network";

const root = ReactDOM.createRoot(document.getElementById("root"));

installApiFetchResilience();
warmBackendConnection();

if (!import.meta.env.DEV && !API_URL) {
  console.error("VITE_API_URL is not configured. API requests may fail unless the frontend and backend share the same origin.");
}

if (isGoogleAuthConfigured) {
  root.render(
    <React.StrictMode>
      <GoogleOAuthProvider clientId={googleClientId}>
        <App />
      </GoogleOAuthProvider>
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  if (import.meta.env.DEV) {
    console.warn("VITE_GOOGLE_CLIENT_ID is not configured. Google sign-in is disabled.");
  }
}
