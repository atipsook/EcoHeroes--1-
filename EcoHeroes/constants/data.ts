import { DailyChallenge } from '../constants/types'

export const CHALLENGES: DailyChallenge[] = [
  {
    id: 'meatless-monday',
    dayOfWeek: 'Monday',
    title: 'Meatless Monday',
    description: 'Skip meat today and eat plant-based meals instead!',
    tips: [
      'Try veggie burgers or tofu stir-fry',
      'Make a delicious pasta with marinara sauce',
      'Enjoy a hearty bean soup',
    ],
    pointsValue: 100,
    icon: 'leaf',
    color: '#10B981',
  },
  {
    id: 'trash-free-tuesday',
    dayOfWeek: 'Tuesday',
    title: 'Trash-Free Tuesday',
    description: 'Recycle properly and pick up litter in your area!',
    tips: [
      'Sort recyclables into the correct bins',
      'Pick up 3 pieces of litter outside',
      'Say no to plastic bags',
    ],
    pointsValue: 100,
    icon: 'trash',
    color: '#3B82F6',
  },
  {
    id: 'water-wise-wednesday',
    dayOfWeek: 'Wednesday',
    title: 'Water-Wise Wednesday',
    description: 'Save water by taking shorter showers!',
    tips: [
      'Take a 5-minute shower',
      'Turn off water while brushing teeth',
      'Fix any leaky faucets',
    ],
    pointsValue: 100,
    icon: 'water',
    color: '#06B6D4',
  },
  {
    id: 'temperate-thursday',
    dayOfWeek: 'Thursday',
    title: 'Temperate Thursday',
    description: 'Lower your AC temperature and save energy!',
    tips: [
      'Set AC to 78°F or higher',
      'Use fans to cool down',
      'Close blinds to block sun',
    ],
    pointsValue: 100,
    icon: 'thermometer',
    color: '#F59E0B',
  },
  {
    id: 'footprint-free-friday',
    dayOfWeek: 'Friday',
    title: 'Footprint-Free Friday',
    description: 'Walk, bike, or use public transit instead of driving!',
    tips: [
      'Walk or bike to school',
      'Carpool with friends',
      'Take the bus or train',
    ],
    pointsValue: 100,
    icon: 'walk',
    color: '#8B5CF6',
  },
]

export const getTodayChallenge = (): DailyChallenge => {
  const day = new Date().getDay()
  const dayMap: { [key: number]: number } = {
    1: 0, // Monday
    2: 1, // Tuesday
    3: 2, // Wednesday
    4: 3, // Thursday
    5: 4, // Friday
  }
  const index = dayMap[day]
  return CHALLENGES[index !== undefined ? index : 0]
}

