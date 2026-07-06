import { Suspense, lazy, useEffect } from "react";
import { Navigate, Route, useLocation } from "react-router-dom";
import "./App.css";
import { PageTransitionLayout } from "./components/PageTransitionLayout";
import { useUiStrings } from "./lib/locale/LocaleContext";
import { usePageSeo } from "./lib/usePageSeo";
import { CardsCatalog } from "./routes/CardsCatalog";
import { GameRules } from "./routes/GameRules";
import { Home } from "./routes/Home";
import { JoinGame } from "./routes/JoinGame";
import { HostLobbySetup } from "./routes/HostLobbySetup";
import { Login } from "./routes/Login";
import { FestDashboard } from "./routes/FestDashboard";

const TableView = lazy(() => import("./routes/TableView").then((m) => ({ default: m.TableView })));
const PlayView = lazy(() => import("./routes/PlayView").then((m) => ({ default: m.PlayView })));

function ScrollToTopOnRouteChange() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);
  return null;
}

function RouteLoadingFallback() {
  const ui = useUiStrings();
  return (
    <div
      style={{
        minHeight: "100svh",
        display: "grid",
        placeItems: "center",
        color: "var(--text-h, #f3f4f6)",
        opacity: 0.85,
      }}
    >
      {ui.app.loading}
    </div>
  );
}

function App() {
  usePageSeo();

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <ScrollToTopOnRouteChange />
      <PageTransitionLayout>
        <Route path="/" element={<Home />} />
        <Route path="/join" element={<JoinGame />} />
        <Route path="/rules" element={<GameRules />} />
        <Route path="/cards" element={<CardsCatalog />} />
        <Route path="/host-lobby" element={<HostLobbySetup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/fest" element={<FestDashboard />} />
        <Route path="/table" element={<TableView />} />
        <Route path="/play" element={<PlayView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </PageTransitionLayout>
    </Suspense>
  );
}

export default App
