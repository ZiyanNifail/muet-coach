export interface ListeningQuestion {
  id: string
  section: 'A' | 'B' | 'C'
  type: 'mcq' | 'fill'
  passage: string
  question: string
  options?: string[]
  answer: string
}

export const LISTENING_QUESTIONS: ListeningQuestion[] = [
  // ── SECTION A: Short dialogues / announcements (MCQ, play 2×) ─────────────
  {
    id: 'A1',
    section: 'A',
    type: 'mcq',
    passage:
      'Attention all passengers. The northbound train to Kuala Lumpur scheduled to depart at three fifteen is delayed by approximately forty minutes due to track maintenance. We apologise for the inconvenience and thank you for your patience.',
    question: 'Why is the train delayed?',
    options: ['Bad weather conditions', 'A technical fault on the train', 'Track maintenance work', 'An accident on the line'],
    answer: 'Track maintenance work',
  },
  {
    id: 'A2',
    section: 'A',
    type: 'mcq',
    passage:
      'A: Excuse me, could you tell me where the registration counter is? B: Sure. Go straight down this corridor, turn left at the end, and it is the second door on your right. A: Thank you so much. B: No problem, enjoy the conference.',
    question: 'Where is the registration counter?',
    options: [
      'First door on the right',
      'Second door on the right after turning left',
      'At the end of the corridor on the left',
      'First door on the left',
    ],
    answer: 'Second door on the right after turning left',
  },
  {
    id: 'A3',
    section: 'A',
    type: 'mcq',
    passage:
      'Good morning. This is a reminder that the library will be closed this Saturday for its annual stock-take. All borrowed books must be returned by Friday evening. Online resources will remain accessible throughout the weekend.',
    question: 'What must students do before Friday evening?',
    options: ['Return all borrowed books', 'Register for the stock-take', 'Access the online resources', 'Collect new library cards'],
    answer: 'Return all borrowed books',
  },
  {
    id: 'A4',
    section: 'A',
    type: 'mcq',
    passage:
      'A: Have you heard about the new scholarship? B: No, what is it about? A: The university is offering full scholarships to students who maintain a CGPA of three point seven and above. Applications close next Monday. B: That is great news. I should apply!',
    question: 'What is the requirement for the scholarship?',
    options: ['CGPA of 3.5 and above', 'CGPA of 3.7 and above', 'Completion of community service', 'Recommendation from a lecturer'],
    answer: 'CGPA of 3.7 and above',
  },
  {
    id: 'A5',
    section: 'A',
    type: 'mcq',
    passage:
      'The sports centre will be undergoing renovation from the first of June to the thirtieth of June. During this period, swimming classes will be relocated to the community pool on Jalan Bahagia. All other facilities remain closed. Members may freeze their membership for the month at no charge.',
    question: 'Where will swimming classes be held during the renovation?',
    options: ['In a temporary tent outside', 'At the community pool on Jalan Bahagia', 'At a nearby hotel', 'Online via video sessions'],
    answer: 'At the community pool on Jalan Bahagia',
  },
  {
    id: 'A6',
    section: 'A',
    type: 'mcq',
    passage:
      'A: Did you remember to bring the report for the meeting? B: Oh no, I left it on my desk. A: You had better go back and get it. The director is very particular about having hard copies. B: I will run back quickly. Can you stall for five minutes?',
    question: 'Why does the speaker need to go back?',
    options: ['She forgot her laptop', 'She left the printed report behind', 'She needs to collect her ID card', 'She has not finished writing the report'],
    answer: 'She left the printed report behind',
  },
  {
    id: 'A7',
    section: 'A',
    type: 'mcq',
    passage:
      'Parents and guardians are reminded that school will close two hours early this Wednesday due to a staff development programme. Please make arrangements to pick up your children by twelve thirty. The school canteen will remain open until twelve.',
    question: 'At what time should children be picked up this Wednesday?',
    options: ['At 12:00', 'At 12:30', 'At 2:00', 'At 2:30'],
    answer: 'At 12:30',
  },
  {
    id: 'A8',
    section: 'A',
    type: 'mcq',
    passage:
      'A: I am thinking of joining the debate club. B: That is a wonderful idea. It will sharpen your critical thinking and public speaking. A: Do you know when they meet? B: Every Tuesday at five in the afternoon, in Room B204.',
    question: 'When does the debate club meet?',
    options: ['Mondays at 5 pm', 'Tuesdays at 5 pm in Room B204', 'Wednesdays at 4 pm in the hall', 'Thursdays at 5 pm'],
    answer: 'Tuesdays at 5 pm in Room B204',
  },
  {
    id: 'A9',
    section: 'A',
    type: 'mcq',
    passage:
      'This is a public service announcement. Residents of Taman Damai are advised that water supply will be temporarily disrupted tomorrow from eight in the morning until six in the evening due to pipe replacement works. Please store sufficient water beforehand.',
    question: 'Why will water supply be disrupted?',
    options: ['Scheduled cleaning of reservoirs', 'Pipe replacement works', 'A burst pipe emergency', 'Low water pressure in the area'],
    answer: 'Pipe replacement works',
  },
  {
    id: 'A10',
    section: 'A',
    type: 'mcq',
    passage:
      'A: I heard the career fair is next week. B: Yes, over forty companies will be there, including several multinational corporations. A: Should we prepare our resumes beforehand? B: Absolutely. You should also research the companies you are interested in.',
    question: 'What advice is given to students attending the career fair?',
    options: [
      'Dress formally and arrive early',
      'Bring a portfolio of projects',
      'Prepare resumes and research companies',
      'Register online before attending',
    ],
    answer: 'Prepare resumes and research companies',
  },

  // ── SECTION B: Extended conversation (fill-in-blank, play 2×) ─────────────
  {
    id: 'B1',
    section: 'B',
    type: 'fill',
    passage:
      'Interviewer: Welcome, Sarah. Tell us about your research on urban green spaces. Sarah: Thank you. My research focuses on how access to parks and green areas affects the mental well-being of city residents. We surveyed over five hundred participants across three cities. Interviewer: What were your key findings? Sarah: Residents who visited green spaces at least three times a week reported a thirty percent reduction in stress levels. We also found that children in areas with more parks performed better academically. Interviewer: That is remarkable. What do you recommend for city planners? Sarah: I recommend allocating at least fifteen percent of urban land for green spaces and ensuring they are accessible by public transport.',
    question: 'According to Sarah, residents who visited green spaces at least three times a week experienced a ______ reduction in stress levels.',
    answer: '30%',
  },
  {
    id: 'B2',
    section: 'B',
    type: 'fill',
    passage:
      'Interviewer: Welcome, Sarah. Tell us about your research on urban green spaces. Sarah: Thank you. My research focuses on how access to parks and green areas affects the mental well-being of city residents. We surveyed over five hundred participants across three cities. Interviewer: What were your key findings? Sarah: Residents who visited green spaces at least three times a week reported a thirty percent reduction in stress levels. We also found that children in areas with more parks performed better academically. Interviewer: That is remarkable. What do you recommend for city planners? Sarah: I recommend allocating at least fifteen percent of urban land for green spaces and ensuring they are accessible by public transport.',
    question: 'Sarah surveyed more than ______ participants across three cities.',
    answer: '500',
  },
  {
    id: 'B3',
    section: 'B',
    type: 'fill',
    passage:
      'Interviewer: Welcome, Sarah. Tell us about your research on urban green spaces. Sarah: Thank you. My research focuses on how access to parks and green areas affects the mental well-being of city residents. We surveyed over five hundred participants across three cities. Interviewer: What were your key findings? Sarah: Residents who visited green spaces at least three times a week reported a thirty percent reduction in stress levels. We also found that children in areas with more parks performed better academically. Interviewer: That is remarkable. What do you recommend for city planners? Sarah: I recommend allocating at least fifteen percent of urban land for green spaces and ensuring they are accessible by public transport.',
    question: 'Sarah recommends that city planners allocate at least ______ of urban land for green spaces.',
    answer: '15%',
  },
  {
    id: 'B4',
    section: 'B',
    type: 'fill',
    passage:
      'Host: Good evening and welcome to TechTalks. Tonight we speak with Dr Lim about artificial intelligence in healthcare. Dr Lim: Good evening. AI is transforming how we detect diseases. For example, our system can identify early signs of diabetic retinopathy with ninety-four percent accuracy. Host: How does it compare to human doctors? Dr Lim: In controlled trials, AI performed on par with specialists. However, AI works best as a decision-support tool, not a replacement. Host: What are the challenges? Dr Lim: Data privacy is the biggest concern. Patient data must be anonymised before training models. Cost is also a barrier for rural hospitals.',
    question: 'Dr Lim\'s AI system identifies early signs of diabetic retinopathy with ______ accuracy.',
    answer: '94%',
  },
  {
    id: 'B5',
    section: 'B',
    type: 'fill',
    passage:
      'Host: Good evening and welcome to TechTalks. Tonight we speak with Dr Lim about artificial intelligence in healthcare. Dr Lim: Good evening. AI is transforming how we detect diseases. For example, our system can identify early signs of diabetic retinopathy with ninety-four percent accuracy. Host: How does it compare to human doctors? Dr Lim: In controlled trials, AI performed on par with specialists. However, AI works best as a decision-support tool, not a replacement. Host: What are the challenges? Dr Lim: Data privacy is the biggest concern. Patient data must be anonymised before training models. Cost is also a barrier for rural hospitals.',
    question: 'According to Dr Lim, AI in healthcare should function as a ______ tool, not a replacement for doctors.',
    answer: 'decision-support',
  },
  {
    id: 'B6',
    section: 'B',
    type: 'fill',
    passage:
      'Host: Good evening and welcome to TechTalks. Tonight we speak with Dr Lim about artificial intelligence in healthcare. Dr Lim: Good evening. AI is transforming how we detect diseases. For example, our system can identify early signs of diabetic retinopathy with ninety-four percent accuracy. Host: How does it compare to human doctors? Dr Lim: In controlled trials, AI performed on par with specialists. However, AI works best as a decision-support tool, not a replacement. Host: What are the challenges? Dr Lim: Data privacy is the biggest concern. Patient data must be anonymised before training models. Cost is also a barrier for rural hospitals.',
    question: 'The biggest concern regarding AI in healthcare, according to Dr Lim, is ______.',
    answer: 'data privacy',
  },
  {
    id: 'B7',
    section: 'B',
    type: 'fill',
    passage:
      'Moderator: Welcome to the panel on sustainable living. Ms Priya, what simple changes can households make? Ms Priya: Start with reducing single-use plastics. Bring your own bags, avoid plastic straws, and choose products with minimal packaging. Mr Fariz: I would add energy conservation. Switch off lights and appliances when not in use, and consider switching to LED bulbs which use seventy-five percent less energy than traditional ones. Ms Priya: Absolutely. Composting food waste is another impactful step — it can divert up to thirty percent of household waste from landfills.',
    question: 'LED bulbs use ______ percent less energy than traditional bulbs.',
    answer: '75',
  },
  {
    id: 'B8',
    section: 'B',
    type: 'fill',
    passage:
      'Moderator: Welcome to the panel on sustainable living. Ms Priya, what simple changes can households make? Ms Priya: Start with reducing single-use plastics. Bring your own bags, avoid plastic straws, and choose products with minimal packaging. Mr Fariz: I would add energy conservation. Switch off lights and appliances when not in use, and consider switching to LED bulbs which use seventy-five percent less energy than traditional ones. Ms Priya: Absolutely. Composting food waste is another impactful step — it can divert up to thirty percent of household waste from landfills.',
    question: 'Composting food waste can divert up to ______ percent of household waste from landfills.',
    answer: '30',
  },
  {
    id: 'B9',
    section: 'B',
    type: 'fill',
    passage:
      'Counsellor: Many students struggle with time management. The first step is to identify your peak productivity hours. Some people work best in the morning, others at night. Once you know this, schedule your most demanding tasks during those hours. Use a planner or digital calendar to block out study time. Avoid multitasking — research shows it reduces productivity by as much as forty percent. Take regular breaks using the Pomodoro technique: twenty-five minutes of focused work followed by a five-minute break.',
    question: 'According to the counsellor, multitasking can reduce productivity by as much as ______ percent.',
    answer: '40',
  },
  {
    id: 'B10',
    section: 'B',
    type: 'fill',
    passage:
      'Counsellor: Many students struggle with time management. The first step is to identify your peak productivity hours. Some people work best in the morning, others at night. Once you know this, schedule your most demanding tasks during those hours. Use a planner or digital calendar to block out study time. Avoid multitasking — research shows it reduces productivity by as much as forty percent. Take regular breaks using the Pomodoro technique: twenty-five minutes of focused work followed by a five-minute break.',
    question: 'In the Pomodoro technique, focused work sessions last ______ minutes, followed by a five-minute break.',
    answer: '25',
  },

  // ── SECTION C: Academic monologue (MCQ + fill, play 1×) ──────────────────
  {
    id: 'C1',
    section: 'C',
    type: 'mcq',
    passage:
      'Good afternoon. Today I will discuss the global water crisis and its implications. Approximately two point two billion people currently lack access to safe drinking water. This is not merely a rural issue — urban areas in developing nations are equally affected due to aging infrastructure and rapid population growth. Climate change is worsening the situation by altering precipitation patterns. Droughts are becoming more frequent in sub-Saharan Africa and parts of South Asia, while floods in other regions contaminate freshwater sources. Experts project that by 2050, over half the world\'s population could face water scarcity. Solutions include investment in desalination technology, rainwater harvesting, and stronger international cooperation on transboundary water agreements. Behavioural change at the individual level, such as reducing water wastage in daily activities, is equally critical.',
    question: 'According to the lecture, approximately how many people currently lack access to safe drinking water?',
    options: ['1.2 billion', '2.2 billion', '3.2 billion', '4.2 billion'],
    answer: '2.2 billion',
  },
  {
    id: 'C2',
    section: 'C',
    type: 'mcq',
    passage:
      'Good afternoon. Today I will discuss the global water crisis and its implications. Approximately two point two billion people currently lack access to safe drinking water. This is not merely a rural issue — urban areas in developing nations are equally affected due to aging infrastructure and rapid population growth. Climate change is worsening the situation by altering precipitation patterns. Droughts are becoming more frequent in sub-Saharan Africa and parts of South Asia, while floods in other regions contaminate freshwater sources. Experts project that by 2050, over half the world\'s population could face water scarcity. Solutions include investment in desalination technology, rainwater harvesting, and stronger international cooperation on transboundary water agreements. Behavioural change at the individual level, such as reducing water wastage in daily activities, is equally critical.',
    question: 'Which of the following is NOT mentioned as a solution to the water crisis?',
    options: ['Desalination technology', 'Rainwater harvesting', 'Privatisation of water utilities', 'International cooperation on water agreements'],
    answer: 'Privatisation of water utilities',
  },
  {
    id: 'C3',
    section: 'C',
    type: 'mcq',
    passage:
      'Good afternoon. Today I will discuss the global water crisis and its implications. Approximately two point two billion people currently lack access to safe drinking water. This is not merely a rural issue — urban areas in developing nations are equally affected due to aging infrastructure and rapid population growth. Climate change is worsening the situation by altering precipitation patterns. Droughts are becoming more frequent in sub-Saharan Africa and parts of South Asia, while floods in other regions contaminate freshwater sources. Experts project that by 2050, over half the world\'s population could face water scarcity. Solutions include investment in desalination technology, rainwater harvesting, and stronger international cooperation on transboundary water agreements. Behavioural change at the individual level, such as reducing water wastage in daily activities, is equally critical.',
    question: 'By 2050, experts project that water scarcity will affect what proportion of the world\'s population?',
    options: ['One quarter', 'One third', 'Over half', 'Nearly all'],
    answer: 'Over half',
  },
  {
    id: 'C4',
    section: 'C',
    type: 'fill',
    passage:
      'Good afternoon. Today I will discuss the global water crisis and its implications. Approximately two point two billion people currently lack access to safe drinking water. This is not merely a rural issue — urban areas in developing nations are equally affected due to aging infrastructure and rapid population growth. Climate change is worsening the situation by altering precipitation patterns. Droughts are becoming more frequent in sub-Saharan Africa and parts of South Asia, while floods in other regions contaminate freshwater sources. Experts project that by 2050, over half the world\'s population could face water scarcity. Solutions include investment in desalination technology, rainwater harvesting, and stronger international cooperation on transboundary water agreements. Behavioural change at the individual level, such as reducing water wastage in daily activities, is equally critical.',
    question: 'Urban areas in developing nations are affected by the water crisis partly due to ______ infrastructure.',
    answer: 'aging',
  },
  {
    id: 'C5',
    section: 'C',
    type: 'mcq',
    passage:
      'Today I want to address the growing issue of social media addiction among teenagers. Studies show that the average teenager spends seven hours per day on screens, with social media accounting for three of those hours. The constant seeking of likes and comments activates the brain\'s reward system in a manner similar to gambling. This compulsive behaviour is linked to increased rates of anxiety, depression, and poor academic performance. Schools in Finland have responded by banning smartphones during school hours, resulting in a twelve percent improvement in test scores within a year. Experts recommend that parents establish digital-free zones at home, particularly during meals and the hour before bedtime.',
    question: 'How many hours per day do teenagers spend on social media, according to the lecture?',
    options: ['2 hours', '3 hours', '5 hours', '7 hours'],
    answer: '3 hours',
  },
  {
    id: 'C6',
    section: 'C',
    type: 'mcq',
    passage:
      'Today I want to address the growing issue of social media addiction among teenagers. Studies show that the average teenager spends seven hours per day on screens, with social media accounting for three of those hours. The constant seeking of likes and comments activates the brain\'s reward system in a manner similar to gambling. This compulsive behaviour is linked to increased rates of anxiety, depression, and poor academic performance. Schools in Finland have responded by banning smartphones during school hours, resulting in a twelve percent improvement in test scores within a year. Experts recommend that parents establish digital-free zones at home, particularly during meals and the hour before bedtime.',
    question: 'What was the result of Finland\'s smartphone ban in schools?',
    options: [
      '8% improvement in attendance',
      '12% improvement in test scores',
      '20% reduction in anxiety cases',
      '15% reduction in screen time at home',
    ],
    answer: '12% improvement in test scores',
  },
  {
    id: 'C7',
    section: 'C',
    type: 'mcq',
    passage:
      'Today I want to address the growing issue of social media addiction among teenagers. Studies show that the average teenager spends seven hours per day on screens, with social media accounting for three of those hours. The constant seeking of likes and comments activates the brain\'s reward system in a manner similar to gambling. This compulsive behaviour is linked to increased rates of anxiety, depression, and poor academic performance. Schools in Finland have responded by banning smartphones during school hours, resulting in a twelve percent improvement in test scores within a year. Experts recommend that parents establish digital-free zones at home, particularly during meals and the hour before bedtime.',
    question: 'The brain\'s response to social media likes is compared to which behaviour?',
    options: ['Exercise', 'Reading', 'Gambling', 'Shopping'],
    answer: 'Gambling',
  },
  {
    id: 'C8',
    section: 'C',
    type: 'fill',
    passage:
      'Today I want to address the growing issue of social media addiction among teenagers. Studies show that the average teenager spends seven hours per day on screens, with social media accounting for three of those hours. The constant seeking of likes and comments activates the brain\'s reward system in a manner similar to gambling. This compulsive behaviour is linked to increased rates of anxiety, depression, and poor academic performance. Schools in Finland have responded by banning smartphones during school hours, resulting in a twelve percent improvement in test scores within a year. Experts recommend that parents establish digital-free zones at home, particularly during meals and the hour before bedtime.',
    question: 'Experts recommend creating digital-free zones during meals and the hour before ______.',
    answer: 'bedtime',
  },
  {
    id: 'C9',
    section: 'C',
    type: 'mcq',
    passage:
      'Today I want to address the growing issue of social media addiction among teenagers. Studies show that the average teenager spends seven hours per day on screens, with social media accounting for three of those hours. The constant seeking of likes and comments activates the brain\'s reward system in a manner similar to gambling. This compulsive behaviour is linked to increased rates of anxiety, depression, and poor academic performance. Schools in Finland have responded by banning smartphones during school hours, resulting in a twelve percent improvement in test scores within a year. Experts recommend that parents establish digital-free zones at home, particularly during meals and the hour before bedtime.',
    question: 'Which of the following is NOT listed as a consequence of social media addiction?',
    options: ['Anxiety', 'Poor academic performance', 'Physical inactivity', 'Depression'],
    answer: 'Physical inactivity',
  },
  {
    id: 'C10',
    section: 'C',
    type: 'fill',
    passage:
      'Today I want to address the growing issue of social media addiction among teenagers. Studies show that the average teenager spends seven hours per day on screens, with social media accounting for three of those hours. The constant seeking of likes and comments activates the brain\'s reward system in a manner similar to gambling. This compulsive behaviour is linked to increased rates of anxiety, depression, and poor academic performance. Schools in Finland have responded by banning smartphones during school hours, resulting in a twelve percent improvement in test scores within a year. Experts recommend that parents establish digital-free zones at home, particularly during meals and the hour before bedtime.',
    question: 'The average teenager spends ______ hours per day on screens in total.',
    answer: '7',
  },
]
