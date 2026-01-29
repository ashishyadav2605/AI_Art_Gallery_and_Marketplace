import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { artworksAPI, marketplaceAPI } from '../services/api'
import { SparklesIcon, ArrowRightIcon, FireIcon, ShoppingBagIcon } from '@heroicons/react/24/outline'
import ArtworkCard from '../components/ArtworkCard'

export default function Home() {
  const [featuredArtworks, setFeaturedArtworks] = useState([])
  const [trendingArtworks, setTrendingArtworks] = useState([])
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [featuredRes, trendingRes, statsRes] = await Promise.all([
          artworksAPI.getFeatured(),
          artworksAPI.getTrending(),
          marketplaceAPI.getStats(),
        ])
        setFeaturedArtworks(featuredRes.data)
        setTrendingArtworks(trendingRes.data)
        setStats(statsRes.data)
      } catch (error) {
        console.error('Failed to fetch homepage data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-pink-900/20" />
        
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center px-4 py-2 rounded-full bg-purple-500/20 text-purple-400 text-sm font-medium mb-6">
                <SparklesIcon className="w-4 h-4 mr-2" />
                AI-Powered Art Creation
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6 font-display"
            >
              Create, Collect & Trade
              <span className="block gradient-text">AI-Generated Art</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-gray-400 max-w-2xl mx-auto mb-10"
            >
              Transform your imagination into stunning artwork with cutting-edge AI.
              Buy, sell, and showcase unique digital art in our marketplace.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                to="/generate"
                className="flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold text-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-purple-500/25"
              >
                <SparklesIcon className="w-6 h-6" />
                <span>Start Creating</span>
              </Link>
              <Link
                to="/gallery"
                className="flex items-center space-x-2 px-8 py-4 bg-gray-800 border border-gray-700 rounded-xl text-white font-semibold text-lg hover:bg-gray-700 transition-all"
              >
                <span>Explore Gallery</span>
                <ArrowRightIcon className="w-5 h-5" />
              </Link>
            </motion.div>
          </div>

          {/* Stats */}
          {stats && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-20 grid grid-cols-3 gap-8 max-w-3xl mx-auto"
            >
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-white">{stats.total_artworks.toLocaleString()}</div>
                <div className="text-gray-400 mt-1">Artworks</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-white">{stats.total_artists.toLocaleString()}</div>
                <div className="text-gray-400 mt-1">Artists</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-white">{stats.total_sales.toLocaleString()}</div>
                <div className="text-gray-400 mt-1">Sales</div>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Trending Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <FireIcon className="w-8 h-8 text-orange-500" />
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Trending Now</h2>
          </div>
          <Link
            to="/gallery?sort=trending"
            className="flex items-center text-purple-400 hover:text-purple-300 transition-colors"
          >
            View All
            <ArrowRightIcon className="w-4 h-4 ml-2" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl skeleton" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {trendingArtworks.slice(0, 4).map((artwork, index) => (
              <motion.div
                key={artwork.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <ArtworkCard artwork={artwork} />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Featured Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <SparklesIcon className="w-8 h-8 text-purple-500" />
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Featured Artworks</h2>
          </div>
          <Link
            to="/gallery"
            className="flex items-center text-purple-400 hover:text-purple-300 transition-colors"
          >
            View All
            <ArrowRightIcon className="w-4 h-4 ml-2" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl skeleton" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredArtworks.slice(0, 6).map((artwork, index) => (
              <motion.div
                key={artwork.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <ArtworkCard artwork={artwork} featured />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 to-pink-600 p-8 sm:p-12">
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to Create Your Masterpiece?
              </h2>
              <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
                Join thousands of artists using AI to push the boundaries of creativity.
                Start generating stunning artwork today.
              </p>
              <Link
                to="/generate"
                className="inline-flex items-center space-x-2 px-8 py-4 bg-white rounded-xl text-purple-600 font-semibold text-lg hover:bg-gray-100 transition-all"
              >
                <SparklesIcon className="w-6 h-6" />
                <span>Generate Art Now</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
