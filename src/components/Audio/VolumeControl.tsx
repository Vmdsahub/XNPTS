import React, { useEffect, useState } from "react";
import { Volume2, VolumeX, Play } from "lucide-react";
import { useBackgroundMusic } from "../../hooks/useBackgroundMusic";

interface VolumeControlProps {
  className?: string;
}

export const VolumeControl: React.FC<VolumeControlProps> = ({
  className = "",
}) => {
  const { volume, setVolume, isPlaying, play } = useBackgroundMusic();
  const [showPlayButton, setShowPlayButton] = useState(false);

  // Verifica se música não iniciou automaticamente
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isPlaying && volume > 0) {
        setShowPlayButton(true);
        console.log("🔊 Música não iniciou automaticamente, mostrando botão");
      }
    }, 2000);

    if (isPlaying) {
      setShowPlayButton(false);
    }

    return () => clearTimeout(timer);
  }, [isPlaying, volume]);

  const handlePlayClick = async () => {
    try {
      console.log("▶️ Iniciando música manualmente...");
      await play();
      setShowPlayButton(false);
    } catch (error) {
      console.warn("❌ Erro ao iniciar música manualmente:", error);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const toggleMute = async () => {
    const newVolume = volume > 0 ? 0 : 0.3;
    setVolume(newVolume);

    // Se estiver desmutando, tenta iniciar música
    if (newVolume > 0 && !isPlaying) {
      try {
        console.log("🔊 Iniciando música via toggle mute...");
        await play();
      } catch (error) {
        console.warn("❌ Erro ao iniciar música via mute:", error);
      }
    }
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
