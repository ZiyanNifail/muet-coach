export interface Task1Prompt {
  id: string
  title: string
  chartType: 'bar' | 'line' | 'pie'
  chartData: { label: string; value: number }[]
  unit: string
  prompt: string
}

export interface Task2Prompt {
  id: string
  statement: string
}

export const TASK1_PROMPTS: Task1Prompt[] = [
  {
    id: 't1-1',
    title: 'Internet Usage by Age Group (2023)',
    chartType: 'bar',
    chartData: [
      { label: '15–24', value: 96 },
      { label: '25–34', value: 89 },
      { label: '35–44', value: 78 },
      { label: '45–54', value: 61 },
      { label: '55–64', value: 43 },
      { label: '65+', value: 22 },
    ],
    unit: '% of population',
    prompt:
      'The bar chart shows the percentage of people in each age group who use the internet regularly in Malaysia in 2023. Describe the information shown in the chart. You should write at least 150 words.',
  },
  {
    id: 't1-2',
    title: 'Monthly Average Temperature in Kuala Lumpur (°C)',
    chartType: 'line',
    chartData: [
      { label: 'Jan', value: 27.5 },
      { label: 'Feb', value: 27.8 },
      { label: 'Mar', value: 28.2 },
      { label: 'Apr', value: 28.5 },
      { label: 'May', value: 28.6 },
      { label: 'Jun', value: 28.1 },
      { label: 'Jul', value: 27.9 },
      { label: 'Aug', value: 27.9 },
      { label: 'Sep', value: 27.7 },
      { label: 'Oct', value: 27.6 },
      { label: 'Nov', value: 27.4 },
      { label: 'Dec', value: 27.3 },
    ],
    unit: '°C',
    prompt:
      'The line graph shows the average monthly temperature in Kuala Lumpur throughout the year. Describe the main trends and patterns shown. You should write at least 150 words.',
  },
  {
    id: 't1-3',
    title: 'Modes of Transport Used by University Students',
    chartType: 'pie',
    chartData: [
      { label: 'Bus', value: 35 },
      { label: 'Car', value: 28 },
      { label: 'Motorcycle', value: 20 },
      { label: 'Train/LRT', value: 12 },
      { label: 'Walking', value: 5 },
    ],
    unit: '%',
    prompt:
      'The pie chart shows the proportion of university students who use different modes of transport to travel to campus. Describe the information shown and highlight the key features. You should write at least 150 words.',
  },
  {
    id: 't1-4',
    title: 'Causes of Food Waste in Malaysian Households',
    chartType: 'bar',
    chartData: [
      { label: 'Overbuying', value: 42 },
      { label: 'Poor storage', value: 25 },
      { label: 'Expiry', value: 18 },
      { label: 'Over-cooking', value: 10 },
      { label: 'Other', value: 5 },
    ],
    unit: '% of respondents',
    prompt:
      'The bar chart shows the main causes of food waste in Malaysian households based on a survey. Describe the information and identify the most significant factors. You should write at least 150 words.',
  },
  {
    id: 't1-5',
    title: 'University Enrolment by Field of Study (2022)',
    chartType: 'bar',
    chartData: [
      { label: 'Engineering', value: 28 },
      { label: 'Business', value: 24 },
      { label: 'Sciences', value: 19 },
      { label: 'Arts', value: 14 },
      { label: 'Education', value: 10 },
      { label: 'Others', value: 5 },
    ],
    unit: '%',
    prompt:
      'The bar chart shows the percentage of university students enrolled in different fields of study in Malaysia in 2022. Describe the information shown and make comparisons where relevant. You should write at least 150 words.',
  },
  {
    id: 't1-6',
    title: 'Screen Time Trends Among Teenagers (Hours/Day)',
    chartType: 'line',
    chartData: [
      { label: '2018', value: 5.2 },
      { label: '2019', value: 5.8 },
      { label: '2020', value: 7.9 },
      { label: '2021', value: 8.4 },
      { label: '2022', value: 7.6 },
      { label: '2023', value: 7.0 },
    ],
    unit: 'hours/day',
    prompt:
      'The line graph shows the average daily screen time among teenagers from 2018 to 2023. Describe the trends shown and suggest possible reasons for any significant changes. You should write at least 150 words.',
  },
]

export const TASK2_PROMPTS: Task2Prompt[] = [
  {
    id: 't2-1',
    statement:
      '"Social media has done more harm than good to society." Do you agree? Support your answer with reasons and examples.',
  },
  {
    id: 't2-2',
    statement:
      '"Students today are too dependent on technology and have lost the ability to think critically." Discuss.',
  },
  {
    id: 't2-3',
    statement:
      '"The government should make public transport free for all citizens." Do you agree? Give reasons to support your view.',
  },
  {
    id: 't2-4',
    statement:
      '"Environmental conservation should take priority over economic development." To what extent do you agree with this statement?',
  },
  {
    id: 't2-5',
    statement:
      '"Working from home is more beneficial than working in the office." Discuss the advantages and disadvantages.',
  },
  {
    id: 't2-6',
    statement:
      '"Schools should focus more on developing soft skills such as communication and teamwork rather than academic knowledge." Do you agree?',
  },
  {
    id: 't2-7',
    statement:
      '"Celebrities and social media influencers have too much power over the opinions and behaviour of young people." Discuss.',
  },
  {
    id: 't2-8',
    statement:
      '"Investing in space exploration is a waste of money that should be spent solving problems on Earth." To what extent do you agree?',
  },
  {
    id: 't2-9',
    statement:
      '"The arts — music, drama and literature — should be compulsory subjects in secondary school." Discuss.',
  },
  {
    id: 't2-10',
    statement:
      '"Artificial intelligence will eventually replace most human jobs. Governments must act now to prepare the workforce." Do you agree?',
  },
  {
    id: 't2-11',
    statement:
      '"Parents, not schools, bear the greatest responsibility for the moral development of children." Discuss.',
  },
  {
    id: 't2-12',
    statement:
      '"Fast food culture is destroying the health of Malaysians. Stricter regulations on fast food advertising are needed." Do you agree?',
  },
]
