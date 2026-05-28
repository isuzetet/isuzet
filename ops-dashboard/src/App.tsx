import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardLayout from "./components/layout/DashboardLayout";
import Workqueue from "./pages/Workqueue";
import Overview from "./pages/Overview";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import Loads from "./pages/Loads";
import Drivers from "./pages/Drivers";
import Incidents from "./pages/Incidents";
import KycReview from "./pages/KycReview";
import Finance from "./pages/Finance";
import Corridors from "./pages/Corridors";
import Fraud from "./pages/Fraud";
import Intelligence from "./pages/Intelligence";
import Strategy from "./pages/Strategy";
import { useStore } from "./store/useStore";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { initAuth } = useStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<DashboardLayout><Workqueue /></DashboardLayout>} />
      <Route path="/overview" element={<DashboardLayout><Overview /></DashboardLayout>} />
      <Route path="/loads" element={<DashboardLayout><Loads /></DashboardLayout>} />
      <Route path="/drivers" element={<DashboardLayout><Drivers /></DashboardLayout>} />
      <Route path="/incidents" element={<DashboardLayout><Incidents /></DashboardLayout>} />
      <Route path="/kyc" element={<DashboardLayout><KycReview /></DashboardLayout>} />
      <Route path="/finance" element={<DashboardLayout><Finance /></DashboardLayout>} />
      <Route path="/corridors" element={<DashboardLayout><Corridors /></DashboardLayout>} />
      <Route path="/fraud" element={<DashboardLayout><Fraud /></DashboardLayout>} />
      <Route path="/intelligence" element={<DashboardLayout><Intelligence /></DashboardLayout>} />
      <Route path="/strategy" element={<DashboardLayout><Strategy /></DashboardLayout>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner theme="dark" position="bottom-right" />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
