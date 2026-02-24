// Sponsors & Exhibitors Module Types

export interface Company {
  id: string;
  event_id: string;
  name: string;
  slug: string;
  website: string | null;
  industry: string | null;
  hq_location: string | null;
  description_short: string | null;
  description_long: string | null;
  logo_url: string | null;
  banner_url: string | null;
  brand_colors: { primary?: string; secondary?: string };
  capabilities: ("sponsor" | "exhibitor")[];
  status: CompanyStatus;
  rejection_reason: string | null;
  admin_user_id: string | null;
  billing_details: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type CompanyStatus =
  | "invited"
  | "onboarding"
  | "submitted"
  | "approved"
  | "live"
  | "rejected";

export interface SponsorTier {
  id: string;
  event_id: string;
  name: string;
  rank: number;
  color: string;
  perks: TierPerks;
  seat_limit: number;
  created_at: string;
}

export interface TierPerks {
  logo_on_event_page?: boolean;
  banner_placement?: boolean;
  extra_meeting_slots?: number;
  featured_listing?: boolean;
  sessions_included?: boolean;
  analytics_access?: boolean;
}

export interface SponsorProfile {
  id: string;
  company_id: string;
  tier_id: string | null;
  tagline: string | null;
  cta_buttons: CtaButton[];
  downloadables: Downloadable[];
  promo_video_url: string | null;
  sessions: SponsorSession[];
  placement_categories: string[];
  target_audience: Record<string, unknown>;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CtaButton {
  label: string;
  url: string;
  style: "primary" | "outline" | "secondary";
}

export interface Downloadable {
  name: string;
  url: string;
  type: string; // pdf, deck, doc, etc.
}

export interface SponsorSession {
  title: string;
  description: string;
  speaker_name: string;
  time: string;
}

export interface ExhibitorProfile {
  id: string;
  company_id: string;
  booth_number: string | null;
  booth_type: string | null;
  product_categories: string[];
  products: Product[];
  resources: Resource[];
  lead_form_fields: LeadFormField[];
  lead_qualification_tags: string[];
  meeting_settings: MeetingSettings;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  name: string;
  description: string;
  image_url: string | null;
  demo_url: string | null;
  price_info: string | null;
}

export interface Resource {
  name: string;
  url: string;
  type: string; // brochure, case_study, video
}

export interface LeadFormField {
  name: string;
  label: string;
  type: "text" | "select" | "checkbox";
  required: boolean;
  options?: string[];
}

export interface MeetingSettings {
  booking_enabled: boolean;
  available_slots: string[];
  team_routing: "round_robin" | "manual";
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string | null;
  participant_id: string | null;
  email: string;
  name: string | null;
  role: MemberRole;
  invite_status: "pending" | "accepted" | "expired";
  invite_code: string;
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
}

export type MemberRole = "admin" | "manager" | "representative" | "scanner" | "speaker";

export interface CompanyLead {
  id: string;
  company_id: string;
  event_id: string;
  participant_id: string | null;
  source: "profile_view" | "booth_visit" | "resource_download" | "meeting_request" | "manual";
  qualification: "hot" | "warm" | "cold" | null;
  notes: string | null;
  tags: string[];
  captured_by: string | null;
  resource_accessed: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyAnalytics {
  id: string;
  company_id: string;
  event_id: string;
  date: string;
  profile_views: number;
  unique_visitors: number;
  resource_downloads: number;
  cta_clicks: Record<string, number>;
  meeting_requests_received: number;
  leads_captured: number;
  created_at: string;
}

// Helper: company with nested profiles
export interface CompanyWithProfiles extends Company {
  sponsor_profile?: SponsorProfile | null;
  exhibitor_profile?: ExhibitorProfile | null;
  tier?: SponsorTier | null;
  members_count?: number;
}

// Permissions helper
export const ROLE_PERMISSIONS: Record<MemberRole, string[]> = {
  admin: [
    "edit_company",
    "edit_sponsor",
    "edit_exhibitor",
    "invite_members",
    "view_leads",
    "capture_leads",
    "view_analytics",
    "chat",
    "manage_billing",
  ],
  manager: [
    "edit_company",
    "edit_sponsor",
    "edit_exhibitor",
    "invite_members",
    "view_leads",
    "capture_leads",
    "view_analytics",
    "chat",
  ],
  representative: ["view_leads", "capture_leads", "chat"],
  scanner: ["view_leads", "capture_leads"],
  speaker: ["chat", "edit_sessions"],
};

export function hasPermission(role: MemberRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
