/**
 * Curated, high-resolution civic-tech visuals for UrbanPulse.
 * All URLs are verified live on Unsplash CDN and optimized for fast delivery (WebP/AVIF format, compressed).
 */

export const CIVIC_VISUALS = {
  // Main Landing Page Hero
  heroCityscape: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1800&q=85',
  heroCommunity: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80',
  
  // Auth Split-Screen
  authCivicSquare: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80',

  // Four Fixed Complaint Categories
  categories: {
    POTHOLES: {
      image: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
      badge: 'Roadways & Surfaces',
      tagline: 'Craters, road fissures, sunken manholes',
    },
    STREET_LIGHTS: {
      image: 'https://images.unsplash.com/photo-1604315523775-74cee3df116c?auto=format&fit=crop&w=800&q=80',
      badge: 'Public Lighting',
      tagline: 'Street lights, dark corridors, damaged poles',
    },
    GARBAGE: {
      image: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80',
      badge: 'Sanitation & Waste',
      tagline: 'Overflowing dumpsters, roadside debris, dumping',
    },
    DISASTERS: {
      image: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80',
      badge: 'Emergency Hazards',
      tagline: 'Urban flooding, waterlogged roads, disaster hazards',
    },
  },
} as const;
