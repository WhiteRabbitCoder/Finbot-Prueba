'use client'

import React from 'react'

// Convert \[...\] display-math to fenced code blocks before block parsing
function preprocessText(text: string): string {
  return text.replace(/\\\[([\s\S]+?)\\\]/g, (_, math) => `\n\`\`\`\n${math.trim()}\n\`\`\`\n`)
}

// Parse inline formatting: **bold**, *italic*, `code`, \( math \)
function parseInline(text: string, keyBase: number): React.ReactNode[] {
  const pattern = /(\*\*[\s\S]+?\*\*|\*[^*\n]+\*|`[^`\n]+`|\\\([\s\S]+?\\\))/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let k = 0

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    const m = match[0]
    const key = `${keyBase}-${k++}`

    if (m.startsWith('**')) {
      parts.push(<strong key={key} className="font-semibold">{m.slice(2, -2)}</strong>)
    } else if (m.startsWith('\\(')) {
      parts.push(
        <code key={key} className="font-mono text-xs bg-rule/50 px-1 py-0.5 rounded">
          {m.slice(2, -2).trim()}
        </code>
      )
    } else if (m.startsWith('*')) {
      parts.push(<em key={key}>{m.slice(1, -1)}</em>)
    } else if (m.startsWith('`')) {
      parts.push(
        <code key={key} className="font-mono text-xs bg-rule/50 px-1 py-0.5 rounded">
          {m.slice(1, -1)}
        </code>
      )
    }

    lastIndex = match.index + m.length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}

type Block =
  | { type: 'paragraph'; content: string }
  | { type: 'ol'; items: string[] }
  | { type: 'ul'; items: string[] }
  | { type: 'code'; content: string }

function parseBlocks(text: string): Block[] {
  const lines = text.split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') { i++; continue }

    // Fenced code block
    if (line.trim().startsWith('```')) {
      let code = ''
      i++ // skip opening fence
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code += (code ? '\n' : '') + lines[i]
        i++
      }
      i++ // skip closing fence
      blocks.push({ type: 'code', content: code })
      continue
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''))
        i++
      }
      blocks.push({ type: 'ol', items })
      continue
    }

    // Bullet list
    if (/^[-*]\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''))
        i++
      }
      blocks.push({ type: 'ul', items })
      continue
    }

    // Paragraph — collect until blank line or a list/code block begins
    let para = line
    i++
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^\d+\.\s/.test(lines[i]) &&
      !/^[-*]\s/.test(lines[i]) &&
      !lines[i].trim().startsWith('```')
    ) {
      para += ' ' + lines[i]
      i++
    }
    blocks.push({ type: 'paragraph', content: para })
  }

  return blocks
}

export function MarkdownMessage({ content }: { content: string }) {
  const blocks = parseBlocks(preprocessText(content))

  return (
    <div className="text-sm text-ink leading-relaxed space-y-2">
      {blocks.map((block, idx) => {
        if (block.type === 'paragraph') {
          return <p key={idx}>{parseInline(block.content, idx)}</p>
        }
        if (block.type === 'ol') {
          return (
            <ol key={idx} className="list-decimal list-outside ml-5 space-y-1">
              {block.items.map((item, j) => (
                <li key={j}>{parseInline(item, idx * 100 + j)}</li>
              ))}
            </ol>
          )
        }
        if (block.type === 'ul') {
          return (
            <ul key={idx} className="list-disc list-outside ml-5 space-y-1">
              {block.items.map((item, j) => (
                <li key={j}>{parseInline(item, idx * 100 + j)}</li>
              ))}
            </ul>
          )
        }
        if (block.type === 'code') {
          return (
            <pre key={idx} className="bg-rule/30 rounded-lg p-3 overflow-x-auto text-center">
              <code className="font-mono text-xs">{block.content}</code>
            </pre>
          )
        }
        return null
      })}
    </div>
  )
}
