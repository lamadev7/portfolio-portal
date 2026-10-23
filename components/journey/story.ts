/* The narrated story: one entry per chapter stop, in trail order. `text` is the caption; `say` overrides it for the voice where
   the written form reads badly aloud. `cue` fires a scene sound as the line starts; `beat` is the body language for the line.
   `thought` is the unvoiced line he thinks while walking on to the next stop.
   public/voice/* is generated from this file by scripts/gen-voice.sh. */

export type StoryCue = 'bus-horn' | 'truck-horn' | 'applause' | 'chime' | 'typing';
export type StoryBeat = 'walk' | 'stop' | 'turn' | 'gesture' | 'nod' | 'point' | 'sit' | 'type' | 'toss' | 'gaze';

export interface StoryLine {
  text: string;
  say?: string;
  cue?: StoryCue;
  beat?: StoryBeat;
}

export interface StoryChapter {
  id: string;
  title: string;
  lines: StoryLine[];
  thought?: string;
}

export const VOICE = { name: 'Aman', rate: 170, breathMs: 320 };

export const STORY: StoryChapter[] = [
  {
    id: 'sarlahi',
    title: 'School in the Terai',
    lines: [
      { text: 'I’m Parbat Lama, and my story starts here, in Sarlahi, on the plains of Nepal’s Terai.', beat: 'turn' },
      { text: 'This is where I did my basic schooling: a schoolboy from the Terai, with a long road ahead.', beat: 'gesture' },
      { text: 'Walk with me. The road climbs north from here, all the way to the Himalaya.', beat: 'point' }
    ],
    thought: 'The plains taught patience. The hills, climbing.'
  },
  {
    id: 'uniglobe',
    title: '+2 in Kathmandu',
    lines: [
      { text: 'In 2019 I moved to Kathmandu for my +2 at Uniglobe SS / College in Kamaladi.', say: 'In 2019, I moved to Kathmandu for my plus two, at Uniglobe College in Kamaladi.', cue: 'bus-horn', beat: 'turn' },
      { text: 'I studied Management with Computer Science as my major, from January 2019 to December 2020.', beat: 'gesture' },
      { text: 'College buses, a futsal ground, a basketball court, and my very first Computer Science classes.', beat: 'point' }
    ],
    thought: 'A bigger city asked bigger questions.'
  },
  {
    id: 'herald',
    title: 'BSc (Hons) Information Technology',
    lines: [
      { text: 'In February 2021 I began a BSc (Hons) in Information Technology at Herald College Kathmandu.', say: 'In February 2021, I began a B S C Honours in Information Technology, at Herald College Kathmandu.', beat: 'turn' },
      { text: 'It ran until October 2023, and it shaped everything that came after.', beat: 'gesture' },
      { text: 'Less than a year in, I was already working as a developer alongside my studies.', beat: 'nod' }
    ],
    thought: 'Learning in class, itching to build.'
  },
  {
    id: 'princelab',
    title: 'Frontend Developer, Princelab',
    lines: [
      { text: 'January 2022 brought my first role in tech: Frontend Developer at Princelab, working remotely.', say: 'January 2022 brought my first role in tech. [[slnc 150]] Frontend Developer at Princelab, working remotely.', cue: 'typing', beat: 'type' },
      { text: 'I built interfaces in Next.js, TypeScript and Tailwind.', say: 'I built interfaces in Next J S, TypeScript, and Tailwind.', beat: 'type' },
      { text: 'A short, focused stint until July 2022: I shipped fast, and learned faster.', beat: 'nod' }
    ],
    thought: 'Shipping code changes how you study.'
  },
  {
    id: 'portpro',
    title: 'Senior Full-Stack Engineer, PortPro',
    lines: [
      { text: 'In June 2022 I joined PortPro in Lalitpur. Today I’m a Senior Full-Stack Engineer there.', say: 'In June 2022, I joined Port Pro in Lalitpur. [[slnc 120]] Today, I’m a Senior Full-Stack Engineer there.', cue: 'truck-horn', beat: 'turn' },
      { text: 'We build drayOS, a logistics TMS for container drayage: trucking containers between ports, rail yards and warehouses.', say: 'We build dray O S, a logistics T M S for container drayage. [[slnc 120]] Trucking containers between ports, rail yards, and warehouses.', beat: 'point' },
      { text: 'On the front end: performance work, live maps in Mapbox GL and React Leaflet, and a shared design system.', say: 'On the front end: performance work, live maps in Mapbox G L and React Leaflet, and a shared design system.', beat: 'gesture' },
      { text: 'Behind it, Node with Express and Hapi, MongoDB and Sequelize, real-time Socket.io and Pusher, and AWS CI/CD.', say: 'Behind it, Node, with Express and Hapi. Mongo D B and Sequelize. Real-time Socket I O and Pusher. And C I C D on A W S.', beat: 'gesture' },
      { text: 'My component design system cut the lead time for new screens by about 40%.', say: 'My component design system cut the lead time for new screens by about forty percent.', cue: 'chime', beat: 'nod' }
    ],
    thought: 'Two roads at once: work and study.'
  },
  {
    id: 'aaa-2023',
    title: 'AAA Scholarship',
    lines: [
      { text: 'In 2023 I received the AAA Scholarship at Herald College.', say: 'In 2023, I received the Triple A Scholarship at Herald College.', cue: 'applause', beat: 'gesture' },
      { text: 'I earned it in my final year, while working at PortPro and finishing my degree.', say: 'I earned it in my final year, while working at Port Pro, and finishing my degree.', beat: 'nod' },
      { text: 'Work showed me what to learn. The degree showed me how.', beat: 'gesture' }
    ],
    thought: 'Recognition is a rest stop, not a summit.'
  },
  {
    id: 'graduation',
    title: 'First Class Honours',
    lines: [
      { text: 'October 2023: I graduated with a BSc (Hons) in Information Technology from Herald College.', say: 'October 2023. [[slnc 150]] I graduated with a B S C Honours in Information Technology, from Herald College.', beat: 'turn' },
      { text: 'First Class Honours, the top classification, earned while shipping production code at PortPro.', say: 'First Class Honours, the top classification, earned while shipping production code at Port Pro.', cue: 'applause', beat: 'toss' },
      { text: 'Graduation ended a course. It didn’t end the learning.', beat: 'nod' }
    ],
    thought: 'The cap comes down. The climb goes on.'
  },
  {
    id: 'aaa-2024',
    title: 'AAA Scholarship, again',
    lines: [
      { text: 'In 2024 the AAA Scholarship came my way a second time.', say: 'In 2024, the Triple A Scholarship came my way a second time.', cue: 'chime', beat: 'gesture' },
      { text: 'Two years running: consistency, not luck.', say: 'Two years running. [[slnc 120]] Consistency, not luck.', beat: 'nod' },
      { text: 'And soon, it was time to give some of it back.', beat: 'turn' }
    ],
    thought: 'Time to send the rope back down.'
  },
  {
    id: 'supervisor',
    title: 'Final Year Project Supervisor',
    lines: [
      { text: 'From August 2025 to April 2026, I went back to Herald as a Final Year Project Supervisor.', beat: 'sit' },
      { text: 'I guided about 12 student teams through their final-year projects.', say: 'I guided about twelve student teams through their final-year projects.', beat: 'gesture' },
      { text: 'Blockchain voting, AI recommendation engines for medicine, logistics and mental health, and full-stack platforms.', say: 'Blockchain voting. A I recommendation engines for medicine, logistics, and mental health. And full-stack platforms.', beat: 'gesture' }
    ],
    thought: 'Teaching sharpened what I thought I knew.'
  },
  {
    id: 'agents',
    title: 'Building an orchestrator agent',
    lines: [
      { text: 'Now I’m building an orchestrator AI agent at PortPro.', say: 'Now, I’m building an orchestrator A I agent, at Port Pro.', cue: 'typing', beat: 'type' },
      { text: 'It supervises dispatcher, billing and CSR sub-agents: it hands each one its task, and checks the result.', say: 'It supervises dispatcher, billing, and C S R sub-agents. [[slnc 100]] It hands each one its task, and checks the result.', beat: 'type' },
      { text: 'From a schoolboy in the Terai to software that coordinates other AI.', say: 'From a schoolboy in the Terai, to software that coordinates other A I.', beat: 'turn' }
    ],
    thought: 'The air thins. The view widens.'
  },
  {
    id: 'next',
    title: 'Much more to go.',
    lines: [
      { text: 'Over four years of shipping production software, and the next summit is already in view.', beat: 'gaze' },
      { text: 'Away from the keyboard I trek, ride and take photographs. The dream is Everest.', say: 'Away from the keyboard, I trek, ride, and take photographs. [[slnc 150]] The dream is Everest.', beat: 'gaze' },
      { text: 'Right now, I’m open to senior and contract roles.', cue: 'chime', beat: 'turn' },
      { text: 'Open my résumé, or just say hello. I’d love to hear what you’re building.', say: 'Open my résumé, or just say hello. [[slnc 120]] I’d love to hear what you’re building.', beat: 'gesture' }
    ]
  }
];

