import { useEffect, useRef } from 'react';

// Create a simple notification sound using Web Audio API
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create oscillator for the notification tone
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Pleasant notification tone - two quick beeps
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
    oscillator.type = 'sine';
    
    // Volume envelope
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.15);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.2);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.35);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.4);
    
    // Clean up
    setTimeout(() => {
      audioContext.close();
    }, 500);
  } catch (error) {
    console.log('Could not play notification sound:', error);
  }
};

export const useNotificationSound = (
  notificationCount: number,
  enabled: boolean = true
) => {
  const previousCount = useRef(notificationCount);
  
  useEffect(() => {
    // Only play sound when count increases (new notification arrived)
    if (enabled && notificationCount > previousCount.current && previousCount.current >= 0) {
      playNotificationSound();
    }
    previousCount.current = notificationCount;
  }, [notificationCount, enabled]);
};

export { playNotificationSound };
