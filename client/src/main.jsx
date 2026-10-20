import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { PreferencesProvider } from "./context/PreferencesContext";
import ToastHost from "./components/ToastHost";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PreferencesProvider>
          <App />
        </PreferencesProvider>
        <ToastHost />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);