import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.jsx";
import "./input.css";
import { googleClientId, isGoogleAuthConfigured } from "./config/auth";

const root = ReactDOM.createRoot(document.getElementById("root"));

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
