import { Navigate, Route, Routes } from "react-router-dom";
import { AuthCallbackPage } from "./auth/AuthCallbackPage";
import { HomePage } from "./pages/HomePage";
import "./styles/app.css";

export function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
