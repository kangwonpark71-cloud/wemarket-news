import Image from 'next/image'

interface ArticleHeroProps {
  src: string
  alt: string
  caption?: string
}

export function ArticleHero({ src, alt, caption }: ArticleHeroProps) {
  return (
    <figure className="mb-8 -mx-5 sm:-mx-6 lg:mb-12 lg:-mx-16">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 1200px"
        />
      </div>
      {caption && (
        <figcaption className="mt-3 px-1 text-center text-xs italic leading-relaxed text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
