function getAffiliateUrl(program: string): string {
  const map: Record<string, string> = {
    nordvpn:   `https://go.nordvpn.net/aff_c?offer_id=15&aff_id=${process.env.NORDVPN_AFFILIATE_ID || ''}`,
    hostinger: `https://www.hostinger.com/refer?refcode=${process.env.HOSTINGER_AFFILIATE_ID || ''}`,
    namecheap: `https://www.namecheap.com/?aff=${process.env.NAMECHEAP_AFFILIATE_ID || ''}`,
    amazon:    `https://www.amazon.com?tag=${process.env.AMAZON_ASSOCIATE_TAG || 'techpivo-20'}`,
  }
  return map[program] || '#'
}

interface AffiliateRule {
  keywords:    string[]
  categories:  string[]
  program:     string
  name:        string
  url:         string
  description: string
  cta:         string
}

const RULES: AffiliateRule[] = [
  {
    keywords:    ['vpn', 'privacy', 'hack', 'breach', 'cyber', 'security', 'malware', 'ransomware'],
    categories:  ['cybersecurity', 'tech-news', 'networking-it'],
    program:     'nordvpn',
    name:        'NordVPN',
    url:         getAffiliateUrl('nordvpn'),
    description: 'Protect your privacy online. NordVPN is trusted by 14 million users worldwide — military-grade encryption, zero logs, 6 devices.',
    cta:         'Get 67% Off NordVPN →',
  },
  {
    keywords:    ['hosting', 'website', 'deploy', 'server', 'wordpress', 'domain', 'web host'],
    categories:  ['web-development', 'tutorials', 'digital-business'],
    program:     'hostinger',
    name:        'Hostinger',
    url:         getAffiliateUrl('hostinger'),
    description: 'Start your website today. Hostinger offers fast, reliable hosting from just $2.99/month with free domain and SSL included.',
    cta:         'Start with Hostinger →',
  },
  {
    keywords:    ['domain', 'register domain', 'domain name', 'buy domain'],
    categories:  ['web-development', 'tutorials', 'digital-business'],
    program:     'namecheap',
    name:        'Namecheap',
    url:         getAffiliateUrl('namecheap'),
    description: 'Register your domain name with Namecheap — cheap, reliable, free WHOIS privacy included on every domain.',
    cta:         'Get Your Domain →',
  },
  {
    keywords:    ['laptop', 'phone', 'tablet', 'gadget', 'review', 'buy', 'deal', 'price'],
    categories:  ['gadgets', 'reviews', 'desktops'],
    program:     'amazon',
    name:        'Amazon',
    url:         getAffiliateUrl('amazon'),
    description: 'Find the best tech deals on Amazon — millions of products, fast delivery, competitive prices.',
    cta:         'Shop on Amazon →',
  },
]

export function buildAffiliateBlock(post: {
  title: string; tags: string[]; category_slug: string
}): string {
  const text = `${post.title} ${post.tags.join(' ')}`.toLowerCase()

  for (const rule of RULES) {
    const catMatch = rule.categories.includes(post.category_slug)
    const kwMatch  = rule.keywords.some(kw => text.includes(kw))
    if (!catMatch && !kwMatch) continue

    return `<div style="background:#0F172A;border:1px solid #1E2D42;border-radius:12px;padding:20px;margin:24px 0;">
  <p style="color:#F59E0B;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">RECOMMENDED</p>
  <p style="color:#94A3B8;font-size:14px;line-height:1.5;margin:0 0 12px;">${rule.description}</p>
  <a href="${rule.url}" target="_blank" rel="nofollow sponsored" style="display:inline-block;background:#F59E0B;color:#0B1120;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">${rule.cta}</a>
  <p style="color:#475569;font-size:11px;margin:12px 0 0;">Affiliate link — Techpivo may earn a commission at no extra cost to you.</p>
</div>`
  }
  return ''
}
