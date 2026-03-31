import Layout from '../components/Layout'

const Module2 = () => (
  <Layout>
    <div className="p-8">
      <div className="max-w-lg">
        <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-3xl mb-6">🔍</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Social Listening & Ranking</h1>
        <p className="text-gray-500 text-sm mb-6">
          This module will monitor keyword mentions across Google Reviews, blog pages, and Facebook community groups.
          It will also score and rank Kings' schools against competitors using four adjustable weighted components.
        </p>
        <div className="bg-green-50 border border-green-100 rounded-xl px-5 py-4">
          <p className="text-green-700 text-sm font-medium">Coming in Phases 4 & 5</p>
          <p className="text-green-500 text-xs mt-1">Ranking engine → keyword monitoring → Facebook groups → email alerts</p>
        </div>
      </div>
    </div>
  </Layout>
)

export default Module2
