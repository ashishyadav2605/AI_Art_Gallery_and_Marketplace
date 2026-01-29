import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HeartIcon, EyeIcon, ShoppingCartIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { artworksAPI } from '../services/api'
import { useAuthStore } from '../store'
import toast from 'react-hot-toast'

export default function ArtworkCard({ artwork, featured = false }) {
  const { isAuthenticated } = useAuthStore()
  const [isLiked, setIsLiked] = useState(artwork.is_liked || false)
  const [likesCount, setLikesCount] = useState(artwork.likes_count || 0)
  const [imageLoaded, setImageLoaded] = useState(false)

  const handleLike = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!isAuthenticated) {
      toast.error('Please login to like artworks')
      return
    }

    try {
      const response = await artworksAPI.like(artwork.id)
      setIsLiked(response.data.liked)
      setLikesCount(response.data.likes_count)
    } catch (error) {
      toast.error('Failed to like artwork')
    }
  }

  const imageUrl = artwork.thumbnail || artwork.image || artwork.image_url || '/placeholder.jpg'

  return (
    <Link to={`/artwork/${artwork.id}`}>
      <motion.div
        whileHover={{ y: -5 }}
        className={`group relative bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 hover:border-purple-500/50 transition-all duration-300 ${
          featured ? 'aspect-[4/5]' : 'aspect-square'
        }`}
      >
        {/* Image */}
        <div className="absolute inset-0">
          {!imageLoaded && (
            <div className="absolute inset-0 skeleton" />
          )}
          <img
            src={imageUrl}
            alt={artwork.title}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
          />
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* Top Actions */}
        <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleLike}
            className={`p-2 rounded-full backdrop-blur-sm transition-all ${
              isLiked
                ? 'bg-red-500 text-white'
                : 'bg-black/50 text-white hover:bg-black/70'
            }`}
          >
            {isLiked ? (
              <HeartSolidIcon className="w-5 h-5" />
            ) : (
              <HeartIcon className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* For Sale Badge */}
        {artwork.is_for_sale && (
          <div className="absolute top-3 left-3">
            <span className="px-3 py-1 bg-green-500 rounded-full text-xs font-medium text-white">
              For Sale
            </span>
          </div>
        )}

        {/* Auction Badge */}
        {artwork.is_auction && (
          <div className="absolute top-3 left-3">
            <span className="px-3 py-1 bg-orange-500 rounded-full text-xs font-medium text-white animate-pulse">
              🔥 Auction
            </span>
          </div>
        )}

        {/* Bottom Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <div className="space-y-2">
            <h3 className="text-white font-semibold truncate">{artwork.title}</h3>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1 text-gray-300 text-sm">
                  <HeartIcon className="w-4 h-4" />
                  <span>{likesCount}</span>
                </div>
                <div className="flex items-center space-x-1 text-gray-300 text-sm">
                  <EyeIcon className="w-4 h-4" />
                  <span>{artwork.views}</span>
                </div>
              </div>
              
              {artwork.is_for_sale && artwork.price > 0 && (
                <span className="text-green-400 font-semibold">
                  ${parseFloat(artwork.price).toFixed(2)}
                </span>
              )}
            </div>

            {artwork.owner && (
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-medium">
                  {artwork.owner.username?.charAt(0).toUpperCase()}
                </div>
                <span className="text-gray-400 text-sm">@{artwork.owner.username}</span>
              </div>
            )}
          </div>
        </div>

        {/* AI Model Badge */}
        {artwork.ai_model && (
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="px-2 py-1 bg-purple-500/80 rounded text-xs font-medium text-white backdrop-blur-sm">
              {artwork.ai_model.replace('_', ' ')}
            </span>
          </div>
        )}
      </motion.div>
    </Link>
  )
}
