import { useState } from 'react'
import { GeneratedAtContext, SetGeneratedAtContext } from '../pageMetaContext.js'

export default function PageMetaProvider({ children }) {
  const [generatedAt, setGeneratedAt] = useState(null)

  return (
    <SetGeneratedAtContext.Provider value={setGeneratedAt}>
      <GeneratedAtContext.Provider value={generatedAt}>{children}</GeneratedAtContext.Provider>
    </SetGeneratedAtContext.Provider>
  )
}
