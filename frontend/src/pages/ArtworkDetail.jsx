import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { artworksAPI, commentsAPI, marketplaceAPI } from '../services/api'
import { useAuthStore, useCartStore } from '../store'
import toast from 'react-hot-toast'
import {
  HeartIcon,
  EyeIcon,
  ShareIcon,
  ShoppingCartIcon,
  ChatBubbleLeftIcon,
  ClockIcon,
  SparklesIcon,
  ArrowLeftIcon,
  BookmarkIcon,
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon, BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid'

export default function ArtworkDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
  const { addToWishlist, removeFromWishlist, isInWishlist } = useCartStore()
  
  const [artwork, setArtwork] = useState(null)
  const [comments, setComments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [newComment, setNewComment] = useState('')
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [artworkRes, commentsRes] = await Promise.all([
          artworksAPI.getById(id),
          commentsAPI.getForArtwork(id),
        ])
        setArtwork(artworkRes.data)
        setIsLiked(artworkRes.data.is_liked || false)
        setLikesCount(artworkRes.data.likes_count || 0)
        setComments(commentsRes.data.results || commentsRes.data)
      } catch (error) {
        console.error('Failed to fetch artwork:', error)
        toast.error('Artwork not found')
        navigate('/gallery')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [id, navigate])

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to like artworks')
      return
    }
    try {
      const response = await artworksAPI.like(id)
      setIsLiked(response.data.liked)
      setLikesCount(response.data.likes_count)
    } catch (error) {
      toast.error('Failed to like artwork')
    }
  }

  const handleWishlist = () => {
    if (isInWishlist(artwork.id)) {
      removeFromWishlist(artwork.id)
      toast.success('Removed from wishlist')
    } else {
      addToWishlist(artwork)
      toast.success('Added to wishlist')
    }
  }

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to purchase')
      return
    }
    
    setIsPurchasing(true)
    try {
      await marketplaceAPI.purchase(id)
      toast.success('Artwork purchased successfully!')
      setArtwork(prev => ({ ...prev, is_for_sale: false, owner: user }))
    } catch (error) {
      toast.error(error.response?.data?.error || 'Purchase failed')
    } finally {
      setIsPurchasing(false)
    }
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    
    if (!isAuthenticated) {
      toast.error('Please login to comment')
      return
    }

    try {
      const response = await commentsAPI.create({
        artwork: id,
        content: newComment,
      })
      setComments([response.data, ...comments])
      setNewComment('')
      toast.success('Comment posted!')
    } catch (error) {
      toast.error('Failed to post comment')
    }
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Link copied to clipboard!')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
      </div>
    )
  }

  if (!artwork) return null

  const imageUrl = artwork.image || artwork.image_url || '/placeholder.jpg'
  const isOwner = user && artwork.owner?.id === user.id

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeftIcon className="w-5 h-5 mr-2" />
        Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Left - Image */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative rounded-2xl overflow-hidden bg-gray-800"
          >
            <img
              src={imageUrl}
              alt={artwork.title}
              className="w-full h-auto"
            />
          </motion.div>

          {/* AI Generation Details */}
          {artwork.prompt && (
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <button
                onClick={() => setShowPrompt(!showPrompt)}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center space-x-2">
                  <SparklesIcon className="w-5 h-5 text-purple-400" />
                  <span className="font-medium text-white">AI Generation Details</span>
                </div>
                <span className="text-gray-400">{showPrompt ? '−' : '+'}</span>
              </button>
              
              {showPrompt && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 space-y-3"
                >
                  <div>
                    <span className="text-sm text-gray-400">Prompt</span>
                    <p className="text-gray-200 mt-1">{artwork.prompt}</p>
                  </div>
                  {artwork.negative_prompt && (
                    <div>
                      <span className="text-sm text-gray-400">Negative Prompt</span>
                      <p className="text-gray-300 mt-1">{artwork.negative_prompt}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                    <div>
                      <span className="text-sm text-gray-400">Model</span>
                      <p className="text-white">{artwork.ai_model?.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-400">Size</span>
                      <p className="text-white">{artwork.width}x{artwork.height}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-400">Steps</span>
                      <p className="text-white">{artwork.steps}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-400">CFG Scale</span>
                      <p className="text-white">{artwork.cfg_scale}</p>
                    </div>
                  </div>
                  {artwork.seed && (
                    <div>
                      <span className="text-sm text-gray-400">Seed</span>
                      <p className="text-white font-mono">{artwork.seed}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Right - Details */}
        <div className="space-y-6">
          {/* Title & Creator */}
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">{artwork.title}</h1>
            <Link
              to={`/user/${artwork.owner?.id}`}
              className="flex items-center space-x-3 group"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium text-lg">
                {artwork.owner?.username?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-white font-medium group-hover:text-purple-400 transition-colors">
                  @{artwork.owner?.username}
                </p>
                <p className="text-sm text-gray-400">Creator</p>
              </div>
            </Link>
          </div>

          {/* Stats */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-gray-300">
              <EyeIcon className="w-5 h-5" />
              <span>{artwork.views} views</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-300">
              <HeartIcon className="w-5 h-5" />
              <span>{likesCount} likes</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-300">
              <ChatBubbleLeftIcon className="w-5 h-5" />
              <span>{comments.length} comments</span>
            </div>
          </div>

          {/* Description */}
          {artwork.description && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
              <p className="text-gray-300 whitespace-pre-line">{artwork.description}</p>
            </div>
          )}

          {/* Tags */}
          {artwork.tags && artwork.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {artwork.tags.map(tag => (
                <Link
                  key={tag.id}
                  to={`/gallery?tag=${tag.slug}`}
                  className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300 hover:bg-purple-600 hover:text-white transition-all"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          )}

          {/* Price & Purchase */}
          {artwork.is_for_sale && !isOwner && (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400">Price</span>
                <span className="text-3xl font-bold text-green-400">
                  ${parseFloat(artwork.price).toFixed(2)}
                </span>
              </div>
              <button
                onClick={handlePurchase}
                disabled={isPurchasing}
                className="w-full flex items-center justify-center space-x-2 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50"
              >
                <ShoppingCartIcon className="w-5 h-5" />
                <span>{isPurchasing ? 'Processing...' : 'Buy Now'}</span>
              </button>
              <p className="text-center text-sm text-gray-400 mt-3">
                License: {artwork.license_type?.replace('_', ' ')}
              </p>
            </div>
          )}

          {/* Auction Info */}
          {artwork.is_auction && (
            <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-xl p-6 border border-orange-500/30">
              <div className="flex items-center space-x-2 mb-4">
                <ClockIcon className="w-5 h-5 text-orange-400" />
                <span className="text-orange-400 font-medium">Auction</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Minimum Bid</span>
                  <span className="text-white font-medium">${parseFloat(artwork.minimum_bid).toFixed(2)}</span>
                </div>
                {artwork.highest_bid && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Current Highest</span>
                    <span className="text-green-400 font-medium">${parseFloat(artwork.highest_bid.amount).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleLike}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl font-medium transition-all ${
                isLiked
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {isLiked ? (
                <HeartSolidIcon className="w-5 h-5" />
              ) : (
                <HeartIcon className="w-5 h-5" />
              )}
              <span>{isLiked ? 'Liked' : 'Like'}</span>
            </button>
            
            <button
              onClick={handleWishlist}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl font-medium transition-all ${
                isInWishlist(artwork.id)
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {isInWishlist(artwork.id) ? (
                <BookmarkSolidIcon className="w-5 h-5" />
              ) : (
                <BookmarkIcon className="w-5 h-5" />
              )}
              <span>Save</span>
            </button>
            
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center space-x-2 py-3 bg-gray-800 rounded-xl text-gray-300 hover:bg-gray-700 transition-all"
            >
              <ShareIcon className="w-5 h-5" />
              <span>Share</span>
            </button>
          </div>

          {/* Comments Section */}
          <div className="pt-6 border-t border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              Comments ({comments.length})
            </h3>
            
            {/* Comment Form */}
            <form onSubmit={handleComment} className="mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="mt-2 px-6 py-2 bg-purple-600 rounded-lg text-white font-medium hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Post Comment
              </button>
            </form>

            {/* Comments List */}
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="flex space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                    {comment.user?.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-white">@{comment.user?.username}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-300">{comment.content}</p>
                  </div>
                </div>
              ))}
              
              {comments.length === 0 && (
                <p className="text-center text-gray-500 py-8">No comments yet. Be the first!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