/* travel and landmark stops on the v2 route (ids are the stop ids): what the place is, in the same voice, without personal claims */
export const TRAVEL: StoryChapter[] = [
  {
    id: 'chitwan',
    title: 'Chitwan National Park',
    lines: [
      { text: 'Chitwan National Park, in the Inner Terai: sal forest, tall grass and slow rivers.', beat: 'gaze' },
      { text: 'Home to the one-horned rhino, and a UNESCO World Heritage Site since 1984.', beat: 'point' },
      { text: 'From here, the road leaves the plains and climbs into the hills.', beat: 'gesture' }
    ]
  },
  {
    id: 'lumbini',
    title: 'Lumbini',
    lines: [
      { text: 'Lumbini, in Rupandehi: the birthplace of the Buddha.', beat: 'gaze' },
      { text: 'The Maya Devi Temple marks the spot, beside the sacred pool and the Ashoka Pillar.', say: 'The Maya Devi Temple marks the spot, beside the sacred pool, and the Ashoka Pillar.', beat: 'point' },
      { text: 'Monasteries built by many countries line the long canal of the Monastic Zone.', beat: 'gesture' }
    ]
  },
  {
    id: 'pokhara',
    title: 'Phewa Lake, Pokhara',
    lines: [
      { text: 'Phewa Lake in Pokhara, under Machhapuchhre, the Fishtail mountain.', say: 'Phewa Lake in Pokhara, under Machha-puchhre, the Fishtail mountain.', beat: 'gaze' },
      { text: 'On still days the peaks show in the water, and the boats rest on the shore.', beat: 'gesture' },
      { text: 'Paragliders launch from Sarangkot, on the ridge above the lake.', beat: 'point' }
    ]
  },
  {
    id: 'ranipokhari',
    title: 'Rani Pokhari',
    lines: [
      { text: 'Rani Pokhari, the Queen’s Pond, in the heart of Kathmandu.' },
      { text: 'King Pratap Malla built it in 1670, with a small temple at its centre.' }
    ]
  },
  {
    id: 'swayambhu',
    title: 'Swayambhunath',
    lines: [
      { text: 'Swayambhunath, on its hill west of the city.', say: 'Swayambhu-nath, on its hill west of the city.' },
      { text: 'The stupa’s painted eyes look out over the whole Kathmandu Valley.' }
    ]
  },
  {
    id: 'durbar',
    title: 'Kathmandu Durbar Square',
    lines: [
      { text: 'Kathmandu Durbar Square, at Basantapur: the old royal palace and its temples.' },
      { text: 'Pagoda roofs and carved windows, centuries of Newar craft.', say: 'Pagoda roofs, and carved windows. Centuries of Newar craft.' }
    ]
  }
];

export const voiceSrc = (id: string, i: number) => '/voice/' + id + '-' + i + '.m4a';
