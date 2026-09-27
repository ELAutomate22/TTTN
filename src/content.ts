export const officialLinks = {
  instagram: "https://www.instagram.com/talktothenation/",
  youtube: "https://www.youtube.com/@talktothenation",
  tiktok: "https://www.tiktok.com/@talktothenation",
  snapchat: "https://www.snapchat.com/add/talktothenation",
  official: "https://talktothenation.com/",
  quincy: "https://talktothenation.com/portfolio/quincywashington/",
  email: "hello@talktothenation.com",
};

export type VideoCategory = "Quiz Time" | "Conversations" | "Ideas";
export type VideoItem = { id: string; eyebrow: string; title: string; category: VideoCategory; href: string; description: string; tone: "lime" | "blue" | "coral" | "cream" };
export const videos: VideoItem[] = [
  {
    id: "password", eyebrow: "01 / QUICK THINKING", title: "Find the secret word", category: "Quiz Time",
    href: "https://www.snapchat.com/%40talktothenation/spotlight/W7_EDlXWTBiXAEEniNoMPwAAYc3RrZGZzbHJyAZXr276KAZXr20-QAAAAAQ",
    description: "A street challenge with one question and a ticking clock.", tone: "lime",
  },
  {
    id: "synonyms", eyebrow: "02 / WORD PLAY", title: "One minute of synonyms", category: "Quiz Time",
    href: "https://www.snapchat.com/%40talktothenation/spotlight/W7_EDlXWTBiXAEEniNoMPwAAYbXlreWdpb21uAZzuLZALAZzuLQC-AAAAAQ",
    description: "How far can a single word take you?", tone: "blue",
  },
  {
    id: "words", eyebrow: "03 / STREET QUIZ", title: "Words within words", category: "Quiz Time",
    href: "https://www.snapchat.com/%40talktothenation/spotlight/W7_EDlXWTBiXAEEniNoMPwAAYeXJtemRtaXJ5AZE0B9sCAZE0B6ZXAAAAAQ",
    description: "Find as many words as you can before the minute ends.", tone: "coral",
  },
  {
    id: "pm", eyebrow: "04 / IN CONVERSATION", title: "A conversation with the Prime Minister", category: "Conversations",
    href: "https://www.snapchat.com/%40talktothenation/spotlight/W7_EDlXWTBiXAEEniNoMPwAAYanNvd2llc2VjAZzZagDBAZzZZP1yAAAAAQ",
    description: "Quincy Washington takes the conversation to Downing Street.", tone: "cream",
  },
  {
    id: "tech", eyebrow: "05 / PEOPLE & IDEAS", title: "Questions about the future of technology", category: "Ideas",
    href: "https://talktothenation.com/talk-to-the-nation-london-tech-week/",
    description: "A look at TTTN's conversations at London Tech Week.", tone: "blue",
  },
];

export const questions = [
  { question: "Which river runs through London?", answers: ["The Thames", "The Severn", "The Tyne", "The Clyde"], correct: 0, explanation: "The Thames flows through central London." },
  { question: "What is the capital of Wales?", answers: ["Swansea", "Cardiff", "Newport", "Bangor"], correct: 1, explanation: "Cardiff has been the capital of Wales since 1955." },
  { question: "Which ocean is the largest on Earth?", answers: ["Atlantic", "Indian", "Pacific", "Arctic"], correct: 2, explanation: "The Pacific Ocean covers more area than any other ocean." },
  { question: "How many minutes are in a quarter of an hour?", answers: ["10", "12", "15", "20"], correct: 2, explanation: "One quarter of 60 minutes is 15 minutes." },
  { question: "Which of these is a primary colour of light?", answers: ["Yellow", "Green", "Orange", "Purple"], correct: 1, explanation: "Red, green, and blue are the primary colours of light." },
];

export const places = [
  { city: "London", country: "England", index: "01", note: "The home base for most TTTN street conversations." },
  { city: "Cardiff", country: "Wales", index: "02", note: "A different city, a new set of perspectives." },
  { city: "Edinburgh", country: "Scotland", index: "03", note: "Questions travel further than one street." },
  { city: "Belfast", country: "Northern Ireland", index: "04", note: "New voices join the conversation." },
  { city: "Paris", country: "France", index: "05", note: "The conversation reaches beyond the UK." },
];
