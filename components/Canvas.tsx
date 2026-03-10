
import React, { useRef, useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface CanvasProps {
  isDrawingEnabled: boolean;
  initialData?: string;
  onSave?: (dataUrl: string | null) => void;
}

const Canvas: React.FC<CanvasProps> = ({ isDrawingEnabled, initialData, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

  // Inicializa o contexto e carrega dados salvos
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    if (!container) return;

    // Ajusta o tamanho do canvas para o container
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    const context = canvas.getContext('2d');
    if (context) {
      context.lineJoin = 'round';
      context.lineCap = 'round';
      context.lineWidth = 3;
      context.strokeStyle = '#3b82f6';
      setCtx(context);

      // Se houver imagem salva, carrega no canvas
      if (initialData) {
        const img = new Image();
        img.onload = () => {
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(img, 0, 0);
        };
        img.src = initialData;
      } else {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [initialData]); // Recarrega quando a página (e seu initialData) muda

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingEnabled || !ctx) return;
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing && ctx && canvasRef.current && onSave) {
      ctx.closePath();
      // Notifica o pai sobre a mudança no desenho
      onSave(canvasRef.current.toDataURL());
    }
    setIsDrawing(false);
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const clearCanvas = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    if (onSave) onSave(null);
  };

  return (
    <div className="w-full h-full relative group">
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className={`w-full h-full ${isDrawingEnabled ? 'cursor-crosshair' : 'pointer-events-none'}`}
      />
      
      {isDrawingEnabled && (
        <div className="absolute top-4 right-4 flex space-x-2 z-20">
          <button 
            onClick={clearCanvas}
            className="p-2 bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white rounded-lg transition-all shadow-lg active:scale-95"
            title="Limpar Desenho"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Canvas;
