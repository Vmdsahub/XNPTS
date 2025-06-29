/**
 * BackgroundMusicService - Gerenciador de música de fundo para navegação galáctica
 *
 * Este serviço gerencia uma playlist de músicas de fundo com fade in/out,
 * pausas e transições suaves para criar uma experiência imersiva na navegação galáctica.
 */

export interface MusicTrack {
  id: string;
  name: string;
  path: string;
  duration?: number;
}

class BackgroundMusicService {
  private tracks: MusicTrack[] = [
    {
      id: "galaxy-1",
      name: "Cosmic Voyage",
      path: "/sounds/galaxy-music-1.mp3",
    },
    {
      id: "galaxy-2",
      name: "Stellar Winds",
      path: "/sounds/galaxy-music-2.mp3",
    },
    {
      id: "galaxy-3",
      name: "Nebula Dreams",
      path: "/sounds/galaxy-music-3.mp3",
    },
    {
      id: "galaxy-4",
      name: "Deep Space",
      path: "/sounds/galaxy-music-4.mp3",
    },
    {
      id: "galaxy-5",
      name: "Galactic Horizon",
      path: "/sounds/galaxy-music-5.mp3",
    },
  ];

  private originalTracksCount: number;

  private currentTrack: HTMLAudioElement | null = null;
  private currentTrackIndex: number = 0;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private volume: number = 0.3;
  private fadeInterval: NodeJS.Timeout | null = null;
  private fadeSteps: number = 20;
  private fadeDuration: number = 2000; // 2 segundos
  private crossfadeNextTrack: HTMLAudioElement | null = null;
  private syntheticAudioContext: AudioContext | null = null;
  private currentOscillators: OscillatorNode[] = [];
  private isUsingSynthetic: boolean = false;

  constructor() {
    this.originalTracksCount = this.tracks.length;
    this.preloadTracks();
  }

  /**
   * Pré-carrega todas as faixas de música
   */
  private async preloadTracks(): Promise<void> {
    try {
      const loadPromises = this.tracks.map((track) =>
        this.preloadTrack(track.path),
      );
      await Promise.all(loadPromises);

      // Se nenhuma faixa foi carregada, usa música sintética
      if (this.tracks.length === 0) {
        console.log(
          "Nenhum arquivo de música encontrado, usando música sintética",
        );
        this.setupSyntheticMusic();
      } else {
        console.log(
          `${this.tracks.length} faixas de música galáctica carregadas`,
        );
      }
    } catch (error) {
      console.warn("Erro ao carregar faixas, usando música sintética:", error);
      this.setupSyntheticMusic();
    }
  }

  /**
   * Configura música sintética como fallback
   */
  private setupSyntheticMusic(): void {
    this.isUsingSynthetic = true;
    this.tracks = [
      { id: "synthetic-1", name: "Ambient Space", path: "synthetic" },
      { id: "synthetic-2", name: "Cosmic Winds", path: "synthetic" },
      { id: "synthetic-3", name: "Deep Void", path: "synthetic" },
    ];

    try {
      this.syntheticAudioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      console.log("✅ Sistema de música sintética ativado");
    } catch (error) {
      console.warn("❌ Web Audio API não suportada:", error);
      this.isUsingSynthetic = false;
    }
  }

  /**
   * Pré-carrega uma faixa específica
   */
  private preloadTrack(path: string): Promise<void> {
    return new Promise((resolve) => {
      const audio = new Audio(path);
      audio.preload = "auto";

      audio.addEventListener(
        "canplaythrough",
        () => {
          console.log(`✅ Faixa carregada: ${path}`);
          resolve();
        },
        { once: true },
      );

      audio.addEventListener(
        "error",
        (e) => {
          console.warn(
            `❌ Não foi possível carregar: ${path} - Arquivo inválido ou não encontrado`,
          );
          // Remove faixa inválida da lista
          this.tracks = this.tracks.filter((track) => track.path !== path);
          resolve(); // Resolve mesmo com erro para não bloquear outras faixas
        },
        { once: true },
      );

      // Timeout para evitar travamento
      setTimeout(() => {
        console.warn(`⏰ Timeout ao carregar: ${path}`);
        resolve();
      }, 5000);

      audio.load();
    });
  }

