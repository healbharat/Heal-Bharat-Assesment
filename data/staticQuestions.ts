
import { McqQuestion } from '../types';

export const APTITUDE_QUESTIONS: McqQuestion[] = [
  // --- Grammar (6 Qs) ---
  {
    id: 'g1',
    text: "Select the correct sentence structure:",
    options: [
      "She don't like coffee.",
      "She doesn't likes coffee.",
      "She doesn't like coffee.",
      "She do not like coffee."
    ],
    correctAnswer: "She doesn't like coffee."
  },
  {
    id: 'g2',
    text: "Identify the synonym of 'Ephemeral':",
    options: ["Permanent", "Short-lived", "Heavy", "Joyful"],
    correctAnswer: "Short-lived"
  },
  {
    id: 'g3',
    text: "Choose the correct preposition: He is afraid ___ spiders.",
    options: ["with", "from", "of", "in"],
    correctAnswer: "of"
  },
  {
    id: 'g4',
    text: "Which word is spelled correctly?",
    options: ["Accomodate", "Accommodate", "Acomodate", "Acommodate"],
    correctAnswer: "Accommodate"
  },
  {
    id: 'g5',
    text: "Complete the idiom: 'Break the ___'",
    options: ["Ice", "Glass", "Wall", "Road"],
    correctAnswer: "Ice"
  },
  {
    id: 'g6',
    text: "Select the antonym for 'Benevolent':",
    options: ["Kind", "Cruel", "Generous", "Helpful"],
    correctAnswer: "Cruel"
  },

  // --- Math (6 Qs) ---
  {
    id: 'm1',
    text: "If x + 5 = 12, what is x?",
    options: ["5", "6", "7", "8"],
    correctAnswer: "7"
  },
  {
    id: 'm2',
    text: "What is 15% of 200?",
    options: ["20", "25", "30", "35"],
    correctAnswer: "30"
  },
  {
    id: 'm3',
    text: "Solve: 12 / 4 + 3 * 2",
    options: ["9", "10", "6", "12"],
    correctAnswer: "9"
  },
  {
    id: 'm4',
    text: "A train travels 60 km in 1 hour. How far does it travel in 2.5 hours?",
    options: ["120 km", "140 km", "150 km", "160 km"],
    correctAnswer: "150 km"
  },
  {
    id: 'm5',
    text: "What is the square root of 144?",
    options: ["10", "11", "12", "14"],
    correctAnswer: "12"
  },
  {
    id: 'm6',
    text: "If a rectangle has width 4 and area 24, what is the length?",
    options: ["4", "5", "6", "8"],
    correctAnswer: "6"
  },

  // --- Reasoning (3 Qs) ---
  {
    id: 'r1',
    text: "Look at this series: 2, 4, 8, 16, ... What number comes next?",
    options: ["20", "24", "30", "32"],
    correctAnswer: "32"
  },
  {
    id: 'r2',
    text: "Bird is to Fly as Fish is to ___",
    options: ["Water", "Swim", "Gill", "Ocean"],
    correctAnswer: "Swim"
  },
  {
    id: 'r3',
    text: "Which does not belong? Apple, Orange, Banana, Carrot",
    options: ["Apple", "Orange", "Banana", "Carrot"],
    correctAnswer: "Carrot"
  }
];

