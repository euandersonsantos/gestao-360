
import { useState, useEffect } from "react"

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean>(false)

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)")
    const onChange = () => setIsMobile(window.innerWidth < 768)
    mql.addListener(onChange)
    setIsMobile(window.innerWidth < 768)
    return () => mql.removeListener(onChange)
  }, [])

  return isMobile
}
