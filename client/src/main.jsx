import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import App from "./App.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster richColors position="top-right" theme="light" toastOptions={{ className: "font-sans text-sm", style: { borderRadius: "0.75rem" } }} />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