export const TECHNICAL_QUESTIONS: McqQuestion[] = [
  // --- Web Development (10 Qs) ---
  {
    id: 'w1',
    text: "What does HTML stand for?",
    options: ["Hyper Text Markup Language", "High Tech Modern Language", "Hyperlink Text Mode Language", "Home Tool Markup Language"],
    correctAnswer: "Hyper Text Markup Language"
  },
  {
    id: 'w2',
    text: "Which tag is used for the largest heading in HTML?",
    options: ["<h6>", "<head>", "<h1>", "<header>"],
    correctAnswer: "<h1>"
  },
  {
    id: 'w3',
    text: "What is the correct CSS syntax to change text color to red?",
    options: ["text-color: red;", "color: red;", "font-color: red;", "text-style: red;"],
    correctAnswer: "color: red;"
  },
  {
    id: 'w4',
    text: "In JavaScript, how do you declare a constant variable?",
    options: ["var", "let", "const", "constant"],
    correctAnswer: "const"
  },
  {
    id: 'w5',
    text: "Which HTML attribute is used to define inline styles?",
    options: ["class", "font", "styles", "style"],
    correctAnswer: "style"
  },
  {
    id: 'w6',
    text: "What is the DOM?",
    options: ["Document Object Model", "Data Object Mode", "Digital Ordinance Model", "Desktop Orientation Module"],
    correctAnswer: "Document Object Model"
  },
  {
    id: 'w7',
    text: "Which CSS property controls the text size?",
    options: ["text-style", "font-size", "text-size", "font-style"],
    correctAnswer: "font-size"
  },
  {
    id: 'w8',
    text: "How do you select an element with id 'demo' in CSS?",
    options: [".demo", "#demo", "demo", "*demo"],
    correctAnswer: "#demo"
  },
  {
    id: 'w9',
    text: "Which HTTP method is used to retrieve data?",
    options: ["POST", "GET", "PUT", "DELETE"],
    correctAnswer: "GET"
  },
  {
    id: 'w10',
    text: "What does SQL stand for?",
    options: ["Structured Question Language", "Structured Query Language", "Strong Question Language", "Simple Query Language"],
    correctAnswer: "Structured Query Language"
  },

  // --- Python (5 Qs) ---
  {
    id: 'p1',
    text: "How do you output text to the console in Python?",
    options: ["echo()", "console.log()", "print()", "write()"],
    correctAnswer: "print()"
  },
  {
    id: 'p2',
    text: "Which keyword is used to define a function in Python?",
    options: ["func", "def", "function", "define"],
    correctAnswer: "def"
  },
  {
    id: 'p3',
    text: "What data type is the object below? L = [1, 23, 'hello', 1]",
    options: ["Tuple", "Dictionary", "List", "Array"],
    correctAnswer: "List"
  },
  {
    id: 'p4',
    text: "Which operator is used for exponentiation in Python?",
    options: ["^", "**", "//", "exp"],
    correctAnswer: "**"
  },
  {
    id: 'p5',
    text: "How do you start a comment in Python?",
    options: ["//", "/*", "#", "<!--"],
    correctAnswer: "#"
  },

  // --- AI / Cloud (5 Qs) ---
  {
    id: 'a1',
    text: "Which is a popular library for Machine Learning in Python?",
    options: ["React", "Django", "Scikit-learn", "JQuery"],
    correctAnswer: "Scikit-learn"
  },
  {
    id: 'a2',
    text: "What does AWS stand for?",
    options: ["Amazon Web Services", "Automated Web Systems", "Advanced Web Solutions", "Apple Web Store"],
    correctAnswer: "Amazon Web Services"
  },
  {
    id: 'a3',
    text: "Which term describes computing services provided over the internet?",
    options: ["Grid Computing", "Cloud Computing", "Local Computing", "Soft Computing"],
    correctAnswer: "Cloud Computing"
  },
  {
    id: 'a4',
    text: "What is 'Supervised Learning'?",
    options: ["Learning without data", "Learning with labeled data", "Learning with unlabeled data", "Self-learning"],
    correctAnswer: "Learning with labeled data"
  },
  {
    id: 'a5',
    text: "Which of these is an example of a Neural Network architecture?",
    options: ["CNN", "HTML", "SQL", "JSON"],
    correctAnswer: "CNN"
  }
];

