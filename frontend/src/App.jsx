import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store'

// Layout
import Layout from './components/Layout'

// Pages
import Home from './pages/Home'
import Gallery from './pages/Gallery'
import ArtworkDetail from './pages/ArtworkDetail'
import Generate from './pages/Generate'
import Marketplace from './pages/Marketplace'
import Profile from './pages/Profile'
import UserProfile from './pages/UserProfile'
import Login from './pages/Login'
import Register from './pages/Register'
import MyArtworks from './pages/MyArtworks'
import Collections from './pages/Collections'
import Search from './pages/Search'

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

function App() {
  const { fetchUser, isAuthenticated } = useAuthStore()

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      fetchUser()
    }
  }, [fetchUser])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="gallery" element={<Gallery />} />
        <Route path="artwork/:id" element={<ArtworkDetail />} />
        <Route path="marketplace" element={<Marketplace />} />
        <Route path="search" element={<Search />} />
        <Route path="user/:id" element={<UserProfile />} />
        
        {/* Protected Routes */}
        <Route path="generate" element={
          <ProtectedRoute>
            <Generate />
          </ProtectedRoute>
        } />
        <Route path="profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="my-artworks" element={
          <ProtectedRoute>
            <MyArtworks />
          </ProtectedRoute>
        } />
        <Route path="collections" element={
          <ProtectedRoute>
            <Collections />
          </ProtectedRoute>
        } />
      </Route>
    </Routes>
  )
}

export default App
