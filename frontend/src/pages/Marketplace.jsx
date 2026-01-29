import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { artworksAPI, marketplaceAPI } from '../services/api'
import ArtworkCard from '../components/ArtworkCard'
import {
  ShoppingBagIcon,
  FireIcon,
  ClockIcon,
  TagIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'

export default function Marketplace() {
  const [forSaleArtworks, setForSaleArtworks] = useState([])
  const [auctionArtworks, setAuctionArtworks] = useState([])
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('for_sale')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [forSaleRes, auctionRes, statsRes] = await Promise.all([
          artworksAPI.getAll({ for_sale: 'true', ordering: '-created_at' }),
          artworksAPI.getAll({ auctions: 'true' }),
          marketplaceAPI.getStats(),
        ])
        setForSaleArtworks(forSaleRes.data.results || forSaleRes.data)
        setAuctionArtworks(auctionRes.data.results || auctionRes.data)
        setStats(statsRes.data)
      } catch (error) {
        console.error('Failed to fetch marketplace data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const tabs = [
    { id: 'for_sale', label: 'For Sale', icon: TagIcon, count: forSaleArtworks.length },
    { id: 'auctions', label: 'Auctions', icon: ClockIcon, count: auctionArtworks.length },
  ]

  const currentArtworks = activeTab === 'for_sale' ? forSaleArtworks : auctionArtworks

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 flex items-center">
          <ShoppingBagIcon className="w-10 h-10 mr-3 text-green-500" />
          Marketplace
        </h1>
        <p className="text-gray-400">Buy and sell unique AI-generated artworks</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 rounded-xl p-6 border border-purple-500/30"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Artworks</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.total_artworks.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <ShoppingBagIcon className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-green-900/50 to-green-800/30 rounded-xl p-6 border border-green-500/30"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Sales</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.total_sales.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <ArrowTrendingUpIcon className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-orange-900/50 to-orange-800/30 rounded-xl p-6 border border-orange-500/30"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">For Sale</p>
                <p className="text-2xl font-bold text-white mt-1">{forSaleArtworks.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <TagIcon className="w-6 h-6 text-orange-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-pink-900/50 to-pink-800/30 rounded-xl p-6 border border-pink-500/30"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Live Auctions</p>
                <p className="text-2xl font-bold text-white mt-1">{auctionArtworks.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center">
                <FireIcon className="w-6 h-6 text-pink-400" />
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 mb-8 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span>{tab.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-sm ${
              activeTab === tab.id ? 'bg-white/20' : 'bg-gray-700'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Artworks Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl skeleton" />
          ))}
        </div>
      ) : currentArtworks.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingBagIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No items available</h3>
          <p className="text-gray-400">
            {activeTab === 'for_sale' 
              ? 'No artworks are currently listed for sale'
              : 'No live auctions at the moment'}
          </p>
          <Link
            to="/generate"
            className="inline-flex items-center mt-6 px-6 py-3 bg-purple-600 rounded-xl text-white font-medium hover:bg-purple-700 transition-all"
          >
            Create and Sell Your Art
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {currentArtworks.map((artwork, index) => (
            <motion.div
              key={artwork.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <ArtworkCard artwork={artwork} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Recent Sales */}
      {stats?.recent_sales && stats.recent_sales.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-white mb-6">Recent Sales</h2>
          <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Item</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 hidden sm:table-cell">Buyer</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 hidden md:table-cell">Seller</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {stats.recent_sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500" />
                        <span className="text-white font-medium">{sale.artwork?.title || 'Artwork'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <span className="text-gray-300">@{sale.buyer?.username || 'Anonymous'}</span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="text-gray-300">@{sale.seller?.username || 'Anonymous'}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-green-400 font-semibold">${parseFloat(sale.amount).toFixed(2)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
