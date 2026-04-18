import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import { CardsCatalog } from "./routes/CardsCatalog";
import { GameRules } from "./routes/GameRules";
import { Home } from "./routes/Home";
import { JoinGame } from "./routes/JoinGame";
import { TableView } from "./routes/TableView";
import { PlayView } from "./routes/PlayView";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/join" element={<JoinGame />} />
      <Route path="/rules" element={<GameRules />} />
      <Route path="/cards" element={<CardsCatalog />} />
      <Route path="/table" element={<TableView />} />
      <Route path="/play" element={<PlayView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App
