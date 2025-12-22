
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
  // تأكد من وجود ملفات بأسماء 1.mp3, 2.mp3 في المجلد
  audioFiles.push(`/audio/${patientNumber}.mp3`);
  
  // 3. رقم العيادة
  // تأكد من وجود ملفات بأسماء clinic1.mp3, clinic2.mp3 في المجلد
  audioFiles.push(`/audio/clinic${clinicNumber}.mp3`);

  // تشغيل الملفات بالتتابع
  for (const src of audioFiles) {
    try {
      await new Promise((resolve, reject) => {
        const audio = new Audio(src);
        audio.onended = resolve;
        audio.onerror = () => {
          console.warn(`Audio file not found or failed to load: ${src}`);
          resolve(null); // تجاوز الملف إذا فشل تحميله
        };
        audio.play().catch(e => {
          console.error("Autoplay prevented or playback error:", e);
          resolve(null);
        });
      });
    } catch (err) {
      console.error("Audio sequence error:", err);
    }
  }
};

export const playSimpleSound = (src: string) => {
  const audio = new Audio(src);
  audio.play().catch(e => console.error("Audio play failed (Autoplay policy?):", e));
};
