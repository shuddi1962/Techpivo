import { describe, it, expect } from 'vitest';
import { escapeHtml, renderMarkdown } from '@/lib/markdown';

describe('escapeHtml', () => {
  it('escapes HTML metacharacters', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapes double quotes for attribute injection safety', () => {
    expect(escapeHtml('a" onmouseover="x')).toBe('a&quot; onmouseover=&quot;x');
  });

  it('escapes ampersands first', () => {
    expect(escapeHtml('&&&')).toBe('&amp;&amp;&amp;');
  });
});

describe('renderMarkdown (XSS safety)', () => {
  it('does not emit raw script tags', () => {
    const html = renderMarkdown('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('does not allow javascript: URLs in links', () => {
    const html = renderMarkdown('[click](javascript:alert(1))');
    expect(html).not.toContain('href="javascript:');
  });

  it('does not allow javascript: URLs in images', () => {
    const html = renderMarkdown('![x](javascript:alert(1))');
    expect(html).not.toContain('src="javascript:');
  });

  it('cannot break out of attributes via quotes or entities', () => {
    const html = renderMarkdown('[x](https://a.com/"><script>alert(1)</script>)');
    expect(html).not.toContain('<script>');
    // href attribute value must stay quoted-escaped
    expect(html).toContain('&quot;');
  });

  it('renders plain links with target=_blank for external', () => {
    const html = renderMarkdown('[TechPivo](https://techpivo.com)');
    expect(html).toContain('href="https://techpivo.com"');
    expect(html).toContain('target="_blank"');
  });

  it('renders internal links without target=_blank', () => {
    const html = renderMarkdown('[About](/about)');
    expect(html).toContain('href="/about"');
    expect(html).not.toContain('target="_blank"');
  });

  it('renders headings, bold, lists and code blocks', () => {
    const html = renderMarkdown('# Title\n\n**bold** and `code`\n\n- one\n- two\n\n```js\nconst x = 1\n```');
    expect(html).toContain('<h1>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>one</li>');
    expect(html).toContain('<pre><code>const x = 1</code></pre>');
  });
});