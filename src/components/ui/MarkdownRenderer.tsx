'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import { highlightKeywords, DEFAULT_KEYWORDS } from '@/components/reader/ArticleKeywords'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content || content.trim().length === 0) return null

  return (
    <div className={`prose prose-gray dark:prose-invert max-w-[680px] mx-auto font-serif antialiased ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ children, ...props }) => (
            <h1 {...props} className="text-3xl sm:text-4xl font-extrabold text-foreground mt-12 mb-6 leading-tight font-sans tracking-tight border-b border-border pb-3">
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 {...props} className="text-2xl sm:text-3xl font-bold text-foreground mt-12 mb-4 leading-snug font-sans tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 {...props} className="text-xl sm:text-2xl font-semibold text-foreground mt-10 mb-3 font-sans tracking-tight">
              {children}
            </h3>
          ),
          p: ({ children, ...props }) => {
            const rawText = typeof children === 'string' ? children : '';
            if (rawText && rawText.length > 80 && !rawText.includes('\n')) {
              const sentences = rawText
                .replace(/([.!?])\s*(?=[가-힣ㄱ-ㅎㅏ-ㅣA-Z])/g, '$1\n\n')
                .split('\n\n')
                .map(s => s.trim())
                .filter(Boolean);

              if (sentences.length > 2) {
                const chunks: string[][] = [];
                for (let i = 0; i < sentences.length; i += 2) {
                  chunks.push(sentences.slice(i, i + 2));
                }

                return (
                  <>
                    {chunks.map((chunk, idx) => {
                      const paragraphText = chunk.join(' ');
                      const isQuote = paragraphText.startsWith('“') || paragraphText.startsWith('"') || paragraphText.includes('말했다') || paragraphText.includes('밝혔다');
                      
                      if (isQuote && paragraphText.length > 100) {
                        return (
                          <blockquote key={idx} className="border-l-4 border-primary pl-6 py-2 italic text-lg text-muted-foreground my-8 bg-muted/10 -mx-4 md:-mx-6 px-4 font-serif">
                            {highlightKeywords(paragraphText, DEFAULT_KEYWORDS)}
                          </blockquote>
                        );
                      }

                      return (
                        <p key={idx} {...props} className="text-[17px] sm:text-lg leading-[1.75] text-foreground/90 mb-6 font-normal tracking-wide word-break-keep-all">
                          {highlightKeywords(paragraphText, DEFAULT_KEYWORDS)}
                        </p>
                      );
                    })}
                  </>
                );
              }
            }

            const isQuote = rawText.startsWith('“') || rawText.startsWith('"');
            if (isQuote && rawText.length > 50) {
              return (
                <blockquote className="border-l-4 border-primary pl-6 py-2 italic text-lg text-muted-foreground my-8 bg-muted/10 -mx-4 md:-mx-6 px-4 font-serif">
                  {children}
                </blockquote>
              );
            }

            return (
              <p {...props} className="text-[17px] sm:text-lg leading-[1.75] text-foreground/90 mb-6 font-normal tracking-wide word-break-keep-all">
                {typeof children === 'string' ? (
                  highlightKeywords(children, DEFAULT_KEYWORDS)
                ) : children}
              </p>
            );
          },
          ul: ({ children, ...props }) => (
            <ul {...props} className="list-disc list-inside space-y-2 mb-6 ml-4 text-[17px] sm:text-lg text-foreground/90 font-serif leading-[1.75]">
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol {...props} className="list-decimal list-inside space-y-2 mb-6 ml-4 text-[17px] sm:text-lg text-foreground/90 font-serif leading-[1.75]">
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li {...props} className="leading-relaxed mb-1 ml-2">
              {children}
            </li>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              {...props}
              className="border-l-4 border-primary pl-6 py-2 italic text-lg sm:text-xl text-muted-foreground my-8 bg-muted/10 -mx-4 md:-mx-6 px-4 font-serif"
            >
              {children}
            </blockquote>
          ),
          code: ({ children, ...props }) => (
            <code
              {...props}
              className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary font-sans"
            >
              {children}
            </code>
          ),
          pre: ({ children, ...props }) => (
            <pre
              {...props}
              className="bg-muted p-4 rounded overflow-x-auto my-6 font-sans border border-border"
            >
              {children}
            </pre>
          ),
          strong: ({ children, ...props }) => (
            <strong {...props} className="font-extrabold text-foreground border-b-2 border-primary/20 pb-0.5 font-sans">
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
              className="text-primary hover:text-primary-hover underline font-sans font-semibold transition-colors"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-10 border-border" />,
          img: ({ src, alt, ...props }) => (
            <figure className="my-10 -mx-4 md:-mx-12 overflow-hidden bg-muted border border-border rounded-sm relative aspect-[16/9]">
              <img
                {...props}
                src={src}
                alt={alt}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
              {alt && (
                <figcaption className="text-center text-xs italic text-muted-foreground mt-3 tracking-wide bg-background/50 py-1.5 border-t border-border font-sans">
                  {alt}
                </figcaption>
              )}
            </figure>
          ),
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-8 border border-border rounded-sm">
              <table {...props} className="w-full border-collapse text-xs sm:text-sm font-sans">
                {children}
              </table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th
              {...props}
              className="border-b border-border px-4 py-3 text-left font-bold bg-muted text-foreground/80 uppercase tracking-wider"
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td
              {...props}
              className="border-b border-slate-100 dark:border-slate-800 px-4 py-3 text-muted-foreground"
            >
              {children}
            </td>
          ),
        }}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, rehypeAutolinkHeadings]}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
