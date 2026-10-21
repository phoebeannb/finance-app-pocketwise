export const MOODS = [
  { key: "stressed", emoji: "😫", label: "Stressed" },
  { key: "celebrating", emoji: "🎉", label: "Celebrating" },
  { key: "bored", emoji: "🥱", label: "Bored" },
  { key: "happy", emoji: "😊", label: "Happy" },
  { key: "sad", emoji: "😢", label: "Sad" },
  { key: "angry", emoji: "😠", label: "Angry" },
];

export const moodOf = (key) => MOODS.find((m) => m.key === key);