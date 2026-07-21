import React, { useState, useRef, useEffect } from 'react';
import { Download, Play, Image, Heart } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import WallpaperModal from './WallpaperModal';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Custom hook to detect mobile screens (sm breakpoint = 640px)
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

const WallpaperCard = ({ file, index, isFavorite, toggleFavorite }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [hasHovered, setHasHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const videoRef = useRef(null);

  const isMobile = useIsMobile();

  const isObject = typeof file === 'object' && file !== null;
  const isLive = isObject ? (file.type === 'live' || (!file.type && file.video_url)) : true;
  const isStatic = isObject && file.type === 'static';

  let videoUrl = isObject ? file.video_url : file;
  let imageUrl = isObject ? (file.image_url || file.thumbnail_url) : file;
  let thumbnailUrl = isObject ? file.thumbnail_url : file;

  // Swap to 9:16 resolution on mobile for 4kwallpapers statics
  if (isMobile && !isLive) {
    if (imageUrl && imageUrl.includes('4kwallpapers.com')) {
      imageUrl = imageUrl.replace(/-\d+x\d+-/, '-1080x1920-');
    }
    if (thumbnailUrl && thumbnailUrl.includes('4kwallpapers.com')) {
      thumbnailUrl = thumbnailUrl.replace(/-\d+x\d+-/, '-1080x1920-');
    }
  }

  const title = isObject && file.title ? file.title : (videoUrl || '').split('/').pop().replace('.mp4', '');
  const resolution = isMobile && !isLive ? '1080x1920' : (isObject && file.resolution ? file.resolution : '4K');

  const handleMouseEnter = () => {
    setHasHovered(true);
    setIsHovered(true);
    if (videoRef.current && isLive) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const downloadUrl = isLive ? videoUrl : imageUrl;

  return (
    <>
      <div
        className="group relative bg-white/5 rounded-2xl overflow-hidden shadow-lg transition-all duration-500 hover:shadow-[0_20px_40px_-15px_rgba(108,99,255,0.4)] hover:-translate-y-1 cursor-pointer ring-1 ring-white/10 hover:ring-primary/50"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => setIsModalOpen(true)}
      >
        <div className="aspect-[9/16] sm:aspect-video relative overflow-hidden bg-black/50">
          {/* Thumbnail / Static image */}
          <img
            src={thumbnailUrl || imageUrl}
            alt={file.title || 'Wallpaper'}
            className={cn("w-full h-full object-cover transition-transform duration-700 ease-out", isHovered ? "scale-110" : "scale-100")}
            loading="lazy"
          />

          {/* Video — only mounted on first hover */}
          {hasHovered && isLive && videoUrl && (
            <video
              ref={videoRef}
              src={videoUrl}
              className={cn(
                'absolute inset-0 w-full h-full object-cover transition-opacity duration-500',
                isHovered ? 'opacity-100' : 'opacity-0'
              )}
              muted loop playsInline preload="none"
            />
          )}

          {/* Favorite Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite();
            }}
            className={cn(
              "absolute top-3 right-3 p-2.5 rounded-xl backdrop-blur-md transition-all duration-300 z-20",
              isFavorite 
                ? "bg-primary/90 text-white shadow-[0_0_15px_rgba(108,99,255,0.5)] opacity-100" 
                : "bg-black/40 text-white/70 hover:bg-black/60 hover:text-white hover:scale-110 opacity-0 group-hover:opacity-100"
            )}
            title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
          >
            <Heart className={cn("w-4 h-4 transition-transform", isFavorite && "fill-current scale-110")} />
          </button>

          {/* Type badge */}
          <div className={cn(
            'absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border',
            isLive
              ? 'bg-red-500/20 border-red-500/30 text-red-400'
              : 'bg-blue-500/20 border-blue-500/30 text-blue-400'
          )}>
            {isLive ? <Play className="w-2.5 h-2.5 fill-current" /> : <Image className="w-2.5 h-2.5" />}
            {isLive ? 'Live' : resolution}
          </div>

          {/* Info overlay */}
          <div 
            className={cn(
              "absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-4 transition-all duration-500",
              isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <div className="flex justify-between items-end gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-sm line-clamp-1 leading-tight">{title}</h3>
                <p className="text-primary/80 text-xs mt-0.5 font-medium">Click to preview</p>
              </div>
              <a
                href={downloadUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 bg-white/10 hover:bg-primary/80 p-2 rounded-xl transition-colors border border-white/10"
                onClick={e => e.stopPropagation()}
                title="Download"
              >
                <Download className="w-4 h-4 text-white" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <WallpaperModal
        file={{
          ...file,
          image_url: imageUrl, 
          thumbnail_url: thumbnailUrl,
          resolution: resolution // Pass dynamically calculated resolution
        }}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isFavorite={isFavorite}
        toggleFavorite={toggleFavorite}
      />
    </>
  );
};

export default WallpaperCard;
