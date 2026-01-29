import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store'
import { artworksAPI, marketplaceAPI } from '../services/api'
import toast from 'react-hot-toast'
import {
  UserCircleIcon,
  CameraIcon,
  WalletIcon,
  ChartBarIcon,
  CogIcon,
} from '@heroicons/react/24/outline'

export default function Profile() {
  const { user, profile, updateProfile } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [stats, setStats] = useState({ artworks: 0, sales: 0, earnings: 0 })
  const [formData, setFormData] = useState({
    bio: profile?.bio || '',
    website: profile?.website || '',
    twitter: profile?.twitter || '',
    instagram: profile?.instagram || '',
  })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [artworksRes, transactionsRes] = await Promise.all([
          artworksAPI.getMyArtworks(),
          marketplaceAPI.getTransactions(),
        ])
        
        const artworks = artworksRes.data.results || artworksRes.data
        const transactions = transactionsRes.data || []
        const sales = transactions.filter(t => t.seller?.id === user?.id && t.status === 'completed')
        const earnings = sales.reduce((sum, t) => sum + parseFloat(t.amount) - parseFloat(t.platform_fee), 0)
        
        setStats({
          artworks: artworks.length,
          sales: sales.length,
          earnings: earnings,
        })
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      }
    }
    
    if (user) {
      fetchStats()
    }
  }, [user])

  useEffect(() => {
    if (profile) {
      setFormData({
        bio: profile.bio || '',
        website: profile.website || '',
        twitter: profile.twitter || '',
        instagram: profile.instagram || '',
      })
    }
  }, [profile])

  const handleSave = async () => {
    const result = await updateProfile(formData)
    if (result.success) {
      toast.success('Profile updated successfully!')
      setIsEditing(false)
    } else {
      toast.error('Failed to update profile')
    }
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">My Profile</h1>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden mb-8"
      >
        {/* Cover */}
        <div className="h-32 bg-gradient-to-r from-purple-600 to-pink-600" />
        
        {/* Avatar & Basic Info */}
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end -mt-12 mb-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 border-4 border-gray-800 flex items-center justify-center text-white text-3xl font-bold">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              {profile?.is_verified_artist && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
            <div className="mt-4 sm:mt-0 sm:ml-4 flex-1">
              <h2 className="text-2xl font-bold text-white">@{user?.username}</h2>
              <p className="text-gray-400">{user?.email}</p>
            </div>
            <button
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              className="mt-4 sm:mt-0 px-4 py-2 bg-purple-600 rounded-lg text-white font-medium hover:bg-purple-700 transition-all"
            >
              {isEditing ? 'Save Changes' : 'Edit Profile'}
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-700/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{stats.artworks}</p>
              <p className="text-sm text-gray-400">Artworks</p>
            </div>
            <div className="bg-gray-700/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{stats.sales}</p>
              <p className="text-sm text-gray-400">Sales</p>
            </div>
            <div className="bg-gray-700/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-400">${stats.earnings.toFixed(2)}</p>
              <p className="text-sm text-gray-400">Earnings</p>
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Bio</label>
              {isEditing ? (
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                />
              ) : (
                <p className="text-gray-300">{profile?.bio || 'No bio yet'}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Website</label>
                {isEditing ? (
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://yoursite.com"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                ) : (
                  <p className="text-gray-300">{profile?.website || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Twitter</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.twitter}
                    onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                    placeholder="@username"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                ) : (
                  <p className="text-gray-300">{profile?.twitter || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Instagram</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    placeholder="@username"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                ) : (
                  <p className="text-gray-300">{profile?.instagram || '-'}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Wallet */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gray-800 rounded-2xl p-6 border border-gray-700"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <WalletIcon className="w-6 h-6 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Wallet Balance</h3>
          </div>
        </div>
        <div className="text-3xl font-bold text-green-400 mb-4">
          ${parseFloat(profile?.wallet_balance || 0).toFixed(2)}
        </div>
        <div className="flex space-x-3">
          <button className="flex-1 py-3 bg-green-600 rounded-xl text-white font-medium hover:bg-green-700 transition-all">
            Deposit
          </button>
          <button className="flex-1 py-3 bg-gray-700 rounded-xl text-white font-medium hover:bg-gray-600 transition-all">
            Withdraw
          </button>
        </div>
      </motion.div>
    </div>
  )
}
