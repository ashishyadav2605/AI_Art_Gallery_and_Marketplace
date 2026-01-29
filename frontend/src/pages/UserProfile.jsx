import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { usersAPI, artworksAPI } from '../services/api'
import { useAuthStore } from '../store'
import ArtworkCard from '../components/ArtworkCard'
import toast from 'react-hot-toast'
import {
  UserCircleIcon,
  CheckBadgeIcon,
  LinkIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'

export default function UserProfile() {
  const { username } = useParams()
  const { user, isAuthenticated } = useAuthStore()
  const [profileUser, setProfileUser] = useState(null)
  const [artworks, setArtworks] = useState([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true)
      try {
        const [userRes, artworksRes] = await Promise.all([
          usersAPI.getUser(username),
          artworksAPI.getAll({ artist: username }),
        ])
        setProfileUser(userRes.data)
        setArtworks(artworksRes.data.results || artworksRes.data)
        setIsFollowing(userRes.data.is_following || false)
      } catch (error) {
        console.error('Failed to fetch user profile:', error)
        toast.error('Failed to load profile')
      } finally {
        setIsLoading(false)
      }
    }
    fetchProfile()
  }, [username])

  const handleFollow = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to follow users')
      return
    }
    try {
      if (isFollowing) {
        await usersAPI.unfollow(profileUser.id)
        setIsFollowing(false)
        toast.success(`Unfollowed @${username}`)
      } else {
        await usersAPI.follow(profileUser.id)
        setIsFollowing(true)
        toast.success(`Following @${username}`)
      }
    } catch (error) {
      toast.error('Action failed')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <UserCircleIcon className="w-20 h-20 text-gray-600 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">User Not Found</h2>
        <p className="text-gray-400 mb-6">The user @{username} doesn't exist</p>
        <Link to="/gallery" className="px-6 py-3 bg-purple-600 rounded-xl text-white font-medium hover:bg-purple-700">
          Browse Gallery
        </Link>
      </div>
    )
  }

  const isOwnProfile = user?.username === username

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden mb-8"
      >
        {/* Cover */}
        <div className="h-40 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600" />
        
        {/* Avatar & Info */}
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end -mt-16 mb-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 border-4 border-gray-800 flex items-center justify-center text-white text-4xl font-bold shadow-xl">
                {profileUser.username.charAt(0).toUpperCase()}
              </div>
              {profileUser.profile?.is_verified_artist && (
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                  <CheckBadgeIcon className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
            <div className="mt-4 sm:mt-0 sm:ml-6 flex-1">
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">@{profileUser.username}</h1>
                {profileUser.profile?.is_verified_artist && (
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full">
                    Verified Artist
                  </span>
                )}
              </div>
              {profileUser.first_name && (
                <p className="text-gray-400 mt-1">{profileUser.first_name} {profileUser.last_name}</p>
              )}
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-3">
              {isOwnProfile ? (
                <Link
                  to="/profile"
                  className="px-6 py-3 bg-gray-700 rounded-xl text-white font-medium hover:bg-gray-600 transition-all"
                >
                  Edit Profile
                </Link>
              ) : (
                <button
                  onClick={handleFollow}
                  className={`px-6 py-3 rounded-xl font-medium transition-all ${
                    isFollowing
                      ? 'bg-gray-700 text-white hover:bg-gray-600'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          </div>

          {/* Bio */}
          {profileUser.profile?.bio && (
            <p className="text-gray-300 mb-6 max-w-2xl">{profileUser.profile.bio}</p>
          )}

          {/* Stats & Links */}
          <div className="flex flex-wrap gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{artworks.length}</p>
              <p className="text-sm text-gray-400">Artworks</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{profileUser.profile?.followers_count || 0}</p>
              <p className="text-sm text-gray-400">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{profileUser.profile?.following_count || 0}</p>
              <p className="text-sm text-gray-400">Following</p>
            </div>
            
            {profileUser.profile?.website && (
              <a
                href={profileUser.profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-purple-400 hover:text-purple-300"
              >
                <LinkIcon className="w-4 h-4" />
                <span>Website</span>
              </a>
            )}
          </div>
        </div>
      </motion.div>

      {/* Artworks */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
          <PhotoIcon className="w-7 h-7 mr-2" />
          Artworks
        </h2>
        
        {artworks.length === 0 ? (
          <div className="text-center py-20 bg-gray-800 rounded-2xl border border-gray-700">
            <PhotoIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Artworks Yet</h3>
            <p className="text-gray-400">
              {isOwnProfile ? "You haven't created any artworks yet" : `@${username} hasn't shared any artworks yet`}
            </p>
            {isOwnProfile && (
              <Link
                to="/generate"
                className="inline-flex mt-6 px-6 py-3 bg-purple-600 rounded-xl text-white font-medium hover:bg-purple-700"
              >
                Create Your First Artwork
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {artworks.map((artwork, index) => (
              <motion.div
                key={artwork.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <ArtworkCard artwork={artwork} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
