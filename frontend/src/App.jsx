
import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import Questions from "./pages/Questions";
import MockTests from "./pages/MockTests";
import TakeTest from "./pages/TakeTest";
import AttemptResult from "./pages/AttemptResult";
import Results from "./pages/Results";

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Route>

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        {/* Full-screen test mode: no sidebar, so nothing distracts from the exam */}
        <Route
          path="/mock-tests/attempts/:attemptId"
          element={<TakeTest />}
        />

        {/* Everything else lives inside the app shell */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/questions" element={<Questions />} />
          <Route path="/mock-tests" element={<MockTests />} />
          <Route path="/results" element={<Results />} />
          <Route
            path="/mock-tests/attempts/:attemptId/result"
            element={<AttemptResult />}
          />
        </Route>
      </Route>

      {/* Unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
