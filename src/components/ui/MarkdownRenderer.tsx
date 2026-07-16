'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content || content.trim().length === 0) return null

  return (
    <div className={`prose prose-gray dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ children, ...props }) => (
            <h1 {...props} className="text-3xl font-bold text-foreground mt-8 mb-4 pb-2 border-b border-border">
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 {...props} className="text-2xl font-semibold text-foreground mt-10 mb-4">
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 {...props} className="text-xl font-semibold text-foreground mt-8 mb-3">
              {children}
            </h3>
          ),
          p: ({ children, ...props }) => (
            <p {...props} className="text-foreground/90 leading-relaxed mb-4">
              {children}
            </p>
          ),
          ul: ({ children, ...props }) => (
            <ul {...props} className="list-disc list-inside space-y-2 mb-4 ml-4">
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol {...props} className="list-decimal list-inside space-y-2 mb-4 ml-4">
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
              className="border-l-4 border-primary pl-4 italic text-muted-foreground my-4"
            >
              {children}
            </blockquote>
          ),
          code: ({ children, ...props }) => (
            <code
              {...props}
              className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary"
            >
              {children}
            </code>
          ),
          pre: ({ children, ...props }) => (
            <pre
              {...props}
              className="bg-muted p-4 rounded-lg overflow-x-auto my-4"
            >
              {children}
            </pre>
          ),
          strong: ({ children, ...props }) => (
            <strong {...props} className="font-semibold text-foreground">
              {children}
            </strong>
          ),
          em: ({ children, ...props }) => (
            <em {...props} className="italic">
              {children}
            </em>
          ),
          a: ({ children, href, ...props }) => (
            <a
              {...props}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 underline"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-8 border-border" />,
          img: ({ src, alt, ...props }) => (
            <figure className="my-6">
              <img
                {...props}
                src={src}
                alt={alt}
                className="rounded-lg max-w-full h-auto"
                loading="lazy"
              />
              {alt && (
                <figcaption className="text-center text-sm text-muted-foreground mt-2">
                  {alt}
                </figcaption>
              )}
            </figure>
          ),
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-6">
              <table {...props} className="w-full border-collapse">
                {children}
              </table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th
              {...props}
              className="border border-border px-3 py-2 text-left font-semibold bg-muted"
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td
              {...props}
              className="border border-border px-3 py-2"
            >
              {children}
            </td>
          ),
        }}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSlug, rehypeAutolinkHeadings]}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}