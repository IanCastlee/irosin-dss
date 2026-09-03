import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SoundService {
  private soundInstance: Audio.Sound | null = null;
  private isPlaying = false;
  private chatSoundInstance: Audio.Sound | null = null;
  private isChatPlaying = false;

  async playEmergencyAlertSound() {
    try {
      const soundVal = await AsyncStorage.getItem('@setting_notif_sound');
      const isSoundEnabled = soundVal !== null ? JSON.parse(soundVal) : true;
      if (!isSoundEnabled) return;

      this.isPlaying = true;
      // Safety auto-unlock after 4s in case of playback event failure
      setTimeout(() => { this.isPlaying = false; }, 4000);

      if (this.soundInstance) {
        try { await this.soundInstance.unloadAsync(); } catch {}
        this.soundInstance = null;
      }

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false
      }).catch(() => {});

      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/emergency_alarm.wav'),
        { shouldPlay: false, volume: 0.9 },
        undefined,
        false
      );
      this.soundInstance = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          this.isPlaying = false;
          sound.unloadAsync().catch(() => {});
          this.soundInstance = null;
        }
      });

      await sound.playAsync().catch(() => {
        this.isPlaying = false;
      });
    } catch (err: any) {
      this.isPlaying = false;
      console.warn('[SoundService] Audio playback warning:', err?.message);
    }
  }

  /** Plays a sound for incoming chat messages */
  async playChatMessageSound() {
    try {
      const chatSoundVal = await AsyncStorage.getItem('@setting_chat_sound');
      const isChatSoundEnabled = chatSoundVal !== null ? JSON.parse(chatSoundVal) : true;

      if (!isChatSoundEnabled) return;

      this.isChatPlaying = true;
      // Safety auto-unlock after 2.5s
      setTimeout(() => { this.isChatPlaying = false; }, 2500);

      if (this.chatSoundInstance) {
        try { await this.chatSoundInstance.unloadAsync(); } catch {}
        this.chatSoundInstance = null;
      }

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false
      }).catch(() => {});

      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/chat_chime.wav'),
        { shouldPlay: false, volume: 0.8 },
        undefined,
        false
      );
      this.chatSoundInstance = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          this.isChatPlaying = false;
          sound.unloadAsync().catch(() => {});
          this.chatSoundInstance = null;
        }
      });

      await sound.playAsync().catch(() => {
        this.isChatPlaying = false;
      });
    } catch (err: any) {
      this.isChatPlaying = false;
      console.warn('[SoundService] Chat audio warning:', err?.message);
    }
  }

  async stopAllSounds() {
    this.isPlaying = false;
    this.isChatPlaying = false;
    if (this.soundInstance) {
      try {
        await this.soundInstance.stopAsync();
        await this.soundInstance.unloadAsync();
      } catch {}
      this.soundInstance = null;
    }
    if (this.chatSoundInstance) {
      try {
        await this.chatSoundInstance.stopAsync();
        await this.chatSoundInstance.unloadAsync();
      } catch {}
      this.chatSoundInstance = null;
    }
  }
}

export const soundService = new SoundService();
