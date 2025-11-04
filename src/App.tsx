import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import Login from "./pages/Login";
import TenantRegistration from "./pages/TenantRegistration";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Courses from "./pages/Courses";
import LecturesListPage from "./pages/LecturesListPage";
import LecturePlayerPage from "./pages/LecturePlayerPage";
import Assignments from "./pages/Assignments";
import CreateAssignment from "./pages/CreateAssignment";
import CourseForm from "./pages/CourseForm";
import Quizzes from "./pages/Quizzes";
import Grades from "./pages/Grades";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/tenant-registration" element={<TenantRegistration />} />
            <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Layout><AdminDashboard /></Layout></ProtectedRoute>} />
            <Route path="/courses" element={<ProtectedRoute><Layout><Courses /></Layout></ProtectedRoute>} />
            <Route path="/courses/new" element={<ProtectedRoute><Layout><CourseForm /></Layout></ProtectedRoute>} />
            <Route path="/courses/:courseId/lectures" element={<ProtectedRoute><Layout><LecturesListPage /></Layout></ProtectedRoute>} />
            <Route path="/courses/:courseId/lectures/:lectureId" element={<ProtectedRoute><Layout><LecturePlayerPage /></Layout></ProtectedRoute>} />
            <Route path="/assignments" element={<ProtectedRoute><Layout><Assignments /></Layout></ProtectedRoute>} />
            <Route path="/assignments/create" element={<ProtectedRoute><Layout><CreateAssignment /></Layout></ProtectedRoute>} />
            <Route path="/quizzes" element={<ProtectedRoute><Layout><Quizzes /></Layout></ProtectedRoute>} />
            <Route path="/grades" element={<ProtectedRoute><Layout><Grades /></Layout></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Layout><Notifications /></Layout></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
