export interface Bar {
  id: string;
  name: string;
  distance: number; // in meters
  rating: number;
  type: string;
}

// Generate mock bars with random distances
export const generateMockBars = (): Bar[] => {
  const barData = [
    { name: "The Rusty Nail", type: "Dive Bar" },
    { name: "Velvet Lounge", type: "Cocktail Bar" },
    { name: "The Hoppy Monk", type: "Craft Beer" },
    { name: "Midnight Sun", type: "Wine Bar" },
    { name: "The Golden Tap", type: "Sports Bar" },
    { name: "Luna's Cantina", type: "Tequila Bar" },
    { name: "The Whiskey Den", type: "Whiskey Bar" },
    { name: "Neon Dreams", type: "Nightclub" },
  ];

  return barData
    .map((bar, index) => ({
      id: `bar-${index}`,
      name: bar.name,
      type: bar.type,
      distance: Math.floor(Math.random() * 1500) + 100, // 100m to 1600m
      rating: Number((Math.random() * 1.5 + 3.5).toFixed(1)), // 3.5 to 5.0
    }))
    .sort((a, b) => a.distance - b.distance);
};
