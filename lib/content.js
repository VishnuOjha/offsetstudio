// Everything text-based lives here. Rename the studio, swap cases,
// and edit copy without touching components.

export const studio = {
  name: 'Offset',
  wordmark: ['OFF', 'SET'], // the hero splits the name across two lines
  founded: "'19",
  city: 'Ahmedabad',
  timezone: 'Asia/Kolkata',
  email: 'hello@offset.studio',
  badge: 'offset studio ✺ design & motion ✺ ',
  statement:
    'We are a small design and development studio. We build brand systems, websites and motion that feel printed by hand and run like software. Strategy, design and code sit at the same table, so nothing gets lost between them.',
};

export const nav = [
  { label: 'Work', href: '#work' },
  { label: 'Studio', href: '#studio' },
  { label: 'Recognition', href: '#recognition' },
  { label: 'Contact', href: '#contact' },
];

// Each service line is a list of words. style: 'sans' | 'serif' | 'outline'
export const services = [
  [['Art', 'sans'], ['direction', 'serif'], ['&', 'outline'], ['branding', 'sans']],
  [['Web', 'serif'], ['design', 'sans'], ['for', 'outline'], ['screens', 'serif']],
  [['Motion', 'sans'], ['&', 'outline'], ['3D', 'serif'], ['content', 'sans']],
  [['Creative', 'serif'], ['front-end', 'sans']],
  [['Back-end', 'sans'], ['engineering', 'serif']],
];

export const cases = [
  { title: 'Northbound Capital', kind: 'Website for an early-stage fund', year: '2026', img: '/work/case-1.jpg', href: '#' },
  { title: 'Saffron Rail', kind: 'Booking app for heritage train journeys', year: '2026', img: '/work/case-2.jpg', href: '#' },
  { title: 'Moth & Lantern', kind: 'Identity and shop for a candle maker', year: '2025', img: '/work/case-3.jpg', href: '#' },
  { title: 'Kora Textiles', kind: 'Catalogue site for a handloom label', year: '2025', img: '/work/case-4.jpg', href: '#' },
  { title: 'Pulse Records', kind: 'Label site with a live audio player', year: '2025', img: '/work/case-5.jpg', href: '#' },
  { title: 'Field Notes', kind: 'Portfolio for a documentary photographer', year: '2024', img: '/work/case-6.jpg', href: '#' },
  { title: 'Tidewater', kind: 'Campaign microsite for a surf brand', year: '2024', img: '/work/case-7.jpg', href: '#' },
  { title: 'Archive', kind: 'Experiments, side projects and sketches', year: '2019–26', img: '/work/case-8.jpg', href: '#' },
];

// Placeholder numbers — replace with your real recognitions.
export const awards = [
  { org: 'Awwwards', items: [['Site of the day', 12], ['Developer award', 11], ['Mobile excellence', 7], ['Honorable mention', 18]] },
  { org: 'CSS Design Awards', items: [['Website of the day', 6], ['UI / UX award', 5]] },
  { org: 'Behance', items: [['Featured gallery', 4], ['Interaction', 3]] },
];

export const socials = [
  { label: 'Instagram', href: '#' },
  { label: 'Behance', href: '#' },
  { label: 'Dribbble', href: '#' },
  { label: 'LinkedIn', href: '#' },
  { label: 'X', href: '#' },
];
