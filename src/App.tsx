import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/providers/AuthProvider";
import LoginPage from "@/pages/LoginPage";
import TasksPage from "@/pages/TasksPage";
import TaskDetailPage from "@/pages/TaskDetailPage";
import NotesPage from "@/pages/NotesPage";
import NoteDetailPage from "@/pages/NoteDetailPage";
import EventsPage from "@/pages/EventsPage";
import EventDetailPage from "@/pages/EventDetailPage";
import ExpensesPage from "@/pages/ExpensesPage";
import ExpenseDetailPage from "@/pages/ExpenseDetailPage";
import ProfilePage from "@/pages/ProfilePage";
import ChangePasswordPage from "@/pages/ChangePasswordPage";
import NotificationsPage from "@/pages/NotificationsPage";
import CreatePage from "@/pages/CreatePage";

function Splash() {
  return (
    <div className="flex h-dvh items-center justify-center bg-background">
      <Loader2 className="size-7 animate-spin text-primary" />
    </div>
  );
}

export default function App() {
  const { session, loading } = useAuth();

  if (loading) return <Splash />;

  // Chưa đăng nhập -> chỉ cho vào Login.
  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Đã đăng nhập.
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/tasks" replace />} />

      {/* 4 tab chính nằm trong khung có Bottom Nav */}
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/tasks" replace />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* Chi tiết: full screen, không có Bottom Nav */}
      <Route path="/tasks/:id" element={<TaskDetailPage />} />
      <Route path="/notes/:id" element={<NoteDetailPage />} />
      <Route path="/events/:id" element={<EventDetailPage />} />
      <Route path="/expenses/:id" element={<ExpenseDetailPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />

      {/* Màn Tạo mới: full screen, không có Bottom Nav */}
      <Route
        path="/create"
        element={
          <div className="mx-auto h-dvh w-full max-w-md overflow-y-auto bg-background">
            <CreatePage />
          </div>
        }
      />

      <Route path="*" element={<Navigate to="/tasks" replace />} />
    </Routes>
  );
}
