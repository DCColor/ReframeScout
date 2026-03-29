import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import JoinPage from './pages/JoinPage'
import HostPage from './pages/HostPage'
import RoomPage from './pages/RoomPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<JoinPage />} />
        <Route path="/host" element={<HostPage />} />
        <Route path="/room/:roomId" element={<RoomPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
