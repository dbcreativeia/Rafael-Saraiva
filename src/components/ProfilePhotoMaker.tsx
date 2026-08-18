import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, RefreshCw } from 'lucide-react';
import { trackEvent } from '../analytics';

interface ProfilePhotoMakerProps {
  molduraUrl?: string;
}

export const ProfilePhotoMaker = ({ molduraUrl = '/moldura-foto-perfil_rafael-saraiva_44077.png' }: ProfilePhotoMakerProps = {}) => {
  const [userImage, setUserImage] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Pinch to zoom state
  const [pinchStartDistance, setPinchStartDistance] = useState<number | null>(null);
  const [pinchStartScale, setPinchStartScale] = useState<number>(1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const molduraImgRef = useRef<HTMLImageElement | null>(null);
  const userImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      molduraImgRef.current = img;
      drawCanvas();
    };
    img.src = molduraUrl;
  }, [molduraUrl]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          userImgRef.current = img;
          setUserImage(src);
          setScale(1);
          setPosition({ x: 0, y: 0 });
          trackEvent('Upload_ProfilePhoto');
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    drawCanvas();
  }, [userImage, scale, position]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Define standard size for the output image
    const SIZE = 800;
    canvas.width = SIZE;
    canvas.height = SIZE;

    // Clear canvas
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Draw user image if exists
    if (userImage && userImgRef.current) {
      const img = userImgRef.current;
      const minScale = Math.max(SIZE / img.width, SIZE / img.height);
      const currentScale = minScale * scale;
      
      const w = img.width * currentScale;
      const h = img.height * currentScale;
      
      // Calculate center position + drag offset
      const x = (SIZE - w) / 2 + position.x;
      const y = (SIZE - h) / 2 + position.y;

      ctx.drawImage(img, x, y, w, h);
    }

    if (molduraImgRef.current) {
      ctx.drawImage(molduraImgRef.current, 0, 0, SIZE, SIZE);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!userImage) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !userImage) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getPinchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!userImage) return;
    
    if (e.touches.length === 2) {
      setPinchStartDistance(getPinchDistance(e.touches));
      setPinchStartScale(scale);
      setIsDragging(false); // Stop dragging when pinching
    } else if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!userImage) return;
    // prevent scrolling while interacting with the canvas
    if (e.cancelable) {
      e.preventDefault();
    }

    if (e.touches.length === 2 && pinchStartDistance !== null) {
      const currentDistance = getPinchDistance(e.touches);
      const scaleFactor = currentDistance / pinchStartDistance;
      let newScale = pinchStartScale * scaleFactor;
      // restrict scale limits (same as slider)
      newScale = Math.max(0.5, Math.min(newScale, 3));
      setScale(newScale);
    } else if (e.touches.length === 1 && isDragging) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      setPinchStartDistance(null);
    }
    if (e.touches.length === 0) {
      setIsDragging(false);
    }
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'minha-foto-rafael-saraiva.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    trackEvent('Download_ProfilePhoto');
  };

  return (
    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm mt-8" id="profile-photo-maker">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-black text-gray-800 uppercase mb-2">Crie sua Foto de Perfil</h3>
        <p className="text-gray-500 font-medium">Faça o upload da sua foto, ajuste na moldura e baixe para usar nas suas redes sociais!</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Canvas Area */}
        <div className="w-full md:w-1/2 flex flex-col items-center">
          <div 
            className="relative w-full max-w-[400px] aspect-square rounded-full overflow-hidden shadow-inner bg-gray-100 cursor-move border-4 border-gray-200 touch-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <canvas 
              ref={canvasRef} 
              className="w-full h-full object-cover pointer-events-none"
            />
            {!userImage && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 pointer-events-none">
                <Upload className="w-12 h-12 mb-2 opacity-50" />
                <span className="text-sm font-bold">Sua foto aparecerá aqui</span>
              </div>
            )}
          </div>
        </div>

        {/* Controls Area */}
        <div className="w-full md:w-1/2 flex flex-col gap-6">
          {!userImage ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-orange-300 bg-orange-50 hover:bg-orange-100 transition-colors rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer text-center"
            >
              <Upload className="w-10 h-10 text-orange-500 mb-3" />
              <span className="font-bold text-orange-700">Clique para enviar sua foto</span>
              <span className="text-sm text-orange-600/80 mt-1">PNG ou JPG</span>
            </div>
          ) : (
            <>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                <label className="block text-sm font-bold text-gray-700 mb-4 uppercase">
                  Tamanho da Foto
                </label>
                <input 
                  type="range" 
                  min="0.5" 
                  max="3" 
                  step="0.01" 
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <p className="text-xs text-gray-500 mt-3 font-medium text-center">
                  Arraste a foto no quadro ao lado para reposicionar
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50 font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Trocar Foto
                </button>
                <button 
                  onClick={downloadImage}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-black uppercase py-4 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Baixar Foto
                </button>
              </div>
            </>
          )}
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};
