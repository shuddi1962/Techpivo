// TechPivo Market — real category tree (CJDropshipping-aligned)
// Top-level departments + subcategories + leaf items, cleaned & deduped.
// Slugs are stable and used for affiliate_products.category_slug + CJ mapping.

export interface MarketLeaf {
  name: string
  slug: string
}

export interface MarketSub {
  name: string
  slug: string
  items: MarketLeaf[]
}

export interface MarketDepartment {
  name: string
  slug: string
  icon: string
  image: string
  subs: MarketSub[]
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)

const leaf = (names: string[]): MarketLeaf[] => {
  const seen = new Set<string>()
  const out: MarketLeaf[] = []
  for (const name of names) {
    const slug = slugify(name)
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    out.push({ name, slug })
  }
  return out
}

const px = (id: number, w = 800) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`

export const MARKET_DEPARTMENTS: MarketDepartment[] = [
  {
    name: "Consumer Electronics",
    slug: "consumer-electronics",
    icon: "Cpu",
    image: px(909907, 600),
    subs: [
      {
        name: "Smart Electronics",
        slug: "smart-electronics",
        items: leaf(["Wearable Devices", "Smart Home Appliances", "Smart Wearable Accessories", "Smart Wristbands", "Smart Watches", "Smart Remote Controls"]),
      },
      {
        name: "Camera & Photo",
        slug: "camera-photo",
        items: leaf(["Photo Studio", "Camera Drones", "Camera & Photo Accessories", "Digital Cameras", "Action Cameras", "Camcorders"]),
      },
      {
        name: "Accessories & Parts",
        slug: "accessories-parts",
        items: leaf(["Digital Cables", "Home Electronic Accessories", "Audio & Video Cables", "Charger", "Batteries", "Digital Gear Bags"]),
      },
      {
        name: "Video Games",
        slug: "video-games",
        items: leaf(["Gamepads", "Handheld Game Players", "Video Game Consoles", "Stickers", "Joysticks"]),
      },
      {
        name: "Home Audio & Video",
        slug: "home-audio-video",
        items: leaf(["Projectors", "Television", "TV Receivers", "Audio Amplifiers", "Projectors & Accessories", "TV Sticks"]),
      },
      {
        name: "Portable Audio & Video",
        slug: "portable-audio-video",
        items: leaf(["Microphones", "Speakers", "Earphones & Headphones", "VR & AR Devices", "MP3 Players"]),
      },
    ],
  },
  {
    name: "Phones & Accessories",
    slug: "phones-accessories",
    icon: "Smartphone",
    image: px(607812, 600),
    subs: [
      {
        name: "Mobile Phone Parts",
        slug: "mobile-phone-parts",
        items: leaf(["SIM Card & Tools", "Mobile Batteries", "Housings", "LCDs", "Flex Cables", "Touch Panel"]),
      },
      {
        name: "Mobile Phones",
        slug: "mobile-phones",
        items: leaf(["Quad Core", "Single SIM Card", "Dual SIM Card", "3GB RAM", "Octa Core", "5-inch Display"]),
      },
      {
        name: "Mobile Phone Accessories",
        slug: "mobile-phone-accessories",
        items: leaf([
          "Cables", "Power Bank", "Screen Protectors", "Lenses", "Holders & Stands", "Chargers",
          "Cases & Covers", "Huawei Cases", "Patterned Cases", "Cases For iPhone 6 & 6 Plus",
          "Wallet Cases", "Cases For iPhone 7 & 7 Plus", "Galaxy S8 Cases", "IPhone X Cases",
          "Galaxy S7 Cases", "Cases For iPhone 8 & 8 Plus", "Xiaomi Cases", "Silicone Cases",
          "Flip Cases", "Waterproof Cases", "Leather Cases",
        ]),
      },
    ],
  },
  {
    name: "Computer & Office",
    slug: "computer-office",
    icon: "Laptop",
    image: px(1108101, 600),
    subs: [
      {
        name: "Storage Devices",
        slug: "storage-devices",
        items: leaf(["SSD", "USB Flash Drives", "HDD Enclosures", "Memory Cards", "External Hard Drives"]),
      },
      {
        name: "Tablet & Laptop Accessories",
        slug: "tablet-laptop-accessories",
        items: leaf(["Tablet LCD Screens", "Laptop Batteries", "Laptop Bags & Cases", "Tablet Cases", "Tablet Accessories"]),
      },
      {
        name: "Security & Protection",
        slug: "security-protection",
        items: leaf(["Alarm & Sensor", "Fire Protection", "Workplace Safety Supplies", "Door Intercom", "Surveillance Products"]),
      },
      {
        name: "Laptops & Tablets",
        slug: "laptops-tablets",
        items: leaf(["Phone Call Tablets", "2 in 1 Tablets", "Laptops", "Tablets", "Gaming Laptops"]),
      },
      {
        name: "Office Electronics",
        slug: "office-electronics",
        items: leaf(["Office & School Supplies", "Computer Tablet Accessories", "Printer Supplies", "3D Printers", "3D Pens", "Printers", "Scanners"]),
      },
      {
        name: "Networking",
        slug: "networking",
        items: leaf(["Modem-Router Combos", "Wireless Routers", "Networking Tools", "3G Modems", "Network Cards"]),
      },
    ],
  },
  {
    name: "Automobiles & Motorcycles",
    slug: "automobiles-motorcycles",
    icon: "Car",
    image: px(150337, 600),
    subs: [
      {
        name: "Interior Accessories",
        slug: "interior-accessories",
        items: leaf(["Floor Mats", "Car Aromatherapy", "Car Perfume", "Key Case for Car", "Steering Covers", "Automobiles Seat Covers", "Stowing Tidying"]),
      },
      {
        name: "Motorcycle Accessories & Parts",
        slug: "motorcycle-accessories-parts",
        items: leaf(["Lighting", "Exhaust & Exhaust Systems", "Motor Brake System", "Motorcycle Seat Covers", "Other Motorcycle Accessories", "Helmet Headset", "Body & Frame"]),
      },
      {
        name: "Auto Replacement Parts",
        slug: "auto-replacement-parts",
        items: leaf(["Interior Parts", "Car Brake System", "Spark Plugs & Ignition System", "Automobiles Sensors", "Exterior Parts", "Other Replacement Parts", "Car Lights", "Windscreen Wipers & Windows"]),
      },
      {
        name: "Tools, Maintenance & Care",
        slug: "tools-maintenance-care",
        items: leaf(["Car Washer", "Diagnostic Tools", "Paint Care", "Other Maintenance Products"]),
      },
      {
        name: "Car Electronics",
        slug: "car-electronics",
        items: leaf(["Vehicle Camera", "DVR & Dash Camera", "Car Monitors", "Vehicle GPS", "Car Mirror Video", "Car Radios", "GPS Trackers", "Car Multimedia Player", "Alarm Systems & Security", "Jump Starter"]),
      },
      {
        name: "Exterior Accessories",
        slug: "exterior-accessories",
        items: leaf(["Car Stickers", "Other Exterior Accessories", "Car Covers"]),
      },
    ],
  },
  {
    name: "Home Improvement",
    slug: "home-improvement",
    icon: "Wrench",
    image: px(462024, 600),
    subs: [
      {
        name: "Outdoor Lighting",
        slug: "outdoor-lighting",
        items: leaf(["Flashlights & Torches", "Floodlights", "Underwater Lights", "String Lights", "Solar Lamps"]),
      },
      {
        name: "Home Appliances",
        slug: "home-appliances",
        items: leaf(["Personal Care Appliances", "Cleaning Appliances", "Air Conditioning Appliances", "Home Appliance Parts", "Kitchen Appliances"]),
      },
      {
        name: "Indoor Lighting",
        slug: "indoor-lighting",
        items: leaf(["Chandeliers", "Pendant Lights", "Downlights", "Night Lights", "Wall Lamps", "Ceiling Lights"]),
      },
      {
        name: "LED Lighting",
        slug: "led-lighting",
        items: leaf(["LED Spotlights"]),
      },
      {
        name: "Tools",
        slug: "tools",
        items: leaf([
          "Home Improvement Materials", "Measurement & Analysis", "Welding & Soldering Supplies",
          "Welding Equipment", "Hand Tools", "Tool Sets", "Tools Storage", "Machine Tools & Accessories",
          "Power Tools", "Woodworking Machinery", "Garden Tools",
        ]),
      },
    ],
  },
]

// Flat lookup: leaf slug -> department + sub metadata
export const LEAF_LOOKUP: Record<string, { department: string; departmentSlug: string; sub: string; subSlug: string; name: string }> = (() => {
  const map: Record<string, { department: string; departmentSlug: string; sub: string; subSlug: string; name: string }> = {}
  for (const d of MARKET_DEPARTMENTS) {
    for (const s of d.subs) {
      for (const item of s.items) {
        map[item.slug] = { department: d.name, departmentSlug: d.slug, sub: s.name, subSlug: s.slug, name: item.name }
      }
    }
  }
  return map
})()

export const MARKET_DEPARTMENT_COUNT = MARKET_DEPARTMENTS.length
export const MARKET_SUB_COUNT = MARKET_DEPARTMENTS.reduce((n, d) => n + d.subs.length, 0)
export const MARKET_LEAF_COUNT = MARKET_DEPARTMENTS.reduce(
  (n, d) => n + d.subs.reduce((m, s) => m + s.items.length, 0),
  0
)
