import React, { useState, useEffect } from 'react'
import { ZenContext } from '@/context/ZenContext'

export const ZenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isZenMode, setIsZenMode] = useState(false)

  const toggleZenMode = () => setIsZenMode((prev) => !prev)

  // Zen Mode Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Support both Alt and Option (on Mac, e.altKey is true for Option)
      const isAltZ = e.altKey && (e.key === 'z' || e.key === 'Z' || e.code === 'KeyZ')

      if (isAltZ) {
        e.preventDefault()
        e.stopPropagation()
        toggleZenMode()
        return
      }

      // ESC to exit
      if (e.key === 'Escape' && isZenMode) {
        setIsZenMode(false)
      }
    }

    // Use capture phase to ensure we catch the event before other components
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isZenMode])

  return (
    <ZenContext.Provider value={{ isZenMode, setIsZenMode, toggleZenMode }}>
      {children}
    </ZenContext.Provider>
  )
}
