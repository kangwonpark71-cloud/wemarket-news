import Image from 'next/image'

interface ArticleHeroProps {
  src: string
  alt: string
  caption?: string
}

export function ArticleHero({ src, alt, caption }: ArticleHeroProps) {
  return (
    <figure className="mb-8 mx-auto max-w-[50%]">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-sm bg-muted">
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 600px"
          quality={85}
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
