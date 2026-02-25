// ============================================================
// Event Page Builder Types (Phase 2B)
// ============================================================

export type PageType = "home" | "info" | "network_guide" | "faq" | "custom";
export type ThemeKey = "light-classic" | "dark-modern" | "warm-elegant";

export type BlockType =
  | "hero"
  | "rich-text"
  | "image"
  | "gallery"
  | "video"
  | "stats"
  | "faq"
  | "cta"
  | "divider"
  | "sponsor"
  | "exhibitor-directory"
  | "featured-sponsor"
  | "sponsor-banner";

// Content blocks stored in event_pages.content JSONB
export interface BaseBlock {
  id: string;
  type: BlockType;
}

export interface HeroBlock extends BaseBlock {
  type: "hero";
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  backgroundUrl?: string;
  overlay?: "none" | "light" | "dark" | "gradient";
  alignment?: "left" | "center";
}

export interface StatsBlock extends BaseBlock {
  type: "stats";
  title?: string;
  showParticipants?: boolean;
  showMeetings?: boolean;
  showCountries?: boolean;
  showMessages?: boolean;
}

export interface RichTextBlock extends BaseBlock {
  type: "rich-text";
  content: string; // HTML string from editor
  contentRight?: string; // HTML for second column (when layout is "two-column")
  alignment?: "left" | "center" | "right";
  layout?: "single" | "two-column";
  background?: "none" | "surface" | "accent";
  ctaEnabled?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
  ctaStyle?: "primary" | "secondary" | "outline";
}

export interface ImageBlock extends BaseBlock {
  type: "image";
  url: string;
  alt: string;
  caption?: string;
}

export interface GalleryBlock extends BaseBlock {
  type: "gallery";
  images: { url: string; alt: string; caption?: string }[];
  columns?: 2 | 3 | 4;
}

export interface VideoBlock extends BaseBlock {
  type: "video";
  url: string; // YouTube or Vimeo URL
  title?: string;
}

export interface FaqBlock extends BaseBlock {
  type: "faq";
  items: { question: string; answer: string }[];
}

export interface CtaBlock extends BaseBlock {
  type: "cta";
  label: string;
  href: string;
  style: "primary" | "secondary" | "outline";
}

export interface DividerBlock extends BaseBlock {
  type: "divider";
}

export interface SponsorBlock extends BaseBlock {
  type: "sponsor";
  title?: string;
  tierFilter?: string[]; // Show only specific tier IDs, empty = all
  logoSize?: "sm" | "md" | "lg";
  layout?: "grid" | "row" | "carousel";
}

export interface ExhibitorDirectoryBlock extends BaseBlock {
  type: "exhibitor-directory";
  title?: string;
  showSearch?: boolean;
  showCategoryFilter?: boolean;
  columns?: 2 | 3 | 4;
}

export interface FeaturedSponsorBlock extends BaseBlock {
  type: "featured-sponsor";
  companyId?: string; // Specific company to feature
}

export interface SponsorBannerBlock extends BaseBlock {
  type: "sponsor-banner";
  tierFilter?: string[]; // Tiers to rotate banners from
}

export type ContentBlock =
  | HeroBlock
  | RichTextBlock
  | ImageBlock
  | GalleryBlock
  | VideoBlock
  | StatsBlock
  | FaqBlock
  | CtaBlock
  | DividerBlock
  | SponsorBlock
  | ExhibitorDirectoryBlock
  | FeaturedSponsorBlock
  | SponsorBannerBlock;

