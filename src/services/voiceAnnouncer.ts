import { VoiceAnnouncement, Order } from '../types';

class VoiceAnnouncerService {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private hindiVoice: SpeechSynthesisVoice | null = null;
  private englishFallbackVoice: SpeechSynthesisVoice | null = null;
  private isEnabled: boolean = false;
  private isMuted: boolean = false;
  private volume: number = 1.0; // 0 to 1
  private rate: number = 0.95;
  private pitch: number = 1.0;
  private queue: VoiceAnnouncement[] = [];
  private isProcessingQueue: boolean = false;
  private announcedOrderIds: Set<string> = new Set();
  private history: VoiceAnnouncement[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => {
          this.loadVoices();
        };
      }
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    // Prioritize hi-IN voices
    this.hindiVoice =
      this.voices.find(
        (v) =>
          v.lang === 'hi-IN' ||
          v.lang.toLowerCase().startsWith('hi') ||
          v.name.toLowerCase().includes('hindi')
      ) || null;

    // English Indian fallback or generic English
    this.englishFallbackVoice =
      this.voices.find((v) => v.lang === 'en-IN') ||
      this.voices.find((v) => v.lang.startsWith('en')) ||
      (this.voices.length > 0 ? this.voices[0] : null);

    this.notifySubscribers();
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifySubscribers() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Subscriber notification error:', err);
      }
    });
  }

  public enableAudio(): boolean {
    if (!this.synth) return false;
    this.isEnabled = true;
    this.loadVoices();
    // Test empty synthesis to prime the browser audio context
    try {
      const dummyUtterance = new SpeechSynthesisUtterance(' ');
      dummyUtterance.volume = 0;
      this.synth.speak(dummyUtterance);
    } catch (e) {
      console.warn('Audio priming warning:', e);
    }
    this.notifySubscribers();
    return true;
  }

  public isAudioEnabled(): boolean {
    return this.isEnabled;
  }

  public hasHindiVoice(): boolean {
    return this.hindiVoice !== null;
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  public getSelectedVoiceName(): string {
    if (this.hindiVoice) return `${this.hindiVoice.name} (${this.hindiVoice.lang})`;
    if (this.englishFallbackVoice) return `${this.englishFallbackVoice.name} (English Fallback)`;
    return 'Default Browser Synthesizer';
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    this.notifySubscribers();
  }

  public getVolume(): number {
    return this.volume;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.synth) {
      this.synth.cancel();
      this.isProcessingQueue = false;
    }
    this.notifySubscribers();
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getHistory(): VoiceAnnouncement[] {
    return this.history;
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  // Generates Hindi announcements from Order object
  public announceOrder(order: Order, type: 'new' | 'ready' | 'urgent' = 'new') {
    if (this.announcedOrderIds.has(`${order.id}-${type}`)) {
      return; // Duplicate protection
    }
    this.announcedOrderIds.add(`${order.id}-${type}`);

    // Convert numbers to Hindi words/numbers
    const tableNumHindi = this.numberToHindi(order.tableNumber);
    const orderNumHindi = order.orderNumber.replace('#ORD-', '');

    const itemsSummaryHindi = order.items
      .slice(0, 3)
      .map((item) => `${this.numberToHindi(item.quantity)} ${this.translateDishToHindi(item.name)}`)
      .join(' और ');

    let textHindi = '';
    let textEnglish = '';

    if (type === 'new') {
      textHindi = `टेबल नंबर ${tableNumHindi} का नया ऑर्डर आया है। ऑर्डर नंबर ${orderNumHindi}। ${itemsSummaryHindi} तैयार करें।`;
      textEnglish = `New order arrived for Table number ${order.tableNumber}. Order ${order.orderNumber}. Prepare ${order.items.map((i) => `${i.quantity} ${i.name}`).join(', ')}.`;
      if (order.allergies) {
        textHindi += ` ध्यान दें: एलर्जी सूचना: ${order.allergies}।`;
        textEnglish += ` Note: Allergy alert: ${order.allergies}.`;
      }
    } else if (type === 'ready') {
      textHindi = `ऑर्डर नंबर ${orderNumHindi}, टेबल नंबर ${tableNumHindi} का खाना तैयार है।`;
      textEnglish = `Order ${order.orderNumber} for Table ${order.tableNumber} is ready to serve.`;
    } else {
      textHindi = `टेबल नंबर ${tableNumHindi} का ऑर्डर तुरंत तैयार करें!`;
      textEnglish = `Urgent: Table ${order.tableNumber} order requires immediate preparation!`;
    }

    const announcement: VoiceAnnouncement = {
      id: `ann-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      tableNumber: order.tableNumber,
      textHindi,
      textEnglish,
      status: 'queued',
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    this.queue.push(announcement);
    this.history.unshift(announcement);
    if (this.history.length > 50) this.history.pop();

    this.notifySubscribers();
    this.processQueue();
  }

  public testSpeaker(): Promise<boolean> {
    return new Promise((resolve) => {
      this.enableAudio();
      const testAnnouncement: VoiceAnnouncement = {
        id: `test-${Date.now()}`,
        orderId: 'test',
        orderNumber: '#TEST',
        tableNumber: 1,
        textHindi: 'डाइन-फ्लो किचन स्पीकर टेस्ट सफल रहा। सिस्टम तैयार है।',
        textEnglish: 'DineFlow Kitchen Speaker test successful. Audio system is active.',
        status: 'queued',
        timestamp: new Date().toLocaleTimeString('en-IN'),
      };
      this.queue.push(testAnnouncement);
      this.history.unshift(testAnnouncement);
      this.notifySubscribers();
      this.processQueue();
      resolve(true);
    });
  }

  public replayAnnouncement(id: string) {
    const item = this.history.find((h) => h.id === id);
    if (!item) return;
    const replayItem: VoiceAnnouncement = {
      ...item,
      id: `rep-${Date.now()}`,
      status: 'queued',
      timestamp: new Date().toLocaleTimeString('en-IN'),
    };
    this.queue.push(replayItem);
    this.history.unshift(replayItem);
    this.notifySubscribers();
    this.processQueue();
  }

  private processQueue() {
    if (this.isProcessingQueue || this.queue.length === 0 || !this.synth) {
      return;
    }

    if (!this.isEnabled) {
      console.warn('Voice Announcer: Audio is not enabled yet. Click "Enable Kitchen Voice" button.');
      return;
    }

    if (this.isMuted) {
      return;
    }

    this.isProcessingQueue = true;
    const currentItem = this.queue.shift();
    if (!currentItem) {
      this.isProcessingQueue = false;
      return;
    }

    currentItem.status = 'speaking';
    this.notifySubscribers();

    const shouldUseHindi = this.hindiVoice !== null;
    const textToSpeak = shouldUseHindi ? currentItem.textHindi : currentItem.textEnglish;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    if (shouldUseHindi && this.hindiVoice) {
      utterance.voice = this.hindiVoice;
      utterance.lang = 'hi-IN';
    } else if (this.englishFallbackVoice) {
      utterance.voice = this.englishFallbackVoice;
      utterance.lang = this.englishFallbackVoice.lang;
    }

    utterance.volume = this.volume;
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;

    utterance.onend = () => {
      currentItem.status = 'completed';
      this.isProcessingQueue = false;
      this.notifySubscribers();
      setTimeout(() => this.processQueue(), 300); // 300ms pause between announcements
    };

    utterance.onerror = (e: SpeechSynthesisErrorEvent) => {
      if (e.error === 'interrupted' || e.error === 'canceled' || e.error === 'audio-busy') {
        // Harmless audio cancellation or headless browser without sound hardware
        console.info('SpeechSynthesis notice:', e.error);
      } else {
        console.warn('SpeechSynthesis warning:', e.error);
      }
      currentItem.status = 'failed';
      this.isProcessingQueue = false;
      this.notifySubscribers();
      setTimeout(() => this.processQueue(), 300);
    };

    try {
      this.synth.speak(utterance);
    } catch (err) {
      console.error('Voice announce speak failed:', err);
      currentItem.status = 'failed';
      this.isProcessingQueue = false;
      this.notifySubscribers();
    }
  }

  private numberToHindi(num: number): string {
    const hindiNums: { [k: number]: string } = {
      1: 'एक',
      2: 'दो',
      3: 'तीन',
      4: 'चार',
      5: 'पाँच',
      6: 'छह',
      7: 'सात',
      8: 'आठ',
      9: 'नौ',
      10: 'दस',
      11: 'ग्यारह',
      12: 'बारह',
      13: 'तेरह',
      14: 'चौदह',
      15: 'पंद्रह',
      16: 'सोलह',
      17: 'सत्रह',
      18: 'अठारह',
      19: 'उन्नीस',
      20: 'बीस',
    };
    return hindiNums[num] || String(num);
  }

  private translateDishToHindi(name: string): string {
    const map: { [k: string]: string } = {
      'Paneer Butter Masala': 'पनीर बटर मसाला',
      'Garlic Butter Naan': 'बटर नान',
      'Old Delhi Butter Chicken': 'बटर चिकन',
      'DineFlow Signature Dal Makhani': 'दाल मखनी',
      'Tandoori Paneer Tikka': 'पनीर टिक्का',
      'Dum Awadhi Chicken Biryani': 'चिकन बिरयानी',
      'Wok Tossed Hakka Noodles': 'हक्का नूडल्स',
      'Classico Margherita Pizza (11")': 'मार्गरेट पिज़्ज़ा',
      'Crispy Paneer Maharaja Burger': 'पनीर बर्गर',
      'Classic Mint Virgin Mojito': 'मिंट मोहीतो',
      'Warm Gulab Jamun with Rabri': 'गुलाब जामुन',
      'Loaded Peri Peri Fries': 'पेरी पेरी फ्राइज़',
    };
    return map[name] || name;
  }
}

export const voiceAnnouncer = new VoiceAnnouncerService();