  /**
   * Inicia a reprodução da trilha sonora
   */
  async play(): Promise<void> {
    if (this.isPlaying && !this.isPaused) return;

    try {
      if (this.isPaused && this.currentTrack) {
        // Retoma da pausa
        this.isPaused = false;
        await this.currentTrack.play();
        this.fadeIn(this.currentTrack);
      } else {
        // Inicia nova faixa
        await this.playTrack(this.currentTrackIndex);
      }

      this.isPlaying = true;
    } catch (error) {
      console.error("Erro ao iniciar música de fundo:", error);
    }
  }

  /**
   * Pausa a reprodução com fade out
   */
  async pause(): Promise<void> {
    if (!this.isPlaying || this.isPaused) return;

    this.isPaused = true;

    if (this.isUsingSynthetic) {
      this.stopSyntheticTrack();
    } else if (this.currentTrack) {
      await this.fadeOut(this.currentTrack);
      this.currentTrack.pause();
    }
  }

  /**
   * Para completamente a reprodução
   */
  async stop(): Promise<void> {
    this.isPlaying = false;
    this.isPaused = false;

    if (this.isUsingSynthetic) {
      this.stopSyntheticTrack();
    } else {
      if (this.currentTrack) {
        await this.fadeOut(this.currentTrack);
        this.currentTrack.pause();
        this.currentTrack.currentTime = 0;
        this.currentTrack = null;
      }

      if (this.crossfadeNextTrack) {
        this.crossfadeNextTrack.pause();
        this.crossfadeNextTrack = null;
      }
    }

    this.clearFadeInterval();
  }

  /**
   * Reproduz uma faixa específica
   */
  private async playTrack(index: number): Promise<void> {
    if (index < 0 || index >= this.tracks.length) return;

    const track = this.tracks[index];

    if (this.isUsingSynthetic) {
      this.playSyntheticTrack(index);
      return;
    }

    const audio = new Audio(track.path);

    audio.volume = 0;
    audio.loop = false;

    // Configura evento para próxima faixa
    audio.addEventListener("ended", () => {
      this.nextTrack();
    });

    try {
      await audio.play();

      // Se há uma faixa atual, faz crossfade
      if (this.currentTrack && this.isPlaying) {
        await this.crossfade(this.currentTrack, audio);
      } else {
        this.fadeIn(audio);
      }

      this.currentTrack = audio;
      this.currentTrackIndex = index;

      console.log(`Reproduzindo: ${track.name}`);
    } catch (error) {
      console.error(`Erro ao reproduzir ${track.name}:`, error);
      // Tenta próxima faixa em caso de erro
      this.nextTrack();
    }
  }

  /**
   * Reproduz uma faixa sintética usando Web Audio API
   */
  private playSyntheticTrack(index: number): void {
    if (!this.syntheticAudioContext) return;

    // Para osciladores anteriores
    this.stopSyntheticTrack();

    const track = this.tracks[index];
    const ctx = this.syntheticAudioContext;

    // Configurações para cada faixa sintética
    const trackConfigs = [
      { freq: 55, type: "sine" as OscillatorType, harmonics: [1, 1.5, 2] },
      {
        freq: 82.4,
        type: "triangle" as OscillatorType,
        harmonics: [1, 1.2, 1.7],
      },
      { freq: 73.4, type: "sine" as OscillatorType, harmonics: [1, 2, 2.5] },
    ];

    const config = trackConfigs[index % trackConfigs.length];

    // Cria osciladores para harmônicos
    config.harmonics.forEach((harmonic, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = config.type;
      osc.frequency.setValueAtTime(config.freq * harmonic, ctx.currentTime);

      // Volume baseado no harmônico
      const volume = (this.volume * 0.1) / (harmonic * 2);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 2);

      // Adiciona modulação sutil
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.type = "sine";
      lfo.frequency.setValueAtTime(0.1 + i * 0.05, ctx.currentTime);
      lfoGain.gain.setValueAtTime(harmonic * 0.5, ctx.currentTime);

      osc.start();
      lfo.start();

      this.currentOscillators.push(osc, lfo);
    });

    this.currentTrackIndex = index;
    console.log(`🎵 Reproduzindo música sintética: ${track.name}`);

