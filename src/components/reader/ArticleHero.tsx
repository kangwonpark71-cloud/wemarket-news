interface ArticleHeroProps {
  src: string
  alt: string
  caption?: string
}

export function ArticleHero({ src, alt, caption }: ArticleHeroProps) {
  return (
    <figure className="mb-8 -mx-5 sm:-mx-6 lg:mb-12 lg:-mx-16">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
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
