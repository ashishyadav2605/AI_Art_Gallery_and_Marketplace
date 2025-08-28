import React from 'react'
import { motion } from 'framer-motion'

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
      <motion.h1 initial={{opacity:0, y:-20}} animate={{opacity:1, y:0}} transition={{duration:1}} className="text-4xl font-bold">
        🎨 AI Art Gallery Marketplace
      </motion.h1>
      <p className="mt-4 text-gray-300">Generate, share, and buy AI-powered art.</p>
    </div>
  )
}

export default App
