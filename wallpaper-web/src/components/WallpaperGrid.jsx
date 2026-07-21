import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import Masonry from 'react-masonry-css';
import WallpaperCard from './WallpaperCard';

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

const SKELETON_COUNT = 12;
const PAGE_SIZE = 24;

const WallpaperGrid = ({ searchQuery = '', activeCategory = 'All', activeType = 'All', showFavorites = false, favorites = [], toggleFavorite }) => {
  const [wallpapers, setWallpapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const filteredRef = useRef([]);

  const isMobile = useIsMobile();

  // Bulletproof scroll-based infinite scroll — works for every category/filter
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.documentElement.scrollHeight;
      if (scrolled >= total - 400) {
        // Always increment — content cycles infinitely
        setVisibleCount(prev => prev + PAGE_SIZE);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    fetch('/wallpapers.json')
      .then(res => res.json())
      .then(data => {
        // Ensure all items are objects, tag strings as live
        const normalized = data.map(w =>
          typeof w === 'string' ? { id: w, video_url: w, type: 'live', title: w.split('/').pop() } : w
        );
        
        // Shuffle everything using Fisher-Yates
        for (let i = normalized.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [normalized[i], normalized[j]] = [normalized[j], normalized[i]];
        }
        
        // If they meant "true randomization" to force statics to the top, we can sort them
        // randomly but ensure a healthy mix by moving some statics up.
        // Actually, Fisher-Yates is statistically perfectly random.
        setWallpapers(normalized);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load wallpapers', err);
        setLoading(false);
      });
  }, []);

  // Live polling for new wallpapers every 60 seconds
  useEffect(() => {
    const fetchLatest = () => {
      // Add a cache buster parameter so the browser doesn't return a stale JSON file
      fetch(`/wallpapers.json?t=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
          const normalized = data.map(w =>
            typeof w === 'string' ? { id: w, video_url: w, type: 'live', title: w.split('/').pop() } : w
          );
          
          setWallpapers(prev => {
            const prevIds = new Set(prev.map(w => w.id));
            const newItems = normalized.filter(w => !prevIds.has(w.id));
            
            if (newItems.length > 0) {
              console.log(`Live update: prepending ${newItems.length} new wallpapers!`);
              return [...newItems, ...prev];
            }
            return prev;
          });
        })
        .catch(err => console.error('Live polling failed:', err));
    };

    const intervalId = setInterval(fetchLatest, 60000); // Poll every 60s
    return () => clearInterval(intervalId);
  }, []);

  // Reset visible count when filters change, and scroll back to top of grid
  useEffect(() => {
    setVisibleCount(24);
    
    // Smooth scroll back to the top of the gallery so the observer resets correctly
    const gallery = document.getElementById('gallery');
    if (gallery) {
      const offset = gallery.getBoundingClientRect().top + window.scrollY - 100;
      if (window.scrollY > offset) {
        window.scrollTo({ top: offset, behavior: 'smooth' });
      }
    }
  }, [searchQuery, activeCategory, activeType]);

  const breakpointCols = { default: 4, 1280: 4, 1024: 3, 768: 2, 500: 2 };

  const filtered = wallpapers.filter(file => {
    if (!file || typeof file !== 'object') return false;

    // Favorites shortcut: if showFavorites is true, ignore all other filters except search maybe?
    // Actually let's ignore category and type, just apply search if there's any.
    if (showFavorites) {
      if (!favorites.includes(file.id)) return false;
      if (searchQuery) {
        const title = (file.title || file.id || '').toLowerCase();
        if (!title.includes(searchQuery.toLowerCase())) return false;
      }
      return true;
    }

    // Type filter
    const isLive = file.type === 'live' || (!file.type && file.video_url && !file.image_url);
    
    // Hide live wallpapers on mobile devices
    if (isMobile && isLive) return false;

    if (activeType === 'live' && !isLive) return false;
    if (activeType === 'static' && isLive) return false;

    // Category filter — match against id (page URL or wallhaven URL)
    if (activeCategory !== 'All') {
      const pageUrl = (file.id || '').toLowerCase();
      const fileCat = (file.category || '').toLowerCase();
      const cat = activeCategory.toLowerCase();
      const catMap = {
        'anime': 'anime',
        'games': 'games',
        'sci-fi': 'sci-fi',
        'landscape': 'landscape',
        'vehicles': 'vehicle',
      };
      const segment = catMap[cat] || cat;
      const matchesUrl = pageUrl.includes(`/${segment}/`) || pageUrl.includes(`/${cat}/`);
      const matchesCat = fileCat === segment || fileCat === cat;
      if (!matchesUrl && !matchesCat) return false;
    }

    // Search filter
    if (searchQuery) {
      const title = (file.title || file.id || '').toLowerCase();
      if (!title.includes(searchQuery.toLowerCase())) return false;
    }

    return true;
  });

  // Keep filteredRef in sync so the scroll handler always sees the latest count
  filteredRef.current = filtered;

  // Build a virtual infinite list by cycling through the filtered pool.
  // This means scrolling NEVER ends — just like Pinterest.
  const buildVirtualList = () => {
    if (filtered.length === 0) return [];
    
    // Do not loop infinitely for favorites, just show the exact favorites list
    if (showFavorites) {
      return filtered.slice(0, visibleCount).map((item, i) => ({
        ...item,
        _virtualKey: `${item.id || 'item'}-fav-${i}`,
      }));
    }

    const result = [];
    let cycle = 0;
    while (result.length < visibleCount) {
      // Each cycle, shuffle the source differently using cycle as seed offset
      const slice = [...filtered];
      if (cycle > 0) {
        // shift array by a different offset each cycle to avoid obvious repetition
        const offset = (cycle * 7) % slice.length;
        const rotated = [...slice.slice(offset), ...slice.slice(0, offset)];
        result.push(...rotated);
      } else {
        result.push(...slice);
      }
      cycle++;
    }
    // Assign unique keys by appending the exact index 'i', ensuring 100% uniqueness
    // even if 'filtered' contains duplicate items or across infinite cycles.
    return result.slice(0, visibleCount).map((item, i) => ({
      ...item,
      _virtualKey: `${item.id || 'item'}-cycle-${i}`,
    }));
  };

  const visible = buildVirtualList();

  return (
    <>
      {/* Count line */}
      {!loading && filtered.length > 0 && (
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs text-white/25">
            {filtered.length.toLocaleString()} wallpapers in this view
          </span>
          {!showFavorites && visibleCount > filtered.length && (
            <span className="text-[10px] text-primary/40 bg-primary/10 px-2 py-0.5 rounded-full">
              ∞ cycling
            </span>
          )}
        </div>
      )}


      <Masonry
        breakpointCols={breakpointCols}
        className="masonry-grid"
        columnClassName="masonry-grid_column"
      >
        {loading
          ? [...Array(SKELETON_COUNT)].map((_, i) => (
            <div key={i} className="masonry-item">
              <div className="aspect-video rounded-2xl bg-white/5 animate-pulse" />
            </div>
          ))
          : visible.map((file, i) => (
            <motion.div 
              key={file._virtualKey || file.id || i} 
              className="masonry-item"
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "100px" }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <WallpaperCard 
                file={file} 
                index={i} 
                isFavorite={favorites.includes(file.id)}
                toggleFavorite={() => toggleFavorite(file.id)}
              />
            </motion.div>
          ))
        }
      </Masonry>

      {!loading && filtered.length === 0 && (
        <div className="text-center py-24">
          <p className="text-white/25 text-lg">No wallpapers found.</p>
          <p className="text-white/15 text-sm mt-2">Try a different search or category.</p>
        </div>
      )}

      {/* Infinite scroll spinner */}
      {!loading && filtered.length > 0 && (!showFavorites || visibleCount < filtered.length) && (
        <div className="flex flex-col items-center gap-2 mt-12 mb-8">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-white/20 text-xs">Scroll for more</p>
        </div>
      )}
    </>
  );
};

export default WallpaperGrid;
