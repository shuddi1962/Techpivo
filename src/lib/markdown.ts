import xss from 'xss'

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderMarkdown(md: string): string {
  const rawBlocks: string[] = [];
  const extracted = md.replace(/\{html\}([\s\S]*?)\{\/html\}/gi, (_, content) => {
    rawBlocks.push(xss(content, {
      whiteList: {
        p: [], br: [], hr: [], h1: [], h2: [], h3: [], h4: [], h5: [], h6: [],
        strong: [], b: [], em: [], i: [], u: [], s: [], del: [],
        a: ['href', 'target', 'rel', 'title'],
        img: ['src', 'alt', 'width', 'height', 'loading', 'class', 'style'],
        ul: [], ol: [], li: [],
        blockquote: [], pre: [], code: [],
        table: ['class', 'style'], thead: [], tbody: [], tfoot: [],
        tr: ['class', 'style'], td: ['class', 'style', 'colspan', 'rowspan'],
        th: ['class', 'style', 'colspan', 'rowspan'],
        div: ['class', 'style', 'id'], span: ['class', 'style'],
        figure: ['class'], figcaption: [],
        iframe: ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'title'],
        video: ['src', 'controls', 'width', 'height'],
        source: ['src', 'type'],
      },
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style'],
    }));
    return `\x00RAWBLOCK${rawBlocks.length - 1}\x00`;
  });

  const lines = extracted.split("\n");
  let html = "";
  let inCode = false;
  let codeBuf: string[] = [];
  let inList = false;
  let listType = "ul";
  const closeList = () => {
    if (inList) { html += `</${listType}>`; inList = false; }
  };
  const inline = (t: string) => {
    let value = escapeHtml(t);
    value = value.replace(
      /!\[([^\]]*)\]\((\/[^\s)]+|https?:\/\/[^\s)]+)\)/g,
      (m, alt: string, src: string) =>
        `<figure class="page-image"><img src="${src}" alt="${alt}" loading="lazy" /></figure>`
    );
    value = value.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    value = value.replace(/`([^`]+)`/g, "<code>$1</code>");
    value = value.replace(
      /\[([^\]]+)\]\((\/[\w\/\-\?=#.%&]+|https?:\/\/[^)\s]+|mailto:[^)\s]+)\)/g,
      (m, label: string, href: string) =>
        href.startsWith("http")
          ? `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`
          : `<a href="${href}">${label}</a>`
    );
    value = value.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    return value;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("```")) {
      if (inCode) {
        html += `<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`;
        codeBuf = [];
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      continue;
    }
    if (inCode) { codeBuf.push(line); continue; }
    if (/^#{1,6}\s/.test(line)) {
      closeList();
      const level = line.match(/^(#+)/)![1].length;
      html += `<h${level}>${inline(line.replace(/^#+\s/, ""))}</h${level}>`;
    } else if (/^[-*]\s/.test(line)) {
      if (!inList || listType !== "ul") { closeList(); inList = true; listType = "ul"; html += "<ul>"; }
      html += `<li>${inline(line.replace(/^[-*]\s/, ""))}</li>`;
    } else if (/^\d+\.\s/.test(line)) {
      if (!inList || listType !== "ol") { closeList(); inList = true; listType = "ol"; html += "<ol>"; }
      html += `<li>${inline(line.replace(/^\d+\.\s/, ""))}</li>`;
    } else if (line.startsWith("> ")) {
      closeList();
      html += `<blockquote>${inline(line.replace(/^> /, ""))}</blockquote>`;
    } else if (/^\|.*\|$/.test(line) && /^\|[\s:-|]+\|$/.test(line)) {
      continue;
    } else if (/^\|.*\|$/.test(line)) {
      closeList();
      const cells = line.split("|").slice(1, -1).map((c) => inline(c.trim()));
      html += `<table><tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr></table>`;
    } else if (line.trim() === "") {
      closeList();
    } else if (line.startsWith("---")) {
      closeList();
      html += "<hr />";
    } else {
      closeList();
      html += `<p>${inline(line)}</p>`;
    }
  }
  closeList();

  html = html.replace(/\x00RAWBLOCK(\d+)\x00/g, (_, idx) => rawBlocks[Number(idx)]);
  return html;
}