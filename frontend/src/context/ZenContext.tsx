import { createContext } from 'react'

export interface ZenContextType {
  isZenMode: boolean
  setIsZenMode: (value: boolean) => void
  toggleZenMode: () => void
}

export const ZenContext = createContext<ZenContextType | undefined>(undefined)
