import { createHashRouter, RouterProvider } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Game } from './pages/Game';
import { Settings } from './pages/Settings';

const router = createHashRouter([
  { path: '/', element: <Dashboard /> },
  { path: '/game', element: <Game /> },
  { path: '/settings', element: <Settings /> },
]);

export function App() {
  return <RouterProvider router={router} />;
}
