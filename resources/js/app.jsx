import React from 'react';
import { Routes, Route, BrowserRouter } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import { ensureCsrfCookie } from './api';
import { AuthProvider } from './contexts/AuthContext';
import { FeedFiltersProvider } from './contexts/FeedFiltersContext';
import { ToastProvider } from './contexts/ToastContext';
import ToastContainer from './components/ToastContainer';
import Header from './components/Header';
import HomePage from './components/HomePage';
import PostDetail from './components/PostDetail';
import Profile from './components/Profile';
import CreatePost from './components/CreatePost';
import Settings from './components/Settings';
import AdminPanel from './components/admin/AdminPanel';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';

// CSRF для SPA: получаем cookie до любых мутирующих запросов (критерий 2.2.8).
ensureCsrfCookie();

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <FeedFiltersProvider>
        <div className="App">
          <Header />
          <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/create" element={<CreatePost />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
        <ToastContainer />
      </div>
        </FeedFiltersProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

// Монтируем React в #root
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
