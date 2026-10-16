// Built-in subscription service catalog.
// Every entry is bundled locally; no network access is required. Logos are
// original lettermark SVGs generated into public/logos/<logoKey>.svg.

export const CATEGORY_NAMES = [
  'Video & Streaming',
  'Music & Audio',
  'Productivity & Collaboration',
  'Developer & Creative',
  'Gaming',
  'Shopping & Memberships',
  'Cloud, Storage & Security',
  'Fitness, Health & Learning',
  'News & Reading',
  'Other',
];

// Compact table form:
// [key, name, category, color, plans[], mark, keywords[]]
const RAW_CATALOG = [
  // Video & Streaming
  ['netflix', 'Netflix', 'Video & Streaming', '#E50914', ['Basic', 'Standard', 'Premium'], 'N', ['streaming', 'movies', 'tv']],
  ['youtube-premium', 'YouTube Premium', 'Video & Streaming', '#FF0000', ['Individual', 'Family'], 'YT', ['google', 'video', 'music']],
  ['disney-plus', 'Disney+', 'Video & Streaming', '#113CCF', ['Monthly', 'Annual'], 'D+', ['disney', 'streaming']],
  ['hulu', 'Hulu', 'Video & Streaming', '#1CE783', ['With Ads', 'No Ads'], 'H', ['streaming', 'tv']],
  ['max', 'Max', 'Video & Streaming', '#0046FF', ['With Ads', 'Ad-Free'], 'M', ['hbo', 'streaming']],
  ['prime-video', 'Prime Video', 'Video & Streaming', '#00A8E1', ['Monthly'], 'PV', ['amazon', 'video']],
  ['apple-tv-plus', 'Apple TV+', 'Video & Streaming', '#000000', ['Monthly', 'Annual'], 'TV', ['apple', 'streaming']],
  ['peacock', 'Peacock', 'Video & Streaming', '#FF7B00', ['Premium', 'Premium Plus'], 'P', ['nbc', 'streaming']],
  ['paramount-plus', 'Paramount+', 'Video & Streaming', '#0064FF', ['Essential', 'Showtime'], 'P+', ['streaming']],
  ['crunchyroll', 'Crunchyroll', 'Video & Streaming', '#F47521', ['Fan', 'Mega Fan'], 'CR', ['anime', 'streaming']],

  // Music & Audio
  ['spotify', 'Spotify', 'Music & Audio', '#1DB954', ['Individual', 'Duo', 'Family'], 'S', ['music', 'podcasts']],
  ['apple-music', 'Apple Music', 'Music & Audio', '#FA243C', ['Individual', 'Family'], 'AM', ['apple', 'music']],
  ['youtube-music', 'YouTube Music', 'Music & Audio', '#FF0000', ['Individual', 'Family'], 'YM', ['google', 'music']],
  ['amazon-music', 'Amazon Music', 'Music & Audio', '#25D1DA', ['Unlimited Individual', 'Unlimited Family'], 'Mu', ['amazon', 'music']],
  ['tidal', 'Tidal', 'Music & Audio', '#000000', ['HiFi', 'HiFi Plus'], 'T', ['music', 'hifi']],
  ['deezer', 'Deezer', 'Music & Audio', '#A238FF', ['Premium', 'Family'], 'Dz', ['music']],
  ['audible', 'Audible', 'Music & Audio', '#F8991C', ['Plus', 'Premium Plus'], 'Au', ['audiobooks', 'amazon']],
  ['soundcloud', 'SoundCloud', 'Music & Audio', '#FF5500', ['Go', 'Go+'], 'Sc', ['music']],

  // Productivity & Collaboration
  ['microsoft-365', 'Microsoft 365', 'Productivity & Collaboration', '#D83B01', ['Personal', 'Family'], 'MS', ['office', 'word', 'excel']],
  ['google-one', 'Google One', 'Productivity & Collaboration', '#4285F4', ['100 GB', '200 GB', '2 TB'], 'G1', ['storage', 'google', 'drive']],
  ['google-workspace', 'Google Workspace', 'Productivity & Collaboration', '#4285F4', ['Business Starter', 'Business Standard'], 'GW', ['gmail', 'docs', 'google']],
  ['notion', 'Notion', 'Productivity & Collaboration', '#000000', ['Plus', 'Business'], 'No', ['notes', 'wiki']],
  ['slack', 'Slack', 'Productivity & Collaboration', '#4A154B', ['Pro', 'Business+'], 'Sl', ['chat', 'team']],
  ['zoom', 'Zoom', 'Productivity & Collaboration', '#2D8CFF', ['Pro', 'Business'], 'Z', ['meetings', 'video']],
  ['dropbox', 'Dropbox', 'Productivity & Collaboration', '#0061FF', ['Plus', 'Professional'], 'Db', ['storage', 'files']],
  ['evernote', 'Evernote', 'Productivity & Collaboration', '#00A82D', ['Personal', 'Professional'], 'E', ['notes']],
  ['todoist', 'Todoist', 'Productivity & Collaboration', '#E44332', ['Pro', 'Business'], 'Td', ['tasks', 'todo']],
  ['trello', 'Trello', 'Productivity & Collaboration', '#0079BF', ['Standard', 'Premium'], 'Tr', ['kanban', 'tasks']],
  ['asana', 'Asana', 'Productivity & Collaboration', '#F06A6A', ['Starter', 'Advanced'], 'As', ['tasks', 'projects']],

  // Developer & Creative
  ['github-copilot', 'GitHub Copilot', 'Developer & Creative', '#181717', ['Individual', 'Business'], 'Co', ['ai', 'code', 'developer']],
  ['github-pro', 'GitHub Pro', 'Developer & Creative', '#181717', ['Pro'], 'GH', ['git', 'code', 'developer']],
  ['jetbrains', 'JetBrains', 'Developer & Creative', '#000000', ['Individual', 'All Products Pack'], 'JB', ['ide', 'developer']],
  ['cursor', 'Cursor', 'Developer & Creative', '#000000', ['Pro', 'Business'], 'Cu', ['ai', 'editor', 'developer']],
  ['vercel', 'Vercel', 'Developer & Creative', '#000000', ['Pro', 'Team'], 'Ve', ['hosting', 'developer']],
  ['figma', 'Figma', 'Developer & Creative', '#F24E1E', ['Professional', 'Organization'], 'F', ['design']],
  ['canva', 'Canva', 'Developer & Creative', '#00C4CC', ['Pro', 'Teams'], 'Ca', ['design']],
  ['adobe-creative-cloud', 'Adobe Creative Cloud', 'Developer & Creative', '#DA1F26', ['Single App', 'All Apps'], 'Ac', ['photoshop', 'design']],

  // Gaming
  ['xbox-game-pass', 'Xbox Game Pass', 'Gaming', '#107C10', ['Ultimate', 'PC'], 'Xb', ['microsoft', 'games']],
  ['playstation-plus', 'PlayStation Plus', 'Gaming', '#0070D1', ['Essential', 'Extra', 'Premium'], 'PS', ['sony', 'games']],
  ['nintendo-switch-online', 'Nintendo Switch Online', 'Gaming', '#E60012', ['Individual', 'Family'], 'NS', ['games']],
  ['ea-play', 'EA Play', 'Gaming', '#FF4747', ['Monthly', 'Annual'], 'EA', ['games']],
  ['roblox-premium', 'Roblox Premium', 'Gaming', '#E2231A', ['450', '1000', '2200'], 'Rb', ['games']],

  // Shopping & Memberships
  ['amazon-prime', 'Amazon Prime', 'Shopping & Memberships', '#FF9900', ['Monthly', 'Annual'], 'AP', ['shopping', 'delivery']],
  ['walmart-plus', 'Walmart+', 'Shopping & Memberships', '#0071CE', ['Monthly', 'Annual'], 'W+', ['shopping', 'delivery']],
  ['costco', 'Costco', 'Shopping & Memberships', '#005DAA', ['Gold Star', 'Executive'], 'Co', ['warehouse', 'shopping']],
  ['shopify', 'Shopify', 'Shopping & Memberships', '#7AB55C', ['Basic', 'Grow', 'Advanced'], 'Sh', ['ecommerce', 'store']],
  ['instacart-plus', 'Instacart+', 'Shopping & Memberships', '#43B02A', ['Monthly', 'Annual'], 'In', ['grocery', 'delivery']],
  ['doordash-dashpass', 'DoorDash DashPass', 'Shopping & Memberships', '#FF3008', ['Monthly', 'Annual'], 'DD', ['food', 'delivery']],
  ['uber-one', 'Uber One', 'Shopping & Memberships', '#000000', ['Monthly', 'Annual'], 'U1', ['rides', 'delivery']],

  // Cloud, Storage & Security
  ['icloud-plus', 'iCloud+', 'Cloud, Storage & Security', '#3693F3', ['50 GB', '200 GB', '2 TB'], 'i+', ['apple', 'storage']],
  ['onedrive', 'OneDrive', 'Cloud, Storage & Security', '#0364B8', ['100 GB', '1 TB'], 'OD', ['microsoft', 'storage']],
  ['proton', 'Proton', 'Cloud, Storage & Security', '#6D4AFF', ['Mail Plus', 'Unlimited', 'VPN Plus'], 'Pr', ['email', 'vpn', 'privacy']],
  ['nordvpn', 'NordVPN', 'Cloud, Storage & Security', '#4687FF', ['Basic', 'Plus', 'Complete'], 'NV', ['vpn', 'privacy']],
  ['1password', '1Password', 'Cloud, Storage & Security', '#1A8CFF', ['Individual', 'Families'], '1P', ['passwords', 'security']],
  ['dashlane', 'Dashlane', 'Cloud, Storage & Security', '#0E353D', ['Premium', 'Friends & Family'], 'Da', ['passwords', 'security']],

  // Fitness, Health & Learning
  ['peloton', 'Peloton', 'Fitness, Health & Learning', '#DF1C2F', ['App One', 'App+'], 'Pe', ['fitness', 'workout']],
  ['strava', 'Strava', 'Fitness, Health & Learning', '#FC4C02', ['Subscriber'], 'St', ['fitness', 'running']],
  ['headspace', 'Headspace', 'Fitness, Health & Learning', '#F47D31', ['Monthly', 'Annual'], 'He', ['meditation', 'health']],
  ['calm', 'Calm', 'Fitness, Health & Learning', '#2A6DF4', ['Monthly', 'Annual'], 'Ca', ['meditation', 'sleep']],
  ['duolingo-super', 'Duolingo Super', 'Fitness, Health & Learning', '#58CC02', ['Super', 'Super Family'], 'Du', ['language', 'learning']],
  ['coursera-plus', 'Coursera Plus', 'Fitness, Health & Learning', '#0056D2', ['Monthly', 'Annual'], 'C+', ['learning', 'courses']],
  ['skillshare', 'Skillshare', 'Fitness, Health & Learning', '#00FF84', ['Monthly', 'Annual'], 'Sk', ['learning', 'courses']],
  ['masterclass', 'MasterClass', 'Fitness, Health & Learning', '#E10600', ['Individual', 'Duo', 'Family'], 'Ma', ['learning', 'courses']],

  // News & Reading
  ['nyt', 'The New York Times', 'News & Reading', '#000000', ['Basic', 'All Access'], 'NY', ['news', 'times']],
  ['washington-post', 'The Washington Post', 'News & Reading', '#111111', ['Digital', 'Digital+Print'], 'WP', ['news']],
  ['economist', 'The Economist', 'News & Reading', '#E3120B', ['Digital', 'Digital+Print'], 'Ec', ['news']],
  ['kindle-unlimited', 'Kindle Unlimited', 'News & Reading', '#FF9900', ['Monthly', 'Annual'], 'KU', ['books', 'amazon']],
  ['medium', 'Medium', 'News & Reading', '#000000', ['Monthly', 'Annual'], 'Me', ['reading', 'articles']],
];

export const CATALOG = RAW_CATALOG.map(([key, name, category, color, plans, mark, keywords]) => ({
  key,
  name,
  category,
  color,
  plans,
  mark,
  keywords,
  logoKey: key,
}));

const BY_KEY = new Map(CATALOG.map((entry) => [entry.key, entry]));

export function getCatalogEntry(serviceKey) {
  if (!serviceKey) return null;
  return BY_KEY.get(serviceKey) || null;
}

export function catalogSearch(term) {
  if (!term) return CATALOG;
  const needle = String(term).trim().toLowerCase();
  if (!needle) return CATALOG;
  return CATALOG.filter((entry) => {
    return (
      entry.name.toLowerCase().includes(needle) ||
      entry.key.includes(needle) ||
      entry.category.toLowerCase().includes(needle) ||
      entry.keywords.some((word) => word.includes(needle))
    );
  });
}
