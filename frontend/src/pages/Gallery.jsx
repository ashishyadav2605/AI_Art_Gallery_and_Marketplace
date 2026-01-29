import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { artworksAPI, categoriesAPI, tagsAPI } from '../services/api'
import ArtworkCard from '../components/ArtworkCard'
import {
  FunnelIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'

export default function Gallery() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [artworks, setArtworks] = useState([])
  const [categories, setCategories] = useState([])
  const [popularTags, setPopularTags] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, hasNext: false })

  // Filter states
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    tag: searchParams.get('tag') || '',
    ai_model: searchParams.get('ai_model') || '',
    ordering: searchParams.get('ordering') || '-created_at',
    for_sale: searchParams.get('for_sale') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
  })

  const aiModels = [
    { value: '', label: 'All Models' },
    { value: 'stable_diffusion', label: 'Stable Diffusion' },
    { value: 'dalle', label: 'DALL-E' },
    { value: 'midjourney', label: 'Midjourney Style' },
    { value: 'custom', label: 'Custom' },
  ]

  const sortOptions = [
    { value: '-created_at', label: 'Newest First' },
    { value: 'created_at', label: 'Oldest First' },
    { value: '-likes_count', label: 'Most Liked' },
    { value: '-views', label: 'Most Viewed' },
    { value: 'price', label: 'Price: Low to High' },
    { value: '-price', label: 'Price: High to Low' },
  ]

  const fetchArtworks = useCallback(async (page = 1) => {
    setIsLoading(true)
    try {
      const params = {
        page,
        search: filters.search,
        category: filters.category,
        tag: filters.tag,
        ai_model: filters.ai_model,
        ordering: filters.ordering,
      }
      
      if (filters.for_sale === 'true') params.for_sale = 'true'
      if (filters.min_price) params.min_price = filters.min_price
      if (filters.max_price) params.max_price = filters.max_price

      const response = await artworksAPI.getAll(params)
      if (page === 1) {
        setArtworks(response.data.results || response.data)
      } else {
        setArtworks(prev => [...prev, ...(response.data.results || response.data)])
      }
      setPagination({
        page,
        hasNext: !!response.data.next,
      })
    } catch (error) {
      console.error('Failed to fetch artworks:', error)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [catRes, tagRes] = await Promise.all([
          categoriesAPI.getAll(),
          tagsAPI.getPopular(),
        ])
        setCategories(catRes.data)
        setPopularTags(tagRes.data)
      } catch (error) {
        console.error('Failed to fetch filters:', error)
      }
    }
    fetchFilters()
  }, [])

  useEffect(() => {
    fetchArtworks(1)
  }, [fetchArtworks])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    const newParams = new URLSearchParams(searchParams)
    if (value) {
      newParams.set(key, value)
    } else {
      newParams.delete(key)
    }
    setSearchParams(newParams)
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      tag: '',
      ai_model: '',
      ordering: '-created_at',
      for_sale: '',
      min_price: '',
      max_price: '',
    })
    setSearchParams({})
  }

  const loadMore = () => {
    if (pagination.hasNext && !isLoading) {
      fetchArtworks(pagination.page + 1)
    }
  }

  const activeFiltersCount = Object.values(filters).filter(v => v && v !== '-created_at').length

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Explore Gallery</h1>
        <p className="text-gray-400">Discover amazing AI-generated artworks from talented artists</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        {/* Search */}
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="Search artworks, prompts, artists..."
            className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all"
          />
        </div>

        {/* Sort Dropdown */}
        <div className="relative">
          <select
            value={filters.ordering}
            onChange={(e) => handleFilterChange('ordering', e.target.value)}
            className="appearance-none px-4 py-3 pr-10 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-purple-500 cursor-pointer"
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>

        {/* Filter Button */}
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`flex items-center space-x-2 px-4 py-3 rounded-xl border transition-all ${
            isFilterOpen || activeFiltersCount > 0
              ? 'bg-purple-600 border-purple-600 text-white'
              : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
          }`}
        >
          <FunnelIcon className="w-5 h-5" />
          <span>Filters</span>
          {activeFiltersCount > 0 && (
            <span className="px-2 py-0.5 bg-white/20 rounded-full text-sm">{activeFiltersCount}</span>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      {isFilterOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-8 p-6 bg-gray-800 rounded-2xl border border-gray-700"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Filters</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.slug}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* AI Model */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">AI Model</label>
              <select
                value={filters.ai_model}
                onChange={(e) => handleFilterChange('ai_model', e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                {aiModels.map(model => (
                  <option key={model.value} value={model.value}>{model.label}</option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Min Price ($)</label>
              <input
                type="number"
                value={filters.min_price}
                onChange={(e) => handleFilterChange('min_price', e.target.value)}
                placeholder="0"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Max Price ($)</label>
              <input
                type="number"
                value={filters.max_price}
                onChange={(e) => handleFilterChange('max_price', e.target.value)}
                placeholder="Any"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* For Sale Toggle */}
          <div className="mt-6">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.for_sale === 'true'}
                onChange={(e) => handleFilterChange('for_sale', e.target.checked ? 'true' : '')}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500"
              />
              <span className="text-gray-300">Show only items for sale</span>
            </label>
          </div>

          {/* Popular Tags */}
          {popularTags.length > 0 && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-400 mb-3">Popular Tags</label>
              <div className="flex flex-wrap gap-2">
                {popularTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => handleFilterChange('tag', filters.tag === tag.slug ? '' : tag.slug)}
                    className={`px-3 py-1 rounded-full text-sm transition-all ${
                      filters.tag === tag.slug
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    #{tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Active Filters */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {filters.search && (
            <span className="flex items-center px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300">
              Search: {filters.search}
              <button onClick={() => handleFilterChange('search', '')} className="ml-2">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </span>
          )}
          {filters.category && (
            <span className="flex items-center px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300">
              Category: {filters.category}
              <button onClick={() => handleFilterChange('category', '')} className="ml-2">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </span>
          )}
          {filters.tag && (
            <span className="flex items-center px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300">
              Tag: #{filters.tag}
              <button onClick={() => handleFilterChange('tag', '')} className="ml-2">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Artworks Grid */}
      {isLoading && artworks.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl skeleton" />
          ))}
        </div>
      ) : artworks.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🎨</div>
          <h3 className="text-xl font-semibold text-white mb-2">No artworks found</h3>
          <p className="text-gray-400">Try adjusting your filters or search terms</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {artworks.map((artwork, index) => (
              <motion.div
                key={artwork.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: (index % 8) * 0.05 }}
              >
                <ArtworkCard artwork={artwork} />
              </motion.div>
            ))}
          </div>

          {/* Load More */}
          {pagination.hasNext && (
            <div className="mt-12 text-center">
              <button
                onClick={loadMore}
                disabled={isLoading}
                className="px-8 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white font-medium hover:bg-gray-700 transition-all disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
