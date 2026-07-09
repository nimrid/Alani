export type VolumeLevel = 'off' | 'low' | 'medium' | 'high';
export type PossessionType = 'SafePossession' | 'AttackPossession' | 'DangerPossession' | 'HighDangerPossession';

export class CrowdAudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  
  private buffers: Record<string, AudioBuffer> = {};
  
  private currentLoopNode: AudioBufferSourceNode | null = null;
  private currentLoopGain: GainNode | null = null;
  private currentLoopName: string | null = null;

  private isMutedByVisibility: boolean = false;
  private currentVolumeLevel: VolumeLevel = 'low';

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.setVolume(this.currentVolumeLevel);

        this.loadAudioFiles();
        
        document.addEventListener('visibilitychange', () => {
          this.isMutedByVisibility = document.hidden;
          this.updateMasterGain();
          
          if (!document.hidden && this.ctx?.state === 'suspended') {
            this.ctx.resume();
          }
        });
      } catch (e) {
        console.error('Web Audio API not supported', e);
      }
    }
  }

  private async loadAudioFiles() {
    const files = [
      'crowd-idle', 'crowd-building', 'crowd-danger', 
      'crowd-goal', 'crowd-card', 'crowd-whistle'
    ];
    
    for (const file of files) {
      try {
        const response = await fetch(`/sounds/${file}.mp3`);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          if (this.ctx) {
            const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
            this.buffers[file] = audioBuffer;
          }
        }
      } catch (e) {
        console.warn(`Failed to load ${file}.mp3`, e);
      }
    }
  }

  public setVolume(level: VolumeLevel) {
    this.currentVolumeLevel = level;
    this.updateMasterGain();
  }

  public getVolume(): VolumeLevel {
    return this.currentVolumeLevel;
  }

  private updateMasterGain() {
    if (!this.masterGain || !this.ctx) return;
    
    if (this.currentVolumeLevel !== 'off' && !this.isMutedByVisibility && this.ctx.state === 'suspended') {
      // AudioContext needs user gesture to resume in most browsers
      // we try anyway, if it fails, it will resume on next user gesture.
      this.ctx.resume().catch(() => {});
    }
    
    const targetGain = this.isMutedByVisibility ? 0 : this.getGainForLevel(this.currentVolumeLevel);
    this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
  }

  private getGainForLevel(level: VolumeLevel): number {
    switch(level) {
      case 'off': return 0;
      case 'low': return 0.15;
      case 'medium': return 0.35;
      case 'high': return 0.6;
      default: return 0.15;
    }
  }

  public setPossessionType(type: string) {
    if (!this.ctx || !this.masterGain) return;
    
    let targetLoop = 'crowd-idle';
    if (type === 'AttackPossession') targetLoop = 'crowd-building';
    else if (type === 'DangerPossession' || type === 'HighDangerPossession') targetLoop = 'crowd-danger';

    if (this.currentLoopName === targetLoop) {
      if (type === 'HighDangerPossession' && this.currentLoopGain) {
         this.currentLoopGain.gain.setTargetAtTime(1.2, this.ctx.currentTime, 0.5);
      } else if (type === 'DangerPossession' && this.currentLoopGain) {
         this.currentLoopGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.5);
      }
      return;
    }

    const buffer = this.buffers[targetLoop];
    if (!buffer) return;

    const newGain = this.ctx.createGain();
    newGain.gain.value = 0;
    newGain.connect(this.masterGain);

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(newGain);
    source.start();

    const fadeDuration = 1.5;
    const now = this.ctx.currentTime;

    newGain.gain.setTargetAtTime(type === 'HighDangerPossession' ? 1.2 : 1.0, now, fadeDuration / 3);

    if (this.currentLoopGain && this.currentLoopNode) {
      const oldGain = this.currentLoopGain;
      const oldSource = this.currentLoopNode;
      oldGain.gain.setTargetAtTime(0, now, fadeDuration / 3);
      setTimeout(() => {
        try {
          oldSource.stop();
          oldSource.disconnect();
          oldGain.disconnect();
        } catch(e) {}
      }, fadeDuration * 2000);
    }

    this.currentLoopNode = source;
    this.currentLoopGain = newGain;
    this.currentLoopName = targetLoop;
  }

  public playEvent(eventType: string) {
    if (!this.ctx || !this.masterGain) return;
    
    let fileToPlay = null;
    if (eventType === 'GOAL' || eventType === 'OWN_GOAL') fileToPlay = 'crowd-goal';
    else if (eventType === 'RED_CARD') fileToPlay = 'crowd-card';
    else if (eventType === 'FULLTIME' || eventType === 'HALFTIME') fileToPlay = 'crowd-whistle';

    if (!fileToPlay) return;
    const buffer = this.buffers[fileToPlay];
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    
    const eventGain = this.ctx.createGain();
    eventGain.gain.value = eventType === 'RED_CARD' ? 0.8 : 1.2;
    
    source.connect(eventGain);
    eventGain.connect(this.masterGain);
    source.start();

    if (eventType === 'FULLTIME') {
      if (this.currentLoopGain) {
        this.currentLoopGain.gain.setTargetAtTime(0, this.ctx.currentTime, 2.0);
      }
    }
  }
  
  // Public method to start AudioContext explicitly on user gesture
  public resumeContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }
}

// Export singleton instance
let instance: CrowdAudioManager | null = null;
export const getCrowdAudio = () => {
  if (!instance) {
    instance = new CrowdAudioManager();
  }
  return instance;
};
