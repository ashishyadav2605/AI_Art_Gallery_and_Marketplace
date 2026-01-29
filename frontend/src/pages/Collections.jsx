import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { collectionsAPI, artworksAPI } from '../services/api'
import ArtworkCard from '../components/ArtworkCard'
import toast from 'react-hot-toast'
import {
  FolderIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  XMarkIcon,
  LockClosedIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline'

export default function Collections() {
  const [collections, setCollections] = useState([])
  const [selectedCollection, setSelectedCollection] = useState(null)
  const [collectionArtworks, setCollectionArtworks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCollection, setEditingCollection] = useState(null)
  const [formData, setFormData] = useState({ name: '', description: '', is_public: true })

  useEffect(() => {
    fetchCollections()
  }, [])

  useEffect(() => {
    if (selectedCollection) {
      fetchCollectionArtworks(selectedCollection.id)
    }
  }, [selectedCollection])

  const fetchCollections = async () => {
    try {
      const response = await collectionsAPI.getAll()
      setCollections(response.data.results || response.data)
    } catch (error) {
      console.error('Failed to fetch collections:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCollectionArtworks = async (collectionId) => {
    try {
      const response = await collectionsAPI.getById(collectionId)
      setCollectionArtworks(response.data.artworks || [])
    } catch (error) {
      console.error('Failed to fetch collection artworks:', error)
    }
  }

  const handleCreateCollection = async () => {
    try {
      const response = await collectionsAPI.create(formData)
      setCollections([...collections, response.data])
      setShowCreateModal(false)
      setFormData({ name: '', description: '', is_public: true })
      toast.success('Collection created!')
    } catch (error) {
      toast.error('Failed to create collection')
    }
  }

  const handleUpdateCollection = async () => {
    try {
      const response = await collectionsAPI.update(editingCollection.id, formData)
      setCollections(collections.map(c => c.id === editingCollection.id ? response.data : c))
      setEditingCollection(null)
      setFormData({ name: '', description: '', is_public: true })
      toast.success('Collection updated!')
    } catch (error) {
      toast.error('Failed to update collection')
    }
  }

  const handleDeleteCollection = async (collection) => {
    if (!confirm(`Delete collection "${collection.name}"?`)) return
    try {
      await collectionsAPI.delete(collection.id)
      setCollections(collections.filter(c => c.id !== collection.id))
      if (selectedCollection?.id === collection.id) {
        setSelectedCollection(null)
      }
      toast.success('Collection deleted')
    } catch (error) {
      toast.error('Failed to delete collection')
    }
  }

  const handleRemoveFromCollection = async (artworkId) => {
    try {
      await collectionsAPI.removeArtwork(selectedCollection.id, artworkId)
      setCollectionArtworks(collectionArtworks.filter(a => a.id !== artworkId))
      toast.success('Removed from collection')
    } catch (error) {
      toast.error('Failed to remove artwork')
    }
  }

  const openEditModal = (collection) => {
    setEditingCollection(collection)
    setFormData({
      name: collection.name,
      description: collection.description || '',
      is_public: collection.is_public,
    })
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Collections</h1>
          <p className="text-gray-400">Organize your favorite artworks</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="mt-4 sm:mt-0 inline-flex items-center px-6 py-3 bg-purple-600 rounded-xl text-white font-medium hover:bg-purple-700 transition-all"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          New Collection
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Collections List */}
        <div className="lg:w-80 flex-shrink-0">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h3 className="font-semibold text-white">Collections ({collections.length})</h3>
            </div>
            <div className="max-h-96 lg:max-h-[calc(100vh-300px)] overflow-y-auto">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 rounded-xl skeleton" />
                  ))}
                </div>
              ) : collections.length === 0 ? (
                <div className="p-8 text-center">
                  <FolderIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No collections yet</p>
                </div>
              ) : (
                <div className="p-2">
                  {collections.map((collection) => (
                    <motion.button
                      key={collection.id}
                      onClick={() => setSelectedCollection(collection)}
                      className={`w-full p-4 rounded-xl text-left transition-all ${
                        selectedCollection?.id === collection.id
                          ? 'bg-purple-600'
                          : 'bg-gray-700/50 hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-white truncate">{collection.name}</span>
                            {collection.is_public ? (
                              <GlobeAltIcon className="w-4 h-4 text-gray-400" />
                            ) : (
                              <LockClosedIcon className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <p className="text-sm text-gray-400 mt-1">
                            {collection.artwork_count || 0} artworks
                          </p>
                        </div>
                        <div className="flex space-x-1 ml-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditModal(collection); }}
                            className="p-1.5 hover:bg-white/20 rounded-lg"
                          >
                            <PencilIcon className="w-4 h-4 text-gray-400" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteCollection(collection); }}
                            className="p-1.5 hover:bg-red-500/20 rounded-lg"
                          >
                            <TrashIcon className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Collection Content */}
        <div className="flex-1">
          {selectedCollection ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedCollection.name}</h2>
                  {selectedCollection.description && (
                    <p className="text-gray-400 mt-1">{selectedCollection.description}</p>
                  )}
                </div>
              </div>

              {collectionArtworks.length === 0 ? (
                <div className="text-center py-20 bg-gray-800 rounded-2xl border border-gray-700">
                  <FolderIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Empty Collection</h3>
                  <p className="text-gray-400 mb-6">Add artworks from the gallery</p>
                  <Link
                    to="/gallery"
                    className="inline-flex px-6 py-3 bg-purple-600 rounded-xl text-white font-medium hover:bg-purple-700"
                  >
                    Browse Gallery
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {collectionArtworks.map((artwork, index) => (
                    <motion.div
                      key={artwork.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative group"
                    >
                      <ArtworkCard artwork={artwork} />
                      <button
                        onClick={() => handleRemoveFromCollection(artwork.id)}
                        className="absolute top-4 right-4 p-2 bg-red-500/80 rounded-xl text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600"
                        title="Remove from collection"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 bg-gray-800 rounded-2xl border border-gray-700">
              <FolderIcon className="w-20 h-20 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Select a Collection</h3>
              <p className="text-gray-400">Choose a collection to view its artworks</p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {(showCreateModal || editingCollection) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70"
              onClick={() => { setShowCreateModal(false); setEditingCollection(null); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700"
            >
              <h3 className="text-xl font-bold text-white mb-4">
                {editingCollection ? 'Edit Collection' : 'New Collection'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="My Collection"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What's this collection about?"
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_public}
                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-white">Public collection</span>
                </label>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => { setShowCreateModal(false); setEditingCollection(null); }}
                  className="flex-1 py-3 bg-gray-700 rounded-xl text-white font-medium hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={editingCollection ? handleUpdateCollection : handleCreateCollection}
                  disabled={!formData.name.trim()}
                  className="flex-1 py-3 bg-purple-600 rounded-xl text-white font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  {editingCollection ? 'Update' : 'Create'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
