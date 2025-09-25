/**
 * Standalone Video Overlay for Tagging Solution
 * Complete solution that can be injected directly via tagging solution
 * Replace PRODUCT_ID_PLACEHOLDER with your tagging solution's product ID syntax
 */

(function() {
  'use strict';

  console.log('🎬 [VideoOverlay] Tag loaded successfully');

  // Configuration
  const API_ENDPOINT = 'https://your-api-endpoint.example.com';
  
  // Product ID from tagging solution - REPLACE THIS LINE
  const PRODUCT_ID = '% product.id %'; // Replace with your tagging solution syntax
  
  console.log('🎬 [VideoOverlay] Product ID:', PRODUCT_ID);
  console.log('🎬 [VideoOverlay] API Endpoint:', API_ENDPOINT);

  // Video Overlay Class
  class VideoOverlay {
    constructor(config = {}) {
      this.apiEndpoint = config.apiEndpoint || API_ENDPOINT;
      this.productId = config.productId || null;
      this.overlay = null;
      this.isVisible = false;
      
      this.init();
    }

    init() {
      console.log('🎬 [VideoOverlay] Initializing overlay');
      console.log('🎬 [VideoOverlay] Current URL:', window.location.href);
      
      const urlParams = new URLSearchParams(window.location.search);
      const showOverlay = urlParams.get('show-overlay-video');
      
      console.log('🎬 [VideoOverlay] URL parameter show-overlay-video:', showOverlay);
      
      if (showOverlay === 'true') {
        console.log('🎬 [VideoOverlay] ✅ Parameter detected - loading overlay');
        this.loadVideoOverlay();
      } else {
        console.log('🎬 [VideoOverlay] ❌ Parameter not found or not "true" - overlay not loaded');
      }
    }

    async loadVideoOverlay() {
      console.log('🎬 [VideoOverlay] Loading video overlay for product:', this.productId);
      
      if (!this.productId || this.productId.includes('%')) {
        console.warn('🎬 [VideoOverlay] ❌ Product ID not available or not replaced by tagging solution');
        console.warn('🎬 [VideoOverlay] Expected: actual SKU (e.g., "EXAMPLE_SKU")');
        console.warn('🎬 [VideoOverlay] Got:', this.productId);
        return;
      }

      try {
        const apiUrl = \`\${this.apiEndpoint}/videos/\${this.productId}\`;
        console.log('🎬 [VideoOverlay] 📡 API Request URL:', apiUrl);
        
        const response = await fetch(apiUrl);
        console.log('🎬 [VideoOverlay] 📡 API Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(\`API request failed with status \${response.status}\`);
        }
        
        const data = await response.json();
        console.log('🎬 [VideoOverlay] 📡 API Response data:', data);

        if (data.videos && data.videos.length > 0) {
          console.log(\`🎬 [VideoOverlay] ✅ Found \${data.videos.length} video(s) for product \${this.productId}\`);
          console.log('🎬 [VideoOverlay] Video details:', data.videos[0]);
          this.showOverlay(data.videos[0]);
        } else {
          console.log(\`🎬 [VideoOverlay] ℹ️ No videos available for product: \${this.productId}\`);
          console.log('🎬 [VideoOverlay] This is normal - not all products have videos');
        }
      } catch (error) {
        console.error('🎬 [VideoOverlay] ❌ Error fetching video:', error);
        console.error('🎬 [VideoOverlay] Check network tab for detailed error info');
      }
    }

    showOverlay(video) {
      console.log('🎬 [VideoOverlay] Showing video overlay');
      console.log('🎬 [VideoOverlay] Video stream URL:', video.streamUrl);
      
      if (this.isVisible) {
        console.log('🎬 [VideoOverlay] Overlay already visible - skipping');
        return;
      }

      this.createOverlay(video);
      document.body.appendChild(this.overlay);
      
      requestAnimationFrame(() => {
        this.overlay.classList.add('visible');
        this.isVisible = true;
        console.log('🎬 [VideoOverlay] ✅ Overlay displayed successfully');
      });

      document.body.style.overflow = 'hidden';
    }

    createOverlay(video) {
      this.overlay = document.createElement('div');
      this.overlay.className = 'video-overlay';
      
      this.overlay.innerHTML = \`
        <div class="video-overlay-backdrop"></div>
        <div class="video-overlay-content">
          <div class="video-overlay-header">
            <button class="video-overlay-close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="video-overlay-player">
            <video 
              controls
              autoplay
              muted
              playsinline
              poster="\${video.thumbnails?.webimage || ''}"
            >
              <source src="\${video.streamUrl}" type="application/x-mpegURL">
              Your browser does not support the video tag.
            </video>
          </div>
          <div class="video-overlay-info">
            <h3>\${video.name || 'Product Video'}</h3>
          </div>
        </div>
      \`;

      // Add event listeners
      this.overlay.querySelector('.video-overlay-backdrop').addEventListener('click', () => this.hideOverlay());
      this.overlay.querySelector('.video-overlay-close').addEventListener('click', () => this.hideOverlay());

      this.addStyles();
    }

    hideOverlay() {
      console.log('🎬 [VideoOverlay] Hiding overlay');
      
      if (!this.isVisible || !this.overlay) {
        console.log('🎬 [VideoOverlay] Overlay not visible or not found - skipping');
        return;
      }

      const video = this.overlay.querySelector('video');
      if (video) {
        video.pause();
        console.log('🎬 [VideoOverlay] Video paused');
      }

      this.overlay.classList.remove('visible');
      document.body.style.overflow = '';
      
      setTimeout(() => {
        if (this.overlay && this.overlay.parentNode) {
          this.overlay.parentNode.removeChild(this.overlay);
        }
        this.overlay = null;
        this.isVisible = false;
        console.log('🎬 [VideoOverlay] ✅ Overlay hidden and cleaned up');
      }, 300);
    }

    addStyles() {
      if (document.getElementById('video-overlay-styles')) return;

      const styles = document.createElement('style');
      styles.id = 'video-overlay-styles';
      styles.textContent = \`
        .video-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 9999;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s ease, visibility 0.3s ease;
        }

        .video-overlay.visible {
          opacity: 1;
          visibility: visible;
        }

        .video-overlay-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          cursor: pointer;
        }

        .video-overlay-content {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 20px;
          box-sizing: border-box;
        }

        .video-overlay-header {
          position: absolute;
          top: 20px;
          right: 20px;
          z-index: 10;
        }

        .video-overlay-close {
          background: rgba(255, 255, 255, 0.9);
          border: none;
          border-radius: 50%;
          width: 44px;
          height: 44px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #333;
          transition: background 0.2s ease;
        }

        .video-overlay-close:hover {
          background: rgba(255, 255, 255, 1);
        }

        .video-overlay-player {
          width: 100%;
          max-width: 400px;
          max-height: 70vh;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .video-overlay-player video {
          width: 100%;
          height: 100%;
          display: block;
          background: #000;
        }

        .video-overlay-info {
          margin-top: 20px;
          text-align: center;
          color: white;
          max-width: 400px;
        }

        .video-overlay-info h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }

        @media (max-width: 768px) {
          .video-overlay-content {
            padding: 10px;
          }
          
          .video-overlay-player {
            max-width: 95vw;
            max-height: 80vh;
          }
          
          .video-overlay-header {
            top: 10px;
            right: 10px;
          }
          
          .video-overlay-close {
            width: 40px;
            height: 40px;
          }
          
          .video-overlay-info h3 {
            font-size: 16px;
          }
        }

        @media (max-width: 480px) {
          .video-overlay-player {
            max-width: 90vw;
            max-height: 75vh;
          }
        }
      \`;

      document.head.appendChild(styles);
    }
  }

  // Initialize when DOM is ready
  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }

  ready(function() {
    console.log('🎬 [VideoOverlay] DOM ready, checking product ID...');
    
    if (PRODUCT_ID && !PRODUCT_ID.includes('%')) {
      console.log('🎬 [VideoOverlay] ✅ Valid product ID found, initializing overlay');
      new VideoOverlay({ productId: PRODUCT_ID });
    } else {
      console.warn('🎬 [VideoOverlay] ❌ Product ID not set or contains placeholder');
      console.warn('🎬 [VideoOverlay] Make sure to replace "% product.id %" with your tagging solution syntax');
      console.warn('🎬 [VideoOverlay] Current value:', PRODUCT_ID);
    }
  });

})();