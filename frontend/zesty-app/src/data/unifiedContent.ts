export type ExperienceMode = 'zesty' | 'eventra';

export const zestyContent = {
  nav: ['Delivery', 'Dining', 'Nightlife', 'Offers'],
  hero: {
    title: 'Taste the city\nwith Zesty',
    subtitle:
      'From street classics to chef specials, discover what to eat next in minutes.',
    ctaPrimary: 'Explore Restaurants',
    ctaSecondary: 'Track Your Order',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA6QtA4EE05XvCQSJo3vUy3JmlextZMRID77kFFM67y_dZvi3tljFU1uiv36NMOohVswrm1Hfsk6cT7ZRq7tlBOZqnTh96V4Okj0URNu-LPknIT04qC3E_Rru5Fu0c7Z-AGSJLyuIBjOgq3MOoPGImBU5zJW3SHIkUSMq5omJq34laTQCPuNQiYCaHfUp3MaJ7P6qSQiSsGjQwWBP2TomshpjJJaYYImDdIRPCt0F7_GlndQRRjugVoyNu81I0SLTnlHXphnHOfHA',
  },
  metrics: [
    { label: 'Restaurants', value: '300K+' },
    { label: 'Cities', value: '800+' },
    { label: 'Orders Delivered', value: '3B+' },
    { label: 'Avg. Delivery Time', value: '26m' },
  ],
  categories: [
    {
      title: 'Fast Delivery',
      description: 'Get your favorites delivered in under 30 minutes.',
      image:
        'https://images.unsplash.com/photo-1565299585323-38174c4a6ac5?auto=format&fit=crop&w=900&q=80',
    },
    {
      title: 'Top-Rated Dining',
      description: 'Book premium tables at city-loved venues.',
      image:
        'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=900&q=80',
    },
    {
      title: 'Late Night Cravings',
      description: 'Midnight menus from your nearby hot spots.',
      image:
        'https://images.unsplash.com/photo-1526318896980-cf78c088247c?auto=format&fit=crop&w=900&q=80',
    },
    {
      title: 'Healthy Bowls',
      description: 'Fresh, balanced meals crafted by nutrition experts.',
      image:
        'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80',
    },
    {
      title: 'Sweet Treats',
      description: 'Dessert drops from patisseries and cloud kitchens.',
      image:
        'https://images.unsplash.com/photo-1481391319762-47dff72954d9?auto=format&fit=crop&w=900&q=80',
    },
    {
      title: 'Party Platters',
      description: 'Bulk ordering made simple for celebrations.',
      image:
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80',
    },
  ],
  collections: [
    {
      title: 'Chef Curated Week',
      places: 18,
      image:
        'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
    },
    {
      title: 'Rooftop Date Nights',
      places: 12,
      image:
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80',
    },
    {
      title: 'Budget Heroes',
      places: 35,
      image:
        'https://images.unsplash.com/photo-1576402187878-974f70c890a5?auto=format&fit=crop&w=900&q=80',
    },
    {
      title: 'Brunch Stories',
      places: 21,
      image:
        'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=900&q=80',
    },
  ],
  features: [
    {
      icon: 'local_shipping',
      title: 'Live Delivery Radar',
      description: 'Know exactly where your order is with minute-level ETA updates.',
    },
    {
      icon: 'loyalty',
      title: 'Zesty Gold',
      description: 'Unlock lower delivery fees and member-only offers every day.',
    },
    {
      icon: 'restaurant_menu',
      title: 'Smart Taste AI',
      description: 'Personalized recommendations that learn your preferences.',
    },
  ],
  appPromo: {
    title: 'Get the Zesty app',
    description:
      'Scan the QR or send a quick link to your phone for instant access to your next meal.',
  },
};

export type TicketTier = {
  id: 'north' | 'grand' | 'vip';
  name: string;
  subtitle: string;
  price: number;
  perks: string[];
  tag?: string;
};