export const COMMUNICATION_QUESTIONS: McqQuestion[] = [
    {
        id: 'c1',
        text: "Which of the following is the most professional subject line for an email requesting a meeting?",
        options: ["Meeting?", "Can we talk?", "Request for Meeting: Project X Review", "Urgent meeting now"],
        correctAnswer: "Request for Meeting: Project X Review"
    },
    {
        id: 'c2',
        text: "When a colleague interrupts you during a presentation, what is the best response?",
        options: ["Shout at them to stop.", "Ignore them completely.", "Politely ask them to hold questions until the end.", "Walk out of the room."],
        correctAnswer: "Politely ask them to hold questions until the end."
    },
    {
        id: 'c3',
        text: "Select the sentence with the correct grammatical structure.",
        options: ["Me and him went to the meeting.", "He and I went to the meeting.", "Him and I went to the meeting.", "I and him went to the meeting."],
        correctAnswer: "He and I went to the meeting."
    },
    {
        id: 'c4',
        text: "What does 'CC' stand for in an email?",
        options: ["Carbon Copy", "Create Copy", "Color Code", "Contact Copy"],
        correctAnswer: "Carbon Copy"
    },
    {
        id: 'c5',
        text: "Which of these implies 'Active Listening'?",
        options: ["Planning your response while they speak.", "Nodding and maintaining eye contact.", "Checking your phone.", "Interrupting to correct them."],
        correctAnswer: "Nodding and maintaining eye contact."
    },
    {
        id: 'c6',
        text: "How should you start a formal email to a new client named John Smith?",
        options: ["Hi John,", "Dear Mr. Smith,", "Hey J,", "To Whom It May Concern,"],
        correctAnswer: "Dear Mr. Smith,"
    },
    {
        id: 'c7',
        text: "Choose the correct word: 'Their proposal was ___ than ours.'",
        options: ["more better", "gooder", "better", "best"],
        correctAnswer: "better"
    },
    {
        id: 'c8',
        text: "What is the best way to decline a request from a coworker?",
        options: ["No, I won't do it.", "I can't right now, maybe later.", "I am currently at capacity but can look at this next week.", "Ask someone else."],
        correctAnswer: "I am currently at capacity but can look at this next week."
    },
    {
        id: 'c9',
        text: "Identify the passive voice sentence.",
        options: ["The team completed the project.", "The project was completed by the team.", "They finished the work.", "We launched the product."],
        correctAnswer: "The project was completed by the team."
    },
    {
        id: 'c10',
        text: "Which tone is most appropriate for a business report?",
        options: ["Emotional and personal", "Objective and formal", "Casual and slang-filled", "Aggressive and direct"],
        correctAnswer: "Objective and formal"
    },
    {
        id: 'c11',
        text: "What does 'BCC' mean in an email context?",
        options: ["Blind Carbon Copy", "Back Carbon Copy", "Blank Carbon Copy", "Blind Contact Copy"],
        correctAnswer: "Blind Carbon Copy"
    },
    {
        id: 'c12',
        text: "Choose the correct homophone: 'Please ___ the document attached.'",
        options: ["reed", "read", "red", "real"],
        correctAnswer: "read"
    },
    {
        id: 'c13',
        text: "If you don't understand a client's question, what should you do?",
        options: ["Guess the answer.", "Ignore the question.", "Ask for clarification politely.", "Change the subject."],
        correctAnswer: "Ask for clarification politely."
    },
    {
        id: 'c14',
        text: "What implies non-verbal communication?",
        options: ["Email text", "Phone call audio", "Body language and facial expressions", "Written report"],
        correctAnswer: "Body language and facial expressions"
    },
    {
        id: 'c15',
        text: "Which phrase is an idiom meaning 'to agree'?",
        options: ["See eye to eye", "Break a leg", "Cost an arm and a leg", "Hit the sack"],
        correctAnswer: "See eye to eye"
    },
    {
        id: 'c16',
        text: "What is the primary goal of constructive feedback?",
        options: ["To hurt feelings", "To improve performance", "To show dominance", "To ignore issues"],
        correctAnswer: "To improve performance"
    },
    {
        id: 'c17',
        text: "Select the correctly punctuated sentence.",
        options: ["However I agree.", "However, I agree.", "However I, agree.", "However; I agree."],
        correctAnswer: "However, I agree."
    },
    {
        id: 'c18',
        text: "Which is NOT a professional email sign-off?",
        options: ["Sincerely,", "Best regards,", "Later,", "Kind regards,"],
        correctAnswer: "Later,"
    },
    {
        id: 'c19',
        text: "To 'mitigate' a risk means to:",
        options: ["Increase it", "Ignore it", "Reduce its severity", "Identify it"],
        correctAnswer: "Reduce its severity"
    },
    {
        id: 'c20',
        text: "Which word best completes the sentence? 'The team showed great ___ in solving the crisis.'",
        options: ["resilience", "laziness", "fear", "hesitation"],
        correctAnswer: "resilience"
    }
];
