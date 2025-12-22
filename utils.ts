
/**
 * Converts Western Arabic numerals (0-9) to Eastern Arabic-Indic numerals (٠-٩)
 */
export const toHindiDigits = (num: number | string): string => {
  return String(num).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);
};

/**
 * Sequential Audio Player
 */
export const playCallSequence = async (patientNumber: number, clinicNumber: number, type: 'normal' | 'emergency' | 'transfer' = 'normal') => {
  const audioFiles = [];
  
  // 1. التنبيه الأول
  if (type === 'emergency') {
    audioFiles.push('/audio/emergency.mp3');
  } else if (type === 'transfer') {
    audioFiles.push('/audio/ring.mp3');
  } else {
    audioFiles.push('/audio/ding.mp3');
  }

  // 2. رقم المريض
  audioFiles.push(`/audio/${patientNumber}.mp3`);
  
  // 3. رقم العيادة
  audioFiles.push(`/audio/clinic${clinicNumber}.mp3`);

  console.log("Starting sequence:", audioFiles);

  // تشغيل الملفات بالتتابع
  for (const src of audioFiles) {
    try {
      await new Promise((resolve) => {
        const audio = new Audio(src);
        audio.onended = resolve;
        audio.onerror = (e) => {
          console.warn(`File not found: ${src}`, e);
          resolve(null); 
        };
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error("Playback failed. User interaction might be needed.", error);
            resolve(null);
          });
        }
      });
    } catch (err) {
      console.error("Audio step error:", err);
    }
  }
};

export const playSimpleSound = (src: string) => {
  const audio = new Audio(src);
  audio.play().catch(e => {
    console.warn("Simple sound play failed. Check file at:", src, e);
  });
};