// Database row types
export interface EventPage {
  id: string;
  event_id: string;
  slug: string;
  title: string;
  page_type: PageType;
  is_default: boolean;
  is_visible: boolean;
  sort_order: number;
  content: ContentBlock[];
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventTheme {
  id: string;
  event_id: string;
  theme_key: ThemeKey;
  accent_color: string | null;
  custom_settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Theme definitions
export interface ThemeDefinition {
  key: ThemeKey;
  name: string;
  description: string;
  preview: {
    bg: string;
    text: string;
    accent: string;
    surface: string;
  };
  variables: Record<string, string>;
}

export const THEMES: ThemeDefinition[] = [
  {
    key: "light-classic",
    name: "Light Classic",
    description: "Clean and professional. White background, dark text.",
    preview: { bg: "#FFFFFF", text: "#1D1D1F", accent: "#0071E3", surface: "#F5F5F7" },
    variables: {
      "--page-bg": "#FFFFFF",
      "--page-surface": "#F5F5F7",
      "--page-text": "#1D1D1F",
      "--page-text-secondary": "#6E6E73",
      "--page-accent": "#0071E3",
      "--page-border": "rgba(0,0,0,0.06)",
      "--page-font-heading": "'SF Pro Display', -apple-system, sans-serif",
      "--page-font-body": "'SF Pro Text', -apple-system, sans-serif",
      "--page-radius": "14px",
    },
  },
  {
    key: "dark-modern",
    name: "Dark Modern",
    description: "Sleek and tech-forward. Dark background, light text.",
    preview: { bg: "#0A0A0F", text: "#F5F5F7", accent: "#3B82F6", surface: "#1A1A2E" },
    variables: {
      "--page-bg": "#0A0A0F",
      "--page-surface": "#1A1A2E",
      "--page-text": "#F5F5F7",
      "--page-text-secondary": "#9CA3AF",
      "--page-accent": "#3B82F6",
      "--page-border": "rgba(255,255,255,0.08)",
      "--page-font-heading": "'SF Pro Display', -apple-system, sans-serif",
      "--page-font-body": "'SF Pro Text', -apple-system, sans-serif",
      "--page-radius": "14px",
    },
  },
  {
    key: "warm-elegant",
    name: "Warm Elegant",
    description: "Premium conference feel. Warm neutrals, serif accents.",
    preview: { bg: "#FAF8F5", text: "#2D2A26", accent: "#B8860B", surface: "#F0ECE4" },
    variables: {
      "--page-bg": "#FAF8F5",
      "--page-surface": "#F0ECE4",
      "--page-text": "#2D2A26",
      "--page-text-secondary": "#7A7570",
      "--page-accent": "#B8860B",
      "--page-border": "rgba(0,0,0,0.06)",
      "--page-font-heading": "Georgia, 'Times New Roman', serif",
      "--page-font-body": "'SF Pro Text', -apple-system, sans-serif",
      "--page-radius": "8px",
    },
  },
];

// Default pages seeded on event creation
export const DEFAULT_BANNER_URL = "https://eemeremqmqsqsxioycka.supabase.co/storage/v1/object/public/event-media/defaults/banner.jpg";
export const DEFAULT_HERO_URL = "https://eemeremqmqsqsxioycka.supabase.co/storage/v1/object/public/event-media/defaults/hero.jpg";
export const DEFAULT_BANNER_LAYOUT = "split";
export const DEFAULT_BANNER_SETTINGS = { blur: 4, bgOpacity: 100 };

/**
 * Returns default pages with the event name injected into template content.
 * Used when seeding pages for a new event.
 */
export function getDefaultPages(eventName: string): Omit<EventPage, "id" | "event_id" | "created_at" | "updated_at">[] {
  return [
    {
      slug: "home",
      title: "Home",
      page_type: "home",
      is_default: true,
      is_visible: true,
      sort_order: 0,
      content: [
        {
          id: "home-welcome",
          type: "rich-text",
          content: `<h2 style="text-align: left;"><strong>Welcome to ${eventName}!</strong></h2><p style="text-align: left;"></p><p style="text-align: left;">We're excited to bring together thought leaders, innovators, and enthusiasts for days of inspiring keynote talks, panel discussions, and networking opportunities.</p><p style="text-align: left;"></p><p style="text-align: left;">This year's event will be packed with experts who will share their insights and knowledge on the latest trends and developments.</p><p style="text-align: left;"></p><p style="text-align: left;">Whether you're looking to find new partners, explore business opportunities, or expand your network, ${eventName} is the place to be.</p><p style="text-align: left;">Join us as we explore the latest trends, connect with like-minded individuals, and gain practical knowledge that you can apply to your work or personal life.</p><p style="text-align: left;"></p><p style="text-align: left;">Register now to secure your spot and join us for an unforgettable experience!</p>`,
          background: "accent",
        },
        {
          id: "home-highlights",
          type: "rich-text",
          content: `<p style="text-align: left;"><strong>HIGHLIGHTS OF THE EVENT</strong></p><p style="text-align: left;"></p><p style="text-align: left;"><strong>Networking opportunities:</strong> Meet and connect with like-minded individuals, as well as experts in your field. Make valuable connections that can help you grow your career or business.</p><p style="text-align: left;"></p><p style="text-align: left;"><strong>Knowledge sharing:</strong> Expert speakers share their insights and knowledge. Get new ideas, perspectives, and strategies that you can apply to your work or personal life.</p><p style="text-align: left;"></p><p style="text-align: left;"><strong>Inspiration:</strong> Get inspired with new ideas and motivation to achieve your goals.</p><p style="text-align: left;"></p><p style="text-align: left;"><strong>Stay up-to-date with industry trends:</strong> Discover the latest products, services, innovations and trends. Stay informed about what's new and what's on the horizon.</p><p style="text-align: left;"></p><p style="text-align: left;"><strong>Build brand awareness:</strong> If you're a business owner or entrepreneur, this is a great way to build brand awareness and connect with potential customers or clients.</p><p style="text-align: left;"></p><p style="text-align: left;"><strong>Access to experts and thought leaders:</strong> Gain access to experts and thought leaders at the forefront of their field and learn from their experiences and insights.</p><p style="text-align: left;"></p><p style="text-align: left;"><strong>Collaborate with others:</strong> Meet potential partners, collaborators, and share ideas and insights.</p>`,
          background: "accent",
        },
        {
          id: "home-hero",
          type: "hero",
          title: eventName,
          subtitle: "Welcome to our event",
          ctaLabel: "Learn More",
          ctaHref: "",
          overlay: "dark",
          alignment: "center",
          backgroundUrl: DEFAULT_HERO_URL,
        },
      ],
      seo_title: null,
      seo_description: null,
      og_image_url: null,
    },
    {
      slug: "info",
      title: "Info",
      page_type: "info",
      is_default: true,
      is_visible: true,
      sort_order: 1,
      content: [
        {
          id: "info-default-1",
          type: "rich-text",
          content: `<p style="text-align: left;"><strong>1-on-1 Meetings: Turn Connections into Partnerships</strong></p><p style="text-align: left;">B2Pair matches you with the right people before, during, and after events. The better your profile, the better your matches. Here's how to get the most out of it.</p><p style="text-align: left;"></p><p style="text-align: left;"><strong>Register for the Event</strong></p><p style="text-align: left;">Hit Register on the event page to join. It takes less than a minute.</p><p style="text-align: left;"></p><p style="text-align: left;"><strong>Build a Profile That Works for You</strong></p><p style="text-align: left;">Your profile is how other participants find you. Fill in your job title, company, and what you're here for (buying, selling, partnering, investing, learning, or networking). Add what you're looking for and what you offer. Our AI matching engine uses all of this to connect you with the most relevant people, so the more you share, the sharper your matches.</p><p style="text-align: left;"></p><p style="text-align: left;"><strong>Discover Who's Attending</strong></p><p style="text-align: left;">Browse the participant directory, filter by industry or intent, or check your AI-powered match recommendations. Every match comes with a compatibility score and clear reasons why you'd be a good fit, so you can focus your time on conversations that actually matter.</p><p style="text-align: left;"></p><p style="text-align: left;"><strong>Showcase What You Bring to the Table</strong></p><p style="text-align: left;">Sponsors and exhibitors can set up full company profiles with products, services, resources, and CTAs. Even as a regular participant, a detailed profile with clear offerings makes you more visible and more likely to receive meeting requests from the right people.</p><p style="text-align: left;"></p><p style="text-align: left;"><strong>Start Connecting Before the Event</strong></p><p style="text-align: left;">Don't wait for the day. Send a message or request a 1-on-1 meeting as soon as you see a promising match. When you send a request, include a short note about what you'd like to discuss. It makes a big difference in acceptance rates. The best outcomes come from people who start early and come prepared.</p>`,
        },
      ],
      seo_title: null,
      seo_description: null,
      og_image_url: null,
    },
    {
      slug: "network-guide",
      title: "Network Guide",
      page_type: "network_guide",
      is_default: true,
      is_visible: true,
      sort_order: 2,
      content: [
        {
          id: "ng-default-1",
          type: "rich-text",
          content: `<p style="text-align: left;"><strong>Networking Guide</strong></p><p style="text-align: left;"></p><p style="text-align: left;"><strong>Before the Event</strong></p><p style="text-align: left;">Complete your profile. Your title, company, intents, and what you're looking for. Better profiles get better matches.</p><p style="text-align: left;"></p><p style="text-align: left;"><strong>Check your AI matches.</strong></p><p style="text-align: left;">Browse your recommended matches, pick the most promising ones, and send meeting requests early. Include a short note about what you'd like to discuss. Slots fill up fast.</p><p style="text-align: left;"></p><p style="text-align: left;"><strong>During the Event</strong></p><p style="text-align: left;">Come prepared. Review each person's profile before you sit down. Know what they do, what they need, and where you might fit.</p><p style="text-align: left;"></p><p style="text-align: left;"><strong>Listen more than you pitch.</strong></p><p style="text-align: left;">Ask what they're working on. Find the overlap. If there's a fit, agree on a concrete next step. If not, no problem.</p><p style="text-align: left;"></p><p style="text-align: left;"><strong>Take quick notes after each meeting.</strong></p><p style="text-align: left;">You'll forget details faster than you think.</p><p style="text-align: left;"></p><p style="text-align: left;"><strong>After the Event</strong></p><p style="text-align: left;">Follow up within 48 hours. Reference your conversation, confirm the next step you agreed on. Keep it short and specific.</p>`,
        },
      ],
      seo_title: null,
      seo_description: null,
      og_image_url: null,
    },
    {
      slug: "faq",
      title: "FAQ",
      page_type: "faq",
      is_default: true,
      is_visible: true,
      sort_order: 3,
      content: [
        {
          id: "faq-default-1",
          type: "faq",
          items: [
            {
              question: "How do I register?",
              answer: "Click the Register button on the Home page and fill in your details.",
            },
            {
              question: "How does the matchmaking work?",
              answer: "Our AI analyzes participant profiles and recommends connections based on shared interests, complementary goals, and industry alignment.",
            },
            {
              question: "Can I schedule meetings?",
              answer: "Yes! Once registered, you can request meetings with other participants through the platform.",
            },
          ],
        },
      ],
      seo_title: null,
      seo_description: null,
      og_image_url: null,
    },
  ];
}

/** @deprecated Use getDefaultPages(eventName) instead */
export const DEFAULT_PAGES: Omit<EventPage, "id" | "event_id" | "created_at" | "updated_at">[] = getDefaultPages("Your Event");
