import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import SignIn from './routes/signin';
import SignUp from './routes/signup';
import Home from './routes/home';
import Dashboard from './routes/dashboard';
import Profile from './routes/profile';
import { AuthProvider } from './contexts/AuthContext';
import { PostModalProvider } from './contexts/PostModalContext';
import ProtectedRoute from './components/ProtectedRoute';

import './index.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedRoute><Home /></ProtectedRoute>,
  },
  {
    path: '/signin',
    element: <SignIn />,
  },
  {
    path: '/signup',
    element: <SignUp />,
  },
  {
    path: '/dashboard',
    element: <ProtectedRoute><Dashboard /></ProtectedRoute>,
  },
  {
    path: '/profile',
    element: <ProtectedRoute><Profile /></ProtectedRoute>,
  },
]);

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <AuthProvider>
        <PostModalProvider onTweetPublished={() => { }}>
          <RouterProvider router={router} />
        </PostModalProvider>
      </AuthProvider>
    </React.StrictMode>,
  )
} else {
  console.error('No root element found');
}