export const LESSONS = [
  {
    id: 'what-is-climate-change',
    category: 'climate' as const,
    title: 'What is Climate Change?',
    content: `Climate change is when the Earth's usual climate—the weather patterns over a long time—starts to change. It's like the Earth is getting warmer.

This happens because of something called the "greenhouse effect."

Our planet's atmosphere acts like a blanket, trapping heat to keep us warm. But when we add too many greenhouse gases through human activities, the blanket gets thicker, and Earth gets too warm.`,
    icon: 'globe',
    color: '#10B981',
  },
  {
    id: 'greenhouse-effect',
    category: 'greenhouse' as const,
    title: 'The Greenhouse Effect',
    content: `Picture a greenhouse where plants grow. Sunlight comes in through the glass, but some of it gets trapped inside, making it warmer.

Earth has a natural "blanket" of gases like carbon dioxide and methane.

When we use lots of cars and factories, we add more of these gases, making the Earth warmer—like a greenhouse. This extra warmth causes big changes to our planet's weather and ecosystems.`,
    icon: 'sunny',
    color: '#F59E0B',
  },
  {
    id: 'rising-seas',
    category: 'consequences' as const,
    title: 'Rising Seas',
    content: `Ice at the North and South Poles melts, causing sea levels to rise. This creates big problems for people and animals living near the water.

When the ocean gets warmer, water expands. Plus, melting ice from glaciers adds more water to the oceans.

Many coastal cities and island nations are at risk of flooding. Animals that live on the coast may lose their homes too!`,
    icon: 'water',
    color: '#3B82F6',
  },
  {
    id: 'extreme-weather',
    category: 'consequences' as const,
    title: 'Extreme Weather',
    content: `Strong storms, floods, and droughts increase, making it harder for plants, animals, and humans to survive and thrive.

Climate change makes extreme weather more common and more intense.

- Hurricanes become stronger
- droughts last longer
- floods happen more often

These changes affect our food, water, and safety.`,
    icon: 'thunderstorm',
    color: '#8B5CF6',
  },
  {
    id: 'ecosystem-collapse',
    category: 'consequences' as const,
    title: 'Ecosystem Collapse',
    content: `Food becomes harder to grow, and some animals may need to move to cooler places. If they can't find new homes, they might not survive.

When the climate changes too fast, animals and plants can't adapt quickly enough.

Some species might become extinct if they can't find new places to live or new food to eat.

We need to protect biodiversity to keep our planet healthy!`,
    icon: 'leaf',
    color: '#10B981',
  },
  {
    id: 'what-can-we-do',
    category: 'solutions' as const,
    title: 'What Can We Do?',
    content: `The good news is that we can all help! Here are some things you can do:

1. Save energy - Turn off lights when you leave a room
2. Save water - Take shorter showers
3. Reduce waste - Use reusable bags and bottles
4. Eat less meat - Try vegetarian meals
5. Walk or bike - Instead of driving
6. Plant trees - They absorb CO2

Every small action adds up to make a big difference!`,
    icon: 'heart',
    color: '#EF4444',
  },
]

export const BADGES = [
  {
    id: 'first-challenge',
    name: 'First Step',
    description: 'Complete your first challenge',
    icon: 'star',
    requirement: 'Complete 1 challenge',
  },
  {
    id: 'week-warrior',
    name: 'Week Warrior',
    description: 'Complete a full week of challenges',
    icon: 'calendar',
    requirement: 'Complete 5 challenges in one week',
  },
  {
    id: 'streak-7',
    name: '7 Day Streak',
    description: 'Complete challenges 7 days in a row',
    icon: 'flame',
    requirement: '7 day streak',
  },
  {
    id: 'eco-learner',
    name: 'Eco Learner',
    description: 'Read all educational articles',
    icon: 'book',
    requirement: 'Read all lessons',
  },
  {
    id: 'planet-hero',
    name: 'Planet Hero',
    description: 'Earn 1000 points',
    icon: 'trophy',
    requirement: 'Earn 1000 points',
  },
]

export const MOCK_LEADERBOARD = [
  { id: '1', username: 'EcoWarrior', avatarId: 1, points: 2500, streak: 15 },
  { id: '2', username: 'GreenDragon', avatarId: 2, points: 2200, streak: 12 },
  { id: '3', username: 'NatureLover', avatarId: 3, points: 1950, streak: 10 },
  { id: '4', username: 'ClimateHero', avatarId: 4, points: 1800, streak: 8 },
  { id: '5', username: 'EarthSaver', avatarId: 5, points: 1650, streak: 7 },
  { id: '6', username: 'OceanFriend', avatarId: 6, points: 1400, streak: 5 },
  { id: '7', username: 'ForestRanger', avatarId: 7, points: 1200, streak: 4 },
  { id: '8', username: 'SolarKid', avatarId: 8, points: 1000, streak: 3 },
  { id: '9', username: 'WindWalker', avatarId: 9, points: 850, streak: 2 },
  { id: '10', username: 'RecycleKing', avatarId: 10, points: 700, streak: 1 },
]
