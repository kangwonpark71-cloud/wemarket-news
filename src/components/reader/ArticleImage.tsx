interface ArticleImageProps {
  src: string
  alt: string
  caption?: string
}

export function ArticleImage({ src, alt, caption }: ArticleImageProps) {
  return (
    <figure className="my-10 -mx-5 sm:-mx-6 lg:-mx-12">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
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