export const eventraContent = {
  nav: ['For You', 'Events', 'Movies', 'Sports', 'Experiences'],
  city: 'New Delhi',
  featuredMatches: [
    {
      code: 'Match 14',
      date: 'Mar 28 • 19:30',
      teams: ['Mumbai', 'Bengaluru'],
      price: 999,
      status: 'Book Now',
    },
    {
      code: 'Match 17',
      date: 'Mar 30 • 19:30',
      teams: ['Chennai', 'Gujarat'],
      price: 1200,
      status: 'Book Now',
    },
    {
      code: 'Match 21',
      date: 'Apr 02 • 15:30',
      teams: ['Delhi', 'Hyderabad'],
      price: 850,
      status: 'Few Seats Left',
    },
  ],
  movies: [
    {
      title: 'Dhurandhar: The Revenge',
      meta: 'Action • UA • 2h 45m',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAYKUuo09Hm_B8mK5Q96BTF9akFewOCjs1-h-OSC6Zl-CX9rthxZ_bD5RSFZakbmRxjYm1FMy9JQ00pVAVAmKjgGj8FVwybUqw_IbL2n2ylXpLKUPKpWeeI2YJRqS1St4c2lDkOjH5dXPS8XsZYSsg0iZhjxkjyb3U4s6iQlIVqFeZqfLW-yQo_VASy2KEtNdtBwoIv00hRe2QYShsyH7M1fvOWg42jC8xnw-faBPIRvMTIOtOcRl2nKzx86AtgQMjJucnw0ZBznw',
    },
    {
      title: 'Zootopia 2',
      meta: 'Animation • U • 1h 52m',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBsXrFL2YoIhunLapQ4PpIrwI-K_F07vleSbX9QjnIEYUQ5qYvqNH-efuJcQdK84_X2JGAt9jyZCMHapaVchhojvjuQ1CiTkWve_HrF5qDq1Y22hpQj8LXsxOyDYATxokfTTo5y2A9C1S5lWR2vZWQffm_Azkq0dI5fEG_4A5SYfDxvwXjiy7gvq6me6FFqi5aNt3WOWj_7Utfgbo8NbdgwXenuWj3CqvYntBsIBaWaOuKNuO_0xAHvi670OnTR6G9sWDpUc5Bb9Q',
    },
    {
      title: 'Voyage Beyond',
      meta: 'Sci-Fi • UA • 2h 10m',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuChM2T23s3n46WCGjpvqdUTgKX3FseVOkMPF4ntqWL6cFNF2CpqSFve1qj8BvgOd3Tg0xomckQh5bYDxVP1kk8O_i0p7Xrsls9oahIz-TCSqUOz66JqW-OvF7f6FsUSWNSl2PzgSMelSNpobyh7pJdgHsekpROhKJlzG2YjiRCqXW-H7NB0n4xLzxjzwi35uM8iBPkdlor7HImSFTOdogPl2P1ZAoh7xi71rLNNMJKX6jnjyRS9nxd_PwWl6lQmmA_pyYP9VPssNQ',
    },
    {
      title: 'Midnight Shadows',
      meta: 'Thriller • UA • 1h 55m',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCPuWOEj9SObFhRgkA_HqGBhCGo9XfsSCp0jp1ai5HFqgYl1fIPcvyzxiANFa9LfkbzZNR8HiCBKSGkYt0G5ZuLBRqsK-__E79VHr7er06RzXISvB-hFG9NP-D3-Cqd6_6d3tzjXvb5a-aOb45ZURXTQoSbol-QwSov-k5GP-5UAdeUQ7asYyMsc4CVzBJN2xK8YGKSXjiJtONP-gwFp-4FkNLLZJkYrdvc278QRdTrjAhiWBj5dER822yDtJvtm5wOgOq1rnAqlQ',
    },
  ],
  experiences: [
    {
      title: 'Go Karting',
      price: 599,
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBJFf4nnbIqHJlkKIXEKfvDecAiX1xPRELtKuZQp0B4Gtj_R0At-ul7o6KTLgufz3J0rH3MhBZZxD1fWjPb4vgzZznvWUdUXBt5FaPQ8lrK7IDTsMjM9b_W3BaGUUKnd1-cEwc5E0hgePoOgYmPIHR-WL4Ywej-8OaslNjNFtlYEBAzamN5st7USUY2bJZ5oqz8gb4wZHD45FuI8M5WA4sMZopUUbgjpAwv19YG3Afu0zmpAlhksxIBUH4QQeMaof5FGcilKmsqqg',
    },
    {
      title: 'Water Park',
      price: 1199,
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCZXqvQewR1PDHSb9fAj5y5c34LjMIy9XBPNrcbRKDQ3Qyro5n2kPwaCnpxt10c0Enzt_zHUEKFrmjbxEWCyWLMZFhTCjdAIJFBmx5Z0H6gw_xcgiD0gb2CaH2cgWCGD4X3FZ-pq8QeIW8faEjivHqjPhKtGw7RpMqhGuHFgJTqJO8Xl13nm1JbsOloHb6DdFLQusDmcH2NNm8IwAmsby0mQDnm7Q7MDGWsP1e1dCa-qRF3tmGTiGqgHVNYcOr89_zdr74RS-FUlA',
    },
    {
      title: 'Bounce Arena',
      price: 399,
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuC6zFwnkZ-QcJc-_S-JSMLzoJoKKVDT4-G65Vwa7Rwo_msJS9RQzGDBdqxauEq6HtX0w_4X138OakNr7DZGXwTVQAv3AsUfTv_dh-sFae4wUM78wgEzeOR1qbftG6Ej2T_0HeVsTkRpCQD-6OQDdUWg39vajp35ahqwVQrP0sui39K9DypAQVc_S4z1AOsrcM8uCOSDK0KfLSoS9M2_QO6i48aaaRKCU5alLLc2609E1XVB1sbPN183eTU0c77x89YePQdmdwl46g',
    },
    {
      title: 'Laser Tag',
      price: 450,
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDHbM9qWQ25zqbSd6u0OwPoLGCGo0VZv0AyCZ7zrlsAsq6Mky5iLXxklGRQdz5yUloH_lGhBLhOGUcvs0ZzedWgrXXfjvQ2OLuEXEHq4_QrewSR8AlZEGXLnnPaNp3ws1sY2XHbmtOmx7OZd92uEDCYb82eJ3wNKJ39yLGl-04v-WVB_Zod-6NZUJAWP0MGUcG6cZEXWxX7pLFsK9VJHWmFnx0D81d9gKM2Uix8NuOjSpTh0Jmx2W40TV414q1mvadMvtKTGomMJQ',
    },
  ],
  ticketTiers: [
    {
      id: 'north',
      name: 'North Stand',
      subtitle: 'Standard Entry',
      price: 850,
      perks: ['Unreserved Seating', 'Food Court Access'],
    },
    {
      id: 'grand',
      name: 'Grand Pavilion',
      subtitle: 'Premium View',
      price: 2450,
      perks: ['Cushioned Seats', 'Priority Entry Lane'],
      tag: 'Most Popular',
    },
    {
      id: 'vip',
      name: 'VIP Lounge',
      subtitle: 'Ultra Luxury',
      price: 7999,
      perks: ['Unlimited Buffet and Drinks', 'Meet and Greet Opportunity'],
    },
  ] as TicketTier[],
};

export const formatINR = (amount: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
