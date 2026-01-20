import { useContext } from 'react'
import { ZenContext } from '@/context/ZenContext'

export const useZenMode = () => {
  const context = useContext(ZenContext)
  if (context === undefined) {
    throw new Error('useZenMode must be used within a ZenProvider')
  }
  return context
}
