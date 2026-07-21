import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Infinity, Search, Menu, X, Heart } from 'lucide-react';
import { cn } from '../utils';

const CATEGORIES = ['All', 'Anime', 'Games', 'Sci-Fi', 'Landscape', 'Vehicles'];

const Navbar = ({ searchQuery, setSearchQuery, activeCategory, setActiveCategory, showFavorites, setShowFavorites, favoritesCount }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          scrolled ? 'glass-dark border-b border-white/5 shadow-xl shadow-black/40' : 'bg-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <a href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
              <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <img src="/logo.png" alt="InfinityWalls Logo" className="w-full h-full object-cover" />
              </div>
              <span className="font-black text-lg tracking-tight">
                Infinity<span className="text-primary">Walls</span>
              </span>
            </a>

            {/* Categories — desktop */}
            <div className="hidden lg:flex items-center gap-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(cat);
                    setShowFavorites(false);
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 outline-none',
                    activeCategory === cat
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search + Favorites + Mobile trigger */}
            <div className="flex items-center gap-2">
              <div className="relative hidden sm:flex items-center">
                <Search className="w-3.5 h-3.5 text-white/30 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-white/5 border border-white/8 rounded-full py-1.5 pl-8 pr-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:bg-white/8 transition-all w-44 focus:w-56"
                />
              </div>

              {/* Favorites Toggle */}
              <button
                onClick={() => setShowFavorites(!showFavorites)}
                className={cn(
                  "p-2 rounded-lg transition-all duration-300 relative",
                  showFavorites
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/5"
                )}
                title="Favorites"
              >
                <Heart className={cn("w-5 h-5", showFavorites && "fill-primary")} />
                {favoritesCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-[10px] font-bold text-white px-1 py-0.5 rounded-full min-w-[16px] text-center">
                    {favoritesCount}
                  </span>
                )}
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileOpen(v => !v)}
                className="lg:hidden p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-16 left-0 right-0 z-40 glass-dark border-b border-white/5 px-4 py-4"
          >
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search wallpapers..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(cat);
                    setShowFavorites(false);
                    setMobileOpen(false);
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                    activeCategory === cat
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'text-white/50 border border-white/10 hover:text-white'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
