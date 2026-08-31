import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SoundService {
  private soundInstance: Audio.Sound | null = null;
  private isPlaying = false;
  private chatSoundInstance: Audio.Sound | null = null;
  private isChatPlaying = false;

  async playEmergencyAlertSound() {
    if (this.isPlaying) return;
    try {
      const soundVal = await AsyncStorage.getItem('@setting_notif_sound');
      const isSoundEnabled = soundVal !== null ? JSON.parse(soundVal) : true;
      if (!isSoundEnabled) return;

      this.isPlaying = true;

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

  /** Plays a softer sound for incoming chat messages if enabled */
  async playChatMessageSound() {
    if (this.isChatPlaying) return;
    try {
      const [chatSoundVal, chatPushVal, notifSoundVal] = await Promise.all([
        AsyncStorage.getItem('@setting_chat_sound'),
        AsyncStorage.getItem('@setting_chat_push_notif'),
        AsyncStorage.getItem('@setting_notif_sound'),
      ]);

      const isChatSoundEnabled = chatSoundVal !== null ? JSON.parse(chatSoundVal) : true;
      const isChatPushEnabled = chatPushVal !== null ? JSON.parse(chatPushVal) : true;
      const isNotifSoundEnabled = notifSoundVal !== null ? JSON.parse(notifSoundVal) : true;

      // Strictly respect all sound mute toggles
      if (!isChatSoundEnabled || !isChatPushEnabled || !isNotifSoundEnabled) {
        return;
      }

      this.isChatPlaying = true;

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
        require('../../assets/emergency_alarm.wav'),
        { shouldPlay: false, volume: 0.25 }, // gentle volume for chat notification
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
