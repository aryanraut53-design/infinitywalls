import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ExternalLink, Heart } from 'lucide-react';

const WallpaperModal = ({ file, isOpen, onClose, isFavorite, toggleFavorite }) => {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!file) return null;

  const isObject = typeof file === 'object' && file !== null;
  const isLive = isObject ? (file.type === 'live' || (!file.type && file.video_url)) : true;
  const videoUrl = isObject ? file.video_url : file;
  const imageUrl = isObject ? (file.image_url || file.thumbnail_url) : file;
  const title = isObject && file.title ? file.title : 'Wallpaper';
  const resolution = isObject && file.resolution ? file.resolution : '3840×2160';
  const downloadUrl = isLive ? videoUrl : imageUrl;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative w-full max-w-5xl max-h-[90vh] rounded-2xl overflow-hidden bg-[#0d0d1a] border border-white/10 shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-white truncate">{title}</h2>
                <p className="text-xs text-white/30 mt-0.5">{isLive ? '⚡ Live Wallpaper' : `📷 ${resolution}`}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <a
                  href={downloadUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-sm font-semibold px-4 py-2 rounded-full transition-all hover:shadow-[0_0_20px_rgba(108,99,255,0.4)] active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </a>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (toggleFavorite) toggleFavorite();
                  }}
                  className={`p-2 rounded-full transition-all ${
                    isFavorite
                      ? 'bg-primary/20 text-primary hover:bg-primary/30'
                      : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
                  }`}
                  title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Media */}
            <div className="flex-1 bg-black min-h-0 flex items-center justify-center">
              {isLive ? (
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  loop
                  className="w-full h-full max-h-[75vh] object-contain"
                />
              ) : (
                <img
                  src={imageUrl}
                  alt={title}
                  className="w-full h-full max-h-[75vh] object-contain"
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};

export default WallpaperModal;
