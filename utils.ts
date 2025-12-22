
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
  
  if (type === 'emergency') {
    audioFiles.push('/audio/emergency.mp3');
  } else if (type === 'transfer') {
    audioFiles.push('/audio/ring.mp3');
  } else {
    audioFiles.push('/audio/ding.mp3');
  }

  // Add patient number files
  // For simplicity in this demo, we assume files are 1.mp3, 2.mp3...
  audioFiles.push(`/audio/${patientNumber}.mp3`);
  
  // Add clinic file
  audioFiles.push(`/audio/clinic${clinicNumber}.mp3`);

  for (const src of audioFiles) {
    await new Promise((resolve) => {
      const audio = new Audio(src);
      audio.onended = resolve;
      audio.onerror = resolve; // Skip if file missing
      audio.play().catch(() => resolve(null));
    });
  }
};

export const playSimpleSound = (src: string) => {
  const audio = new Audio(src);
  audio.play().catch(e => console.error("Audio play failed", e));
};
