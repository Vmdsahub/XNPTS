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
    console.log("🎵 Inicializando BackgroundMusicService...");
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
      { id: "synthetic-1", name: "Nebula Drift", path: "synthetic" },
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
    console.log("🎵 Play chamado. Estado:", {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      isUsingSynthetic: this.isUsingSynthetic,
    });

    if (this.isPlaying && !this.isPaused) {
      console.log("⏸️ Já está tocando, ignorando");
      return;
    }

    try {
      if (this.isPaused && this.currentTrack && !this.isUsingSynthetic) {
        // Retoma da pausa
        console.log("▶️ Retomando da pausa...");
        this.isPaused = false;
        await this.currentTrack.play();
        this.fadeIn(this.currentTrack);
      } else {
        // Inicia nova faixa
        console.log("🎼 Iniciando nova faixa...");
        await this.playTrack(this.currentTrackIndex);
      }

      this.isPlaying = true;
      console.log("✅ Música iniciada com sucesso");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes("user didn't interact")) {
        console.warn(
          "⚠️ Música bloqueada: precisa de interação do usuário primeiro",
        );
        // Não marca como erro - é comportamento normal do navegador
        return;
      }

      console.error("❌ Erro ao iniciar música de fundo:", error);
      throw error;
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

    // Configurações musicais espaciais mais complexas
    const spaceConfigs = [
      {
        name: "Nebula Drift",
        baseFreq: 220, // A3
        melody: [220, 246.94, 261.63, 293.66, 329.63], // A3, B3, C4, D4, E4
        chords: [
          [220, 261.63, 329.63],
          [246.94, 293.66, 369.99],
        ], // Am, Bdim
        rhythm: [2, 1, 2, 1, 4],
        filterFreq: 1000,
      },
      {
        name: "Cosmic Winds",
        baseFreq: 174.61, // F3
        melody: [174.61, 196, 220, 246.94, 261.63], // F3, G3, A3, B3, C4
        chords: [
          [174.61, 220, 261.63],
          [196, 246.94, 293.66],
        ], // Fm, Gm
        rhythm: [3, 1, 2, 2, 2],
        filterFreq: 800,
      },
      {
        name: "Deep Void",
        baseFreq: 146.83, // D3
        melody: [146.83, 164.81, 185, 207.65, 233.08], // D3, E3, F#3, G#3, A#3
        chords: [
          [146.83, 185, 233.08],
          [164.81, 207.65, 246.94],
        ], // Dm, Em
        rhythm: [4, 2, 1, 3, 2],
        filterFreq: 600,
      },
    ];

    const config = spaceConfigs[index % spaceConfigs.length];

    this.createSpaceAmbient(ctx, config);
    this.createMelodyLine(ctx, config);
    this.createChordPad(ctx, config);

    this.currentTrackIndex = index;
    console.log(`🎵 Reproduzindo: ${config.name}`);

    // Auto próxima faixa após 180 segundos (3 minutos)
    setTimeout(() => {
      if (this.isPlaying && this.isUsingSynthetic) {
        this.nextTrack();
      }
    }, 180000);
  }

  private createSpaceAmbient(ctx: AudioContext, config: any): void {
    // Cria ambiente espacial com ruído filtrado
    const bufferSize = ctx.sampleRate * 180; // 180 segundos (3 minutos)
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Gera ruído rosa filtrado
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() - 0.5) * 0.1;
    }

    const noise = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    noise.buffer = buffer;
    noise.loop = true;

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(config.filterFreq, ctx.currentTime);
    filter.Q.setValueAtTime(0.5, ctx.currentTime);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(this.volume * 0.15, ctx.currentTime + 3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
    this.currentOscillators.push(noise as any);
  }

  private createMelodyLine(ctx: AudioContext, config: any): void {
    // Toca melodia repetidas vezes durante a faixa
    for (let cycle = 0; cycle < 8; cycle++) {
      let time = ctx.currentTime + 2 + cycle * 20; // Novo ciclo a cada 20 segundos

      config.melody.forEach((freq: number, i: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, time);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(freq * 4, time);
        filter.Q.setValueAtTime(1, time);

        const noteLength = config.rhythm[i % config.rhythm.length];
        const volume = this.volume * 0.08;

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(volume, time + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, time + noteLength);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + noteLength);

        time += noteLength + 0.5; // Pausa entre notas
      });
    }
  }

  private createChordPad(ctx: AudioContext, config: any): void {
    config.chords.forEach((chord: number[], chordIndex: number) => {
      const startTime = ctx.currentTime + 4 + chordIndex * 8;

      chord.forEach((freq: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq * 0.5, startTime); // Oitava abaixo

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(freq * 2, startTime);
        filter.Q.setValueAtTime(0.3, startTime);

        const volume = this.volume * 0.04;

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume, startTime + 2);
        gain.gain.setValueAtTime(volume, startTime + 6);
        gain.gain.linearRampToValueAtTime(0, startTime + 8);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 8);

        this.currentOscillators.push(osc);
      });
    });
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
