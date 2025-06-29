import React, { useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useBackgroundMusic } from "../../hooks/useBackgroundMusic";

interface VolumeControlProps {
  className?: string;
}

export const VolumeControl: React.FC<VolumeControlProps> = ({
  className = "",
}) => {
  const { volume, setVolume, isPlaying, play } = useBackgroundMusic();

  // Tenta iniciar música se não estiver tocando
  useEffect(() => {
    if (!isPlaying && volume > 0) {
      console.log("🔊 VolumeControl: Tentando iniciar música...");
      play().catch((error) => {
        console.warn("❌ VolumeControl: Erro ao iniciar música:", error);
      });
    }
  }, [isPlaying, volume, play]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const toggleMute = () => {
    setVolume(volume > 0 ? 0 : 0.3);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={toggleMute}
        className="text-white/70 hover:text-white transition-colors p-1"
        title={volume > 0 ? "Silenciar" : "Ativar som"}
      >
        {volume > 0 ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </button>

      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={volume}
        onChange={handleVolumeChange}
        className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer volume-slider"
        title="Volume"
        style={{
          background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${volume * 100}%, rgba(255, 255, 255, 0.2) ${volume * 100}%, rgba(255, 255, 255, 0.2) 100%)`,
        }}
      />
    </div>
  );
};
