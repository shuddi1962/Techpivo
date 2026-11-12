// TechPivo Market — mobile experience settings stored in site_settings under
// key "marketplace_mobile". Publicly readable (storefront), admin-writeable.
//
// All fields are optional; missing fields fall back to sensible defaults so
// the storefront never crashes when no admin has configured them yet.

export interface MobilePromoNoticeSettings {
  /** Promo notice on/off. Default false (hidden). */
  enabled: boolean
  /** TechPivo logo image URL shown on the left of the notice bar. */
  logo: string
  /** Main promotional heading. */
  heading: string
  /** Supporting description line. */
  description: string
  /** Action button label. */
  button_label: string
  /** Action button destination URL (validated by cleanBannerLink). */
  button_url: string
  /** Show/hide the action button. Default true. */
  show_button: boolean
  /** Show/hide the close (X) button. Default true. */
  show_close: boolean
  /** Notice bar background colour. Default #0F172A (navy). */
  bg_color: string
  /** Notice bar text colour. Default #ffffff (white). */
  text_color: string
  /** Action button background colour. Default #FF6B00 (amber). */
  btn_bg_color: string
  /** Action button text colour. Default #ffffff (white). */
  btn_text_color: string
  /** Optional ISO datetime when the notice starts showing. */
  start_at: string
  /** Optional ISO datetime when the notice stops showing. */
  end_at: string
}

export interface MobileAnnouncementSettings {
  /** Announcement strip on/off. Default false (hidden). */
  enabled: boolean
  /** Announcement text. */
  text: string
  /** Optional action text (e.g. "Shop Now"). */
  action_text: string
  /** Optional action destination URL. */
  action_url: string
  /** Strip background colour. Default #FF6B00 (amber). */
  bg_color: string
  /** Strip text colour. Default #ffffff (white). */
  text_color: string
  /** Optional ISO datetime when the announcement starts showing. */
  start_at: string
  /** Optional ISO datetime when the announcement stops showing. */
  end_at: string
}

export interface MarketMobileSettings {
  promo_notice: MobilePromoNoticeSettings
  announcement: MobileAnnouncementSettings
  /** Subcategory image rotation interval in milliseconds. Default 10000 (10s). */
  subcategory_rotation_ms: number
}

export const EMPTY_MOBILE_SETTINGS: MarketMobileSettings = {
  promo_notice: {
    enabled: false,
    logo: "",
    heading: "",
    description: "",
    button_label: "Shop Now",
    button_url: "",
    show_button: true,
    show_close: true,
    bg_color: "#0F172A",
    text_color: "#ffffff",
    btn_bg_color: "#FF6B00",
    btn_text_color: "#ffffff",
    start_at: "",
    end_at: "",
  },
  announcement: {
    enabled: false,
    text: "",
    action_text: "",
    action_url: "",
    bg_color: "#FF6B00",
    text_color: "#ffffff",
    start_at: "",
    end_at: "",
  },
  subcategory_rotation_ms: 10_000,
}

/** site_settings key under which mobile settings are stored. */
export const MARKETPLACE_MOBILE_KEY = "marketplace_mobile"

/** Sanitise raw site_settings value into MarketMobileSettings with safe defaults. */
export function parseMobileSettings(raw: unknown): MarketMobileSettings {
  if (!raw || typeof raw !== "object")
    return { ...EMPTY_MOBILE_SETTINGS }

  const r = raw as Record<string, unknown>
  const str = (v: unknown) => (typeof v === "string" ? v : "")
  const bool = (v: unknown, fb: boolean) => (typeof v === "boolean" ? v : fb)
  const num = (v: unknown, fb: number) => {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : fb
  }

  const promoRaw = r.promo_notice && typeof r.promo_notice === "object"
    ? (r.promo_notice as Record<string, unknown>)
    : {}
  const announceRaw = r.announcement && typeof r.announcement === "object"
    ? (r.announcement as Record<string, unknown>)
    : {}

  return {
    promo_notice: {
      enabled: bool(promoRaw.enabled, false),
      logo: str(promoRaw.logo),
      heading: str(promoRaw.heading),
      description: str(promoRaw.description),
      button_label: str(promoRaw.button_label) || "Shop Now",
      button_url: str(promoRaw.button_url),
      show_button: bool(promoRaw.show_button, true),
      show_close: bool(promoRaw.show_close, true),
      bg_color: str(promoRaw.bg_color) || "#0F172A",
      text_color: str(promoRaw.text_color) || "#ffffff",
      btn_bg_color: str(promoRaw.btn_bg_color) || "#FF6B00",
      btn_text_color: str(promoRaw.btn_text_color) || "#ffffff",
      start_at: str(promoRaw.start_at),
      end_at: str(promoRaw.end_at),
    },
    announcement: {
      enabled: bool(announceRaw.enabled, false),
      text: str(announceRaw.text),
      action_text: str(announceRaw.action_text),
      action_url: str(announceRaw.action_url),
      bg_color: str(announceRaw.bg_color) || "#FF6B00",
      text_color: str(announceRaw.text_color) || "#ffffff",
      start_at: str(announceRaw.start_at),
      end_at: str(announceRaw.end_at),
    },
    subcategory_rotation_ms: num(r.subcategory_rotation_ms, 10_000),
  }
}
