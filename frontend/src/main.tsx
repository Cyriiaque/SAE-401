import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import SignIn from './routes/signin';
import SignUp from './routes/signup';
import Home from './routes/home';
import { AuthProvider } from './contexts/AuthContext';
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
    path: '/home',
    element: <ProtectedRoute><Home /></ProtectedRoute>,
  }
]);

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </React.StrictMode>,
  )
} else {
  console.error('No root element found');
}
