export interface SocialProvider {
  id: string;
  name: string;
  placeholder: string;
  brand: string;
}

export const SOCIAL_PROVIDERS: SocialProvider[] = [
  { id: 'twitter', name: 'X (Twitter)', placeholder: 'https://x.com/your-handle', brand: '#000000' },
  { id: 'facebook', name: 'Facebook', placeholder: 'https://facebook.com/your-page', brand: '#1877F2' },
  { id: 'instagram', name: 'Instagram', placeholder: 'https://instagram.com/your-handle', brand: '#E4405F' },
  { id: 'linkedin', name: 'LinkedIn', placeholder: 'https://linkedin.com/in/your-name', brand: '#0A66C2' },
  { id: 'youtube', name: 'YouTube', placeholder: 'https://youtube.com/@your-channel', brand: '#FF0000' },
  { id: 'github', name: 'GitHub', placeholder: 'https://github.com/your-username', brand: '#181717' },
  { id: 'telegram', name: 'Telegram', placeholder: 'https://t.me/your-username', brand: '#26A5E4' },
  { id: 'whatsapp', name: 'WhatsApp', placeholder: 'https://wa.me/2348000000000', brand: '#25D366' },
  { id: 'tiktok', name: 'TikTok', placeholder: 'https://tiktok.com/@your-handle', brand: '#000000' },
  { id: 'google', name: 'Google', placeholder: 'https://g.dev/your-username', brand: '#4285F4' },
  { id: 'discord', name: 'Discord', placeholder: 'https://discord.gg/invite-code', brand: '#5865F2' },
];

export const VALID_PROVIDER_IDS = new Set(SOCIAL_PROVIDERS.map(p => p.id));

export function getProviderMeta(id: string): SocialProvider | undefined {
  return SOCIAL_PROVIDERS.find(p => p.id === id);
}