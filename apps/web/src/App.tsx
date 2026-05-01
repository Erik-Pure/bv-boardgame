import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import { CardsCatalog } from "./routes/CardsCatalog";
import { GameRules } from "./routes/GameRules";
import { Home } from "./routes/Home";
import { JoinGame } from "./routes/JoinGame";
import { HostLobbySetup } from "./routes/HostLobbySetup";
import { Login } from "./routes/Login";

const TableView = lazy(() => import("./routes/TableView").then((m) => ({ default: m.TableView })));
const PlayView = lazy(() => import("./routes/PlayView").then((m) => ({ default: m.PlayView })));

function App() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100svh", display: "grid", placeItems: "center" }}>Laddar…</div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/join" element={<JoinGame />} />
        <Route path="/rules" element={<GameRules />} />
        <Route path="/cards" element={<CardsCatalog />} />
        <Route path="/host-lobby" element={<HostLobbySetup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/table" element={<TableView />} />
        <Route path="/play" element={<PlayView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App
