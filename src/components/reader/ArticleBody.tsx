'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import { highlightKeywords, DEFAULT_KEYWORDS } from './ArticleKeywords'
import { ArticleBlockquote } from './ArticleBlockquote'
import { ArticleImage } from './ArticleImage'

interface ArticleBodyProps {
  content: string
  className?: string
}

function splitIntoLogicalParagraphs(rawText: string): string[] {
  if (!rawText || rawText.includes('\n')) return [rawText]

  const sentences = rawText
    .replace(/([.!?])\s*(?=[가-힣ㄱ-ㅎㅏ-ㅣA-Z])/g, '$1\u0001')
    .split('\u0001')
    .map((s) => s.trim())
    .filter(Boolean)

  if (sentences.length <= 1) return [rawText]

  const chunks: string[] = []
  for (let i = 0; i < sentences.length; i += 2) {
    chunks.push(sentences.slice(i, i + 2).join(' '))
  }
  return chunks
}

function isQuoteLike(text: string): boolean {
  return (
    text.startsWith('“') ||
    text.startsWith('"') ||
    text.startsWith('『') ||
    text.startsWith('「') ||
    text.includes('말했다') ||
    text.includes('밝혔다') ||
    text.includes('강조했다') ||
    text.includes('지적했다')
  )
}

export function ArticleBody({ content, className = '' }: ArticleBodyProps) {
  if (!content || content.trim().length === 0) return null

  return (
    <div
      className={[
        'font-serif text-[1.0625rem] leading-[1.85] text-foreground/90',
        'tracking-[-0.003em] sm:text-[1.125rem] lg:text-[1.1875rem]',
        'word-break-keep-all',
        className,
      ].join(' ')}
    >
      <ReactMarkdown
        components={{
          h1: ({ children, ...props }) => (
            <h2
              {...props}
              className="mb-4 mt-12 border-b border-border pb-3 text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-3xl"
            >
              {children}
            </h2>
          ),
          h2: ({ children, ...props }) => (
            <h3
              {...props}
              className="mb-3 mt-10 text-xl font-bold leading-snug tracking-tight text-foreground sm:text-2xl"
            >
              {children}
            </h3>
          ),
          h3: ({ children, ...props }) => (
            <h4
              {...props}
              className="mb-3 mt-8 text-lg font-semibold leading-snug tracking-tight text-foreground sm:text-xl"
            >
              {children}
            </h4>
          ),
          p: ({ children, ...props }) => {
            const rawText = typeof children === 'string' ? children : ''

            if (rawText) {
              const paragraphs = splitIntoLogicalParagraphs(rawText)

              if (paragraphs.length > 1) {
                return (
                  <>
                    {paragraphs.map((para, idx) => {
                      if (isQuoteLike(para) && para.length > 80) {
                        return (
                          <ArticleBlockquote key={idx}>
                            {highlightKeywords(para, DEFAULT_KEYWORDS)}
                          </ArticleBlockquote>
                        )
                      }
                      return (
                        <p
                          key={idx}
                          className="mb-5 text-foreground/90"
                        >
                          {highlightKeywords(para, DEFAULT_KEYWORDS)}
                        </p>
                      )
                    })}
                  </>
                )
              }

              if (isQuoteLike(rawText) && rawText.length > 50) {
                return (
                  <ArticleBlockquote>
                    {highlightKeywords(rawText, DEFAULT_KEYWORDS)}
                  </ArticleBlockquote>
                )
              }

              return (
                <p {...props} className="mb-5 text-foreground/90">
                  {highlightKeywords(rawText, DEFAULT_KEYWORDS)}
                </p>
              )
            }

            return (
              <p {...props} className="mb-5 text-foreground/90">
                {children}
              </p>
            )
          },
          ul: ({ children, ...props }) => (
            <ul {...props} className="mb-5 ml-5 list-disc space-y-2 text-foreground/90 marker:text-muted-foreground">
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol {...props} className="mb-5 ml-5 list-decimal space-y-2 text-foreground/90 marker:text-muted-foreground">
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li {...props} className="leading-relaxed">
              {children}
            </li>
          ),
          blockquote: ({ children, ...props }) => (
            <ArticleBlockquote {...props}>{children}</ArticleBlockquote>
          ),
          code: ({ children, ...props }) => (
            <code
              {...props}
              className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-primary"
            >
              {children}
            </code>
          ),
          pre: ({ children, ...props }) => (
            <pre
              {...props}
              className="my-6 overflow-x-auto rounded-sm border border-border bg-muted p-4 font-mono text-sm"
            >
              {children}
            </pre>
          ),
          strong: ({ children, ...props }) => (
            <strong
              {...props}
              className="font-bold text-foreground"
            >
              {children}
            </strong>
          ),
          em: ({ children, ...props }) => (
            <em {...props} className="italic text-foreground">
              {children}
            </em>
          ),
          a: ({ children, href, ...props }) => (
            <a
              {...props}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:decoration-primary"
            >
              {children}
            </a>
          ),
          hr: () => (
            <hr className="my-10 border-0 border-t border-border" />
          ),
          img: ({ src, alt, ...props }) => (
            <ArticleImage
              {...props}
              src={typeof src === 'string' ? src : ''}
              alt={typeof alt === 'string' ? alt : ''}
              caption={typeof alt === 'string' ? alt : undefined}
            />
          ),
          table: ({ children, ...props }) => (
            <div className="my-8 overflow-x-auto rounded-sm border border-border">
              <table {...props} className="w-full border-collapse text-sm">
                {children}
              </table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th
              {...props}
              className="border-b border-border bg-muted px-4 py-3 text-left font-bold uppercase tracking-wider text-foreground/80"
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td
              {...props}
              className="border-b border-border px-4 py-3 text-muted-foreground"
            >
              {children}
            </td>
          ),
        }}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
