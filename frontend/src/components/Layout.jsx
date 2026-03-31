import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import InsightsPanel from './InsightsPanel'

const Layout = ({ children, showInsights = true }) => {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true' }
    catch { return false }
  })

  const [insightsCollapsed, setInsightsCollapsed] = useState(() => {
    try { return localStorage.getItem('insights-collapsed') === 'true' }
    catch { return false }
  })

  useEffect(() => {
    try { localStorage.setItem('sidebar-collapsed', collapsed) }
    catch {}
  }, [collapsed])

  useEffect(() => {
    try { localStorage.setItem('insights-collapsed', insightsCollapsed) }
    catch {}
  }, [insightsCollapsed])

  // Right margin: full panel = mr-72, collapsed strip = mr-10, hidden = mr-0
  const rightMargin = showInsights
    ? insightsCollapsed ? 'mr-10' : 'mr-72'
    : ''

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left sidebar — fixed */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Main content — squeezed between both sidebars */}
      <main
        className={`flex-1 overflow-auto transition-all duration-300 ease-in-out ${
          collapsed ? 'ml-[68px]' : 'ml-64'
        } ${rightMargin}`}
      >
        {children}
      </main>

      {/* Right insights panel — conditionally shown */}
      {showInsights && (
        <InsightsPanel
          collapsed={insightsCollapsed}
          setCollapsed={setInsightsCollapsed}
        />
      )}
    </div>
  )
}

export default Layout