    // Auto próxima faixa após 30 segundos
    setTimeout(() => {
      if (this.isPlaying && this.isUsingSynthetic) {
        this.nextTrack();
      }
    }, 30000);
  }

  /**
   * Para faixas sintéticas
   */
  private stopSyntheticTrack(): void {
    this.currentOscillators.forEach((osc) => {
      try {
        osc.stop();
      } catch (e) {
        // Ignora erros se já parou
      }
    });
    this.currentOscillators = [];
  }

  /**
   * Próxima faixa da playlist
   */
  async nextTrack(): Promise<void> {
    if (!this.isPlaying) return;

    const nextIndex = (this.currentTrackIndex + 1) % this.tracks.length;
    await this.playTrack(nextIndex);
  }

  /**
   * Faixa anterior da playlist
   */
  async previousTrack(): Promise<void> {
    if (!this.isPlaying) return;

    const prevIndex =
      this.currentTrackIndex === 0
        ? this.tracks.length - 1
        : this.currentTrackIndex - 1;
    await this.playTrack(prevIndex);
  }

  /**
   * Fade in gradual
   */
  private fadeIn(audio: HTMLAudioElement): void {
    this.clearFadeInterval();

    let currentStep = 0;
    const stepVolume = this.volume / this.fadeSteps;
    const stepTime = this.fadeDuration / this.fadeSteps;

    audio.volume = 0;

    this.fadeInterval = setInterval(() => {
      currentStep++;
      audio.volume = Math.min(stepVolume * currentStep, this.volume);

      if (currentStep >= this.fadeSteps) {
        this.clearFadeInterval();
      }
    }, stepTime);
  }

  /**
   * Fade out gradual
   */
  private fadeOut(audio: HTMLAudioElement): Promise<void> {
    return new Promise((resolve) => {
      this.clearFadeInterval();

      let currentStep = this.fadeSteps;
      const stepVolume = audio.volume / this.fadeSteps;
      const stepTime = this.fadeDuration / this.fadeSteps;

      this.fadeInterval = setInterval(() => {
        currentStep--;
        audio.volume = Math.max(stepVolume * currentStep, 0);

        if (currentStep <= 0) {
          this.clearFadeInterval();
          resolve();
        }
      }, stepTime);
    });
  }

  /**
   * Crossfade entre duas faixas
   */
  private async crossfade(
    currentAudio: HTMLAudioElement,
    nextAudio: HTMLAudioElement,
  ): Promise<void> {
    this.clearFadeInterval();

    let currentStep = 0;
    const stepTime = this.fadeDuration / this.fadeSteps;
    const currentStartVolume = currentAudio.volume;
    const nextTargetVolume = this.volume;

    nextAudio.volume = 0;

    this.fadeInterval = setInterval(() => {
      currentStep++;
      const progress = currentStep / this.fadeSteps;

      // Fade out da faixa atual
      currentAudio.volume = currentStartVolume * (1 - progress);

      // Fade in da próxima faixa
      nextAudio.volume = nextTargetVolume * progress;

      if (currentStep >= this.fadeSteps) {
        currentAudio.pause();
        this.clearFadeInterval();
      }
    }, stepTime);
  }

  /**
   * Limpa intervalos de fade
   */
  private clearFadeInterval(): void {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
  }

  /**
   * Define o volume (0 a 1)
   */
  setVolume(newVolume: number): void {
    this.volume = Math.max(0, Math.min(1, newVolume));

    if (this.currentTrack) {
      this.currentTrack.volume = this.volume;
    }
  }

  /**
   * Obtém o volume atual
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Obtém informações da faixa atual
   */
  getCurrentTrack(): MusicTrack | null {
    return this.tracks[this.currentTrackIndex] || null;
  }

  /**
   * Obtém todas as faixas
   */
  getTracks(): MusicTrack[] {
    return [...this.tracks];
  }

  /**
   * Verifica se está reproduzindo
   */
  getIsPlaying(): boolean {
    return this.isPlaying && !this.isPaused;
  }

  /**
   * Verifica se está pausado
   */
  getIsPaused(): boolean {
    return this.isPaused;
  }
}

// Instância singleton
export const backgroundMusicService = new BackgroundMusicService();
