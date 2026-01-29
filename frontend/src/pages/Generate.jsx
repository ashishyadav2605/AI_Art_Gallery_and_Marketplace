import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { generateAPI, artworksAPI } from '../services/api'
import { useGenerationStore } from '../store'
import toast from 'react-hot-toast'
import {
  SparklesIcon,
  PhotoIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  PlusCircleIcon,
  Cog6ToothIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline'

const AI_MODELS = [
  { value: 'stable_diffusion', label: 'Stable Diffusion', description: 'Best for detailed, artistic images' },
  { value: 'dalle', label: 'DALL-E', description: 'Great for creative interpretations' },
  { value: 'midjourney', label: 'Midjourney Style', description: 'Artistic and aesthetic results' },
]

const STYLE_PRESETS = [
  { name: 'Photorealistic', modifier: 'photorealistic, highly detailed, 8k resolution, professional photography' },
  { name: 'Digital Art', modifier: 'digital art, concept art, trending on artstation, highly detailed' },
  { name: 'Anime', modifier: 'anime style, detailed anime art, vibrant colors, studio quality' },
  { name: 'Fantasy', modifier: 'fantasy art, magical, ethereal lighting, detailed environment, epic' },
  { name: 'Cyberpunk', modifier: 'cyberpunk style, neon lights, futuristic, high tech, night city' },
  { name: 'Watercolor', modifier: 'watercolor painting, soft colors, artistic, delicate, flowing' },
  { name: 'Oil Painting', modifier: 'oil painting style, masterpiece, vibrant colors, detailed brushwork' },
  { name: 'Sketch', modifier: 'pencil sketch, detailed linework, artistic, professional illustration' },
]

const PROMPT_SUGGESTIONS = [
  "A serene mountain lake at sunset with snow-capped peaks reflecting in crystal clear water",
  "Cyberpunk city street at night with neon signs and flying vehicles",
  "Enchanted forest with bioluminescent plants and mystical creatures",
  "Elegant portrait of a mysterious figure in Renaissance style clothing",
  "Ancient dragon perched atop a crystal mountain at twilight",
  "Space station orbiting a gas giant with multiple moons visible",
  "Magical library with floating books and ethereal librarians",
  "Steampunk inventor's workshop with clockwork mechanisms",
]

export default function Generate() {
  const { settings, updateSettings, isGenerating, setGenerating, generatedImages, setGeneratedImages } = useGenerationStore()
  
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState(null)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [saveData, setSaveData] = useState({ title: '', description: '', isForSale: false, price: 0 })

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    setGenerating(true)
    setGeneratedImages([])

    try {
      let finalPrompt = prompt
      if (selectedStyle) {
        const style = STYLE_PRESETS.find(s => s.name === selectedStyle)
        if (style) {
          finalPrompt = `${prompt}, ${style.modifier}`
        }
      }

      const response = await generateAPI.generate({
        prompt: finalPrompt,
        negative_prompt: negativePrompt || settings.negative_prompt,
        ai_model: settings.ai_model,
        width: settings.width,
        height: settings.height,
        steps: settings.steps,
        cfg_scale: settings.cfg_scale,
        num_images: 1,
      })

      if (response.data.status === 'completed') {
        setGeneratedImages(response.data.images)
        toast.success('Image generated successfully!')
      } else {
        toast.error('Generation failed: ' + (response.data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Generation error:', error)
      toast.error(error.response?.data?.error || 'Failed to generate image')
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveToGallery = async () => {
    if (!saveData.title.trim()) {
      toast.error('Please enter a title')
      return
    }

    try {
      // For now, we'll create the artwork directly
      const artworkData = {
        title: saveData.title,
        description: saveData.description,
        prompt: prompt,
        negative_prompt: negativePrompt,
        ai_model: settings.ai_model,
        width: settings.width,
        height: settings.height,
        steps: settings.steps,
        cfg_scale: settings.cfg_scale,
        is_for_sale: saveData.isForSale,
        price: saveData.isForSale ? saveData.price : 0,
        status: 'published',
        image_url: generatedImages[0]?.url,
      }

      await artworksAPI.create(artworkData)
      toast.success('Artwork saved to gallery!')
      setSaveModalOpen(false)
      setSaveData({ title: '', description: '', isForSale: false, price: 0 })
    } catch (error) {
      toast.error('Failed to save artwork')
    }
  }

  const handleDownload = async (imageUrl) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ai-art-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success('Image downloaded!')
    } catch (error) {
      toast.error('Failed to download image')
    }
  }

  const applyStylePreset = (styleName) => {
    setSelectedStyle(selectedStyle === styleName ? null : styleName)
  }

  const useSuggestion = (suggestion) => {
    setPrompt(suggestion)
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 flex items-center">
          <SparklesIcon className="w-10 h-10 mr-3 text-purple-500" />
          AI Art Generator
        </h1>
        <p className="text-gray-400">Transform your imagination into stunning artwork</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left - Controls */}
        <div className="space-y-6">
          {/* Prompt Input */}
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <label className="block text-lg font-semibold text-white mb-4">
              Describe your artwork
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A majestic dragon soaring through a sunset sky, digital art, highly detailed..."
              rows={4}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
            />
            
            {/* Suggestions */}
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-400 mb-2">
                <LightBulbIcon className="w-4 h-4 mr-1" />
                Try these prompts:
              </div>
              <div className="flex flex-wrap gap-2">
                {PROMPT_SUGGESTIONS.slice(0, 3).map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => useSuggestion(suggestion)}
                    className="text-xs px-3 py-1 bg-gray-700 rounded-full text-gray-300 hover:bg-purple-600 hover:text-white transition-all truncate max-w-[200px]"
                  >
                    {suggestion.substring(0, 40)}...
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Style Presets */}
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <label className="block text-lg font-semibold text-white mb-4">
              Style Presets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STYLE_PRESETS.map((style) => (
                <button
                  key={style.name}
                  onClick={() => applyStylePreset(style.name)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedStyle === style.name
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {style.name}
                </button>
              ))}
            </div>
          </div>

          {/* AI Model Selection */}
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <label className="block text-lg font-semibold text-white mb-4">
              AI Model
            </label>
            <div className="space-y-3">
              {AI_MODELS.map((model) => (
                <label
                  key={model.value}
                  className={`flex items-center p-4 rounded-xl cursor-pointer transition-all ${
                    settings.ai_model === model.value
                      ? 'bg-purple-600/20 border-purple-500'
                      : 'bg-gray-700 border-transparent hover:bg-gray-600'
                  } border`}
                >
                  <input
                    type="radio"
                    name="ai_model"
                    value={model.value}
                    checked={settings.ai_model === model.value}
                    onChange={() => updateSettings({ ai_model: model.value })}
                    className="sr-only"
                  />
                  <div>
                    <span className="font-medium text-white">{model.label}</span>
                    <p className="text-sm text-gray-400">{model.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full p-6"
            >
              <div className="flex items-center">
                <Cog6ToothIcon className="w-5 h-5 text-gray-400 mr-2" />
                <span className="font-semibold text-white">Advanced Settings</span>
              </div>
              <span className="text-gray-400">{showAdvanced ? '−' : '+'}</span>
            </button>
            
            {showAdvanced && (
              <div className="px-6 pb-6 space-y-4">
                {/* Negative Prompt */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Negative Prompt
                  </label>
                  <textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="blurry, low quality, distorted..."
                    rows={2}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                {/* Image Size */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Width</label>
                    <select
                      value={settings.width}
                      onChange={(e) => updateSettings({ width: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    >
                      {[256, 512, 768, 1024].map(size => (
                        <option key={size} value={size}>{size}px</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Height</label>
                    <select
                      value={settings.height}
                      onChange={(e) => updateSettings({ height: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    >
                      {[256, 512, 768, 1024].map(size => (
                        <option key={size} value={size}>{size}px</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Steps & CFG Scale */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Steps: {settings.steps}
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={settings.steps}
                      onChange={(e) => updateSettings({ steps: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      CFG Scale: {settings.cfg_scale}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="0.5"
                      value={settings.cfg_scale}
                      onChange={(e) => updateSettings({ cfg_scale: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full flex items-center justify-center space-x-3 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold text-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <ArrowPathIcon className="w-6 h-6 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <SparklesIcon className="w-6 h-6" />
                <span>Generate Art</span>
              </>
            )}
          </button>
        </div>

        {/* Right - Preview */}
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h3 className="font-semibold text-white flex items-center">
                <PhotoIcon className="w-5 h-5 mr-2" />
                Generated Art
              </h3>
            </div>
            
            <div className="p-6">
              {generatedImages.length > 0 ? (
                <div className="space-y-4">
                  {generatedImages.map((img, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative group"
                    >
                      <img
                        src={img.base64 ? `data:image/png;base64,${img.base64}` : img.url}
                        alt={`Generated art ${index + 1}`}
                        className="w-full rounded-xl"
                      />
                      
                      {/* Action buttons overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center space-x-4">
                        <button
                          onClick={() => handleDownload(img.base64 ? `data:image/png;base64,${img.base64}` : img.url)}
                          className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                        >
                          <ArrowDownTrayIcon className="w-6 h-6 text-white" />
                        </button>
                        <button
                          onClick={() => setSaveModalOpen(true)}
                          className="p-3 bg-purple-600 rounded-full hover:bg-purple-700 transition-colors"
                        >
                          <PlusCircleIcon className="w-6 h-6 text-white" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* Quick Actions */}
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleDownload(generatedImages[0]?.base64 ? `data:image/png;base64,${generatedImages[0].base64}` : generatedImages[0]?.url)}
                      className="flex-1 flex items-center justify-center space-x-2 py-3 bg-gray-700 rounded-xl text-white hover:bg-gray-600 transition-all"
                    >
                      <ArrowDownTrayIcon className="w-5 h-5" />
                      <span>Download</span>
                    </button>
                    <button
                      onClick={() => setSaveModalOpen(true)}
                      className="flex-1 flex items-center justify-center space-x-2 py-3 bg-purple-600 rounded-xl text-white hover:bg-purple-700 transition-all"
                    >
                      <PlusCircleIcon className="w-5 h-5" />
                      <span>Save to Gallery</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="aspect-square flex flex-col items-center justify-center text-gray-500">
                  {isGenerating ? (
                    <div className="text-center">
                      <div className="relative w-24 h-24 mx-auto mb-4">
                        <div className="absolute inset-0 rounded-full border-4 border-purple-500/30" />
                        <div className="absolute inset-0 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
                      </div>
                      <p className="text-lg font-medium text-gray-300">Creating your masterpiece...</p>
                      <p className="text-sm text-gray-500 mt-1">This may take a moment</p>
                    </div>
                  ) : (
                    <>
                      <SparklesIcon className="w-16 h-16 mb-4 text-gray-600" />
                      <p className="text-lg">Your artwork will appear here</p>
                      <p className="text-sm text-gray-600 mt-1">Enter a prompt and click generate</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save Modal */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-gray-700"
          >
            <h3 className="text-xl font-bold text-white mb-4">Save to Gallery</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Title</label>
                <input
                  type="text"
                  value={saveData.title}
                  onChange={(e) => setSaveData({ ...saveData, title: e.target.value })}
                  placeholder="Give your artwork a name"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                <textarea
                  value={saveData.description}
                  onChange={(e) => setSaveData({ ...saveData, description: e.target.value })}
                  placeholder="Tell us about this artwork..."
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveData.isForSale}
                  onChange={(e) => setSaveData({ ...saveData, isForSale: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500"
                />
                <span className="text-gray-300">List for sale</span>
              </label>
              
              {saveData.isForSale && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Price ($)</label>
                  <input
                    type="number"
                    value={saveData.price}
                    onChange={(e) => setSaveData({ ...saveData, price: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setSaveModalOpen(false)}
                className="flex-1 py-3 bg-gray-700 rounded-xl text-gray-300 hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveToGallery}
                className="flex-1 py-3 bg-purple-600 rounded-xl text-white hover:bg-purple-700 transition-all"
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
