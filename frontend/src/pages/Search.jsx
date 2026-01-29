import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { searchAPI } from '../services/api'
import ArtworkCard from '../components/ArtworkCard'
import {
  MagnifyingGlassIcon,
  PhotoIcon,
  UserIcon,
  TagIcon,
} from '@heroicons/react/24/outline'

export default function Search() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const [results, setResults] = useState({ artworks: [], users: [], tags: [] })
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('artworks')

  useEffect(() => {
    if (query.trim()) {
      performSearch()
    }
  }, [query])

  const performSearch = async () => {
    setIsLoading(true)
    try {
      const response = await searchAPI.search(query)
      setResults(response.data)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const tabs = [
    { id: 'artworks', label: 'Artworks', icon: PhotoIcon, count: results.artworks?.length || 0 },
    { id: 'users', label: 'Users', icon: UserIcon, count: results.users?.length || 0 },
    { id: 'tags', label: 'Tags', icon: TagIcon, count: results.tags?.length || 0 },
  ]

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
          <MagnifyingGlassIcon className="w-8 h-8 mr-3 text-purple-400" />
          Search Results
        </h1>
        <p className="text-gray-400">
          {query ? `Results for "${query}"` : 'Enter a search term'}
        </p>
      </div>

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

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full" />
        </div>
      )}

      {/* No Query */}
      {!query && !isLoading && (
        <div className="text-center py-20 bg-gray-800 rounded-2xl border border-gray-700">
          <MagnifyingGlassIcon className="w-20 h-20 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Start Searching</h3>
          <p className="text-gray-400">Use the search bar to find artworks, artists, and more</p>
        </div>
      )}

      {/* Results */}
      {query && !isLoading && (
        <>
          {/* Artworks Tab */}
          {activeTab === 'artworks' && (
            <>
              {results.artworks?.length === 0 ? (
                <div className="text-center py-20 bg-gray-800 rounded-2xl border border-gray-700">
                  <PhotoIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Artworks Found</h3>
                  <p className="text-gray-400">Try a different search term</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {results.artworks?.map((artwork, index) => (
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
            </>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <>
              {results.users?.length === 0 ? (
                <div className="text-center py-20 bg-gray-800 rounded-2xl border border-gray-700">
                  <UserIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Users Found</h3>
                  <p className="text-gray-400">Try a different search term</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.users?.map((user, index) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        to={`/user/${user.username}`}
                        className="block bg-gray-800 rounded-2xl p-6 border border-gray-700 hover:border-purple-500 transition-all"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">@{user.username}</h3>
                            {user.first_name && (
                              <p className="text-gray-400">{user.first_name} {user.last_name}</p>
                            )}
                            <p className="text-sm text-purple-400 mt-1">
                              {user.artwork_count || 0} artworks
                            </p>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Tags Tab */}
          {activeTab === 'tags' && (
            <>
              {results.tags?.length === 0 ? (
                <div className="text-center py-20 bg-gray-800 rounded-2xl border border-gray-700">
                  <TagIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Tags Found</h3>
                  <p className="text-gray-400">Try a different search term</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {results.tags?.map((tag, index) => (
                    <motion.div
                      key={tag.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        to={`/gallery?tag=${tag.slug}`}
                        className="inline-flex items-center px-6 py-3 bg-gray-800 rounded-xl border border-gray-700 hover:border-purple-500 hover:bg-gray-700 transition-all group"
                      >
                        <TagIcon className="w-5 h-5 text-purple-400 mr-2" />
                        <span className="text-white font-medium group-hover:text-purple-300">
                          #{tag.name}
                        </span>
                        <span className="ml-3 px-2 py-1 bg-gray-700 rounded-full text-sm text-gray-400">
                          {tag.artwork_count || 0}
                        </span>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
