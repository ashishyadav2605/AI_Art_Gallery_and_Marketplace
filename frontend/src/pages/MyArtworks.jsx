import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { artworksAPI } from '../services/api'
import ArtworkCard from '../components/ArtworkCard'
import toast from 'react-hot-toast'
import {
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  TagIcon,
} from '@heroicons/react/24/outline'

export default function MyArtworks() {
  const [artworks, setArtworks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedArtwork, setSelectedArtwork] = useState(null)
  const [showListingModal, setShowListingModal] = useState(false)
  const [listingData, setListingData] = useState({ price: '', is_for_sale: true })

  useEffect(() => {
    fetchArtworks()
  }, [])

  const fetchArtworks = async () => {
    try {
      const response = await artworksAPI.getMyArtworks()
      setArtworks(response.data.results || response.data)
    } catch (error) {
      console.error('Failed to fetch artworks:', error)
      toast.error('Failed to load your artworks')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (artwork) => {
    if (!confirm(`Are you sure you want to delete "${artwork.title}"?`)) return
    
    try {
      await artworksAPI.delete(artwork.id)
      setArtworks(artworks.filter(a => a.id !== artwork.id))
      toast.success('Artwork deleted')
    } catch (error) {
      toast.error('Failed to delete artwork')
    }
  }

  const handleListForSale = (artwork) => {
    setSelectedArtwork(artwork)
    setListingData({
      price: artwork.price || '',
      is_for_sale: artwork.is_for_sale || false,
    })
    setShowListingModal(true)
  }

  const handleSaveListing = async () => {
    try {
      await artworksAPI.update(selectedArtwork.id, listingData)
      setArtworks(artworks.map(a => 
        a.id === selectedArtwork.id ? { ...a, ...listingData } : a
      ))
      toast.success(listingData.is_for_sale ? 'Listed for sale!' : 'Removed from sale')
      setShowListingModal(false)
    } catch (error) {
      toast.error('Failed to update listing')
    }
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Artworks</h1>
          <p className="text-gray-400">Manage your AI-generated creations</p>
        </div>
        <Link
          to="/generate"
          className="mt-4 sm:mt-0 inline-flex items-center px-6 py-3 bg-purple-600 rounded-xl text-white font-medium hover:bg-purple-700 transition-all"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Create New
        </Link>
      </div>

      {/* Artworks Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl skeleton" />
          ))}
        </div>
      ) : artworks.length === 0 ? (
        <div className="text-center py-20 bg-gray-800 rounded-2xl border border-gray-700">
          <PhotoIcon className="w-20 h-20 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Artworks Yet</h3>
          <p className="text-gray-400 mb-6">Start creating amazing AI art!</p>
          <Link
            to="/generate"
            className="inline-flex items-center px-6 py-3 bg-purple-600 rounded-xl text-white font-medium hover:bg-purple-700"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Create Your First Artwork
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {artworks.map((artwork, index) => (
            <motion.div
              key={artwork.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative group"
            >
              <ArtworkCard artwork={artwork} />
              
              {/* Action Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-2xl flex items-center justify-center space-x-3">
                <Link
                  to={`/artwork/${artwork.id}`}
                  className="p-3 bg-white/20 rounded-xl text-white hover:bg-white/30 transition-all"
                  title="View"
                >
                  <PencilIcon className="w-5 h-5" />
                </Link>
                <button
                  onClick={() => handleListForSale(artwork)}
                  className="p-3 bg-green-500/50 rounded-xl text-white hover:bg-green-500/70 transition-all"
                  title={artwork.is_for_sale ? 'Edit Listing' : 'List for Sale'}
                >
                  <TagIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(artwork)}
                  className="p-3 bg-red-500/50 rounded-xl text-white hover:bg-red-500/70 transition-all"
                  title="Delete"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Sale Badge */}
              {artwork.is_for_sale && (
                <div className="absolute top-4 right-4 px-3 py-1 bg-green-500 rounded-full text-white text-sm font-medium">
                  ${artwork.price}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Listing Modal */}
      {showListingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowListingModal(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700"
          >
            <h3 className="text-xl font-bold text-white mb-4">
              {listingData.is_for_sale ? 'Edit Listing' : 'List for Sale'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Price (USD)</label>
                <input
                  type="number"
                  value={listingData.price}
                  onChange={(e) => setListingData({ ...listingData, price: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={listingData.is_for_sale}
                  onChange={(e) => setListingData({ ...listingData, is_for_sale: e.target.checked })}
                  className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-white">List for sale</span>
              </label>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowListingModal(false)}
                className="flex-1 py-3 bg-gray-700 rounded-xl text-white font-medium hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveListing}
                className="flex-1 py-3 bg-purple-600 rounded-xl text-white font-medium hover:bg-purple-700"
              >
                Save
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
