import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.jsx";
import "./input.css";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "dummy-client-id";

const root = ReactDOM.createRoot(document.getElementById("root"));

if (googleClientId) {
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
}
