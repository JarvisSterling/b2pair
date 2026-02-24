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
export const DEFAULT_PAGES: Omit<EventPage, "id" | "event_id" | "created_at" | "updated_at">[] = [
  {
    slug: "home",
    title: "Home",
    page_type: "home",
    is_default: true,
    is_visible: true,
    sort_order: 0,
    content: [],
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
        content: "<p>Add details about your event here.</p>",
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
        content:
          "<h2>How Matchmaking Works</h2><p>Our AI analyzes your profile, interests, and goals to recommend the most relevant connections.</p><h3>Tips for Better Matches</h3><ul><li>Complete your profile with detailed information</li><li>Set your intent clearly (buying, selling, partnering)</li><li>Add specific interest tags</li><li>Set your availability early</li></ul>",
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
