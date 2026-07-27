import Image from 'next/image'

interface ArticleImageProps {
  src: string
  alt: string
  caption?: string
}

export function ArticleImage({ src, alt, caption }: ArticleImageProps) {
  return (
    <figure className="my-10 -mx-5 sm:-mx-6 lg:-mx-12">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
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
