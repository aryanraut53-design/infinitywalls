import React, { useEffect, useState } from 'react';
import Lenis from 'lenis';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import WallpaperGrid from './components/WallpaperGrid';

// Custom hook to detect mobile screens
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  return isMobile;
};

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeType, setActiveType] = useState('All');
  const [wallpaperCounts, setWallpaperCounts] = useState({ total: 0, live: 0, static: 0 });

  // Load counts once on mount
  useEffect(() => {
    fetch('/wallpapers.json')
      .then(r => r.json())
      .then(data => {
        const normalized = data.map(w => typeof w === 'string' ? { type: 'live' } : w);
        const live = normalized.filter(w => w.type === 'live' || (!w.type && w.video_url)).length;
        const staticCount = normalized.filter(w => w.type === 'static').length;
        setWallpaperCounts({ total: normalized.length, live, static: staticCount });
      })
      .catch(() => {});
  }, []);

  const [showFavorites, setShowFavorites] = useState(false);
  const isMobile = useIsMobile();
  
  // Force static view on mobile
  useEffect(() => {
    if (isMobile && activeType === 'live') {
      setActiveType('static');
    }
  }, [isMobile, activeType]);

  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('infinitywalls_favorites');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });

  const toggleFavorite = (id) => {
    setFavorites(prev => {
      const isFav = prev.includes(id);
      const updated = isFav ? prev.filter(f => f !== id) : [...prev, id];
      localStorage.setItem('infinitywalls_favorites', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  return (
    <div className="min-h-screen bg-[#070710] text-white font-sans selection:bg-primary/50 selection:text-white">
      <Navbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        showFavorites={showFavorites}
        setShowFavorites={setShowFavorites}
        favoritesCount={favorites.length}
      />
      <Hero counts={wallpaperCounts} />
      <main id="gallery" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Section header + type toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {showFavorites 
                ? 'Your Favorites' 
                : (activeCategory === 'All' ? 'All Wallpapers' : `${activeCategory} Wallpapers`)}
            </h2>
            <p className="text-sm text-white/40 mt-1">
              {showFavorites 
                ? `${favorites.length} saved wallpapers`
                : activeType === 'All' 
                  ? `${wallpaperCounts.total.toLocaleString()} wallpapers` 
                  : activeType === 'live' 
                    ? `⚡ ${wallpaperCounts.live.toLocaleString()} Live Animated` 
                    : `📷 ${wallpaperCounts.static.toLocaleString()} 4K Static`}
            </p>
          </div>

          {/* Type toggle pills */}
          <div className="flex items-center gap-1 p-1 rounded-full glass">
            {[
              { id: 'All', label: 'All' },
              { id: 'live', label: '⚡ Live' },
              { id: 'static', label: '📷 Static' },
            ].filter(tab => !(isMobile && tab.id === 'live')).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveType(id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeType === id
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <WallpaperGrid
          searchQuery={searchQuery}
          activeCategory={activeCategory}
          activeType={activeType}
          showFavorites={showFavorites}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
        />
      </main>
    </div>
  );
}

export default App;
