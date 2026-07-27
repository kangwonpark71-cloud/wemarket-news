import Image from 'next/image'
import { prisma } from '@/lib/db'
import { isBannerPosition, type BannerPosition } from '@/lib/constants/banner'

interface BannerDisplayProps {
  position: BannerPosition
}

export async function BannerDisplay({ position }: BannerDisplayProps) {
  if (!isBannerPosition(position)) return null

  const now = new Date()

  const banners = await prisma.banner.findMany({
    where: {
      position,
      isActive: true,
      OR: [
        { startDate: null, endDate: null },
        { startDate: null, endDate: { gte: now } },
        { startDate: { lte: now }, endDate: null },
        { startDate: { lte: now }, endDate: { gte: now } },
      ],
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  })

  if (banners.length === 0) return null

  if (position === 'top') {
    return (
      <div className="flex flex-col gap-2">
        {banners.map((banner) => (
          <a
            key={banner.id}
            href={banner.linkUrl || '#'}
            target={banner.linkUrl ? '_blank' : undefined}
            rel={banner.linkUrl ? 'noopener noreferrer' : undefined}
            className="group flex h-11 w-full items-center gap-3 overflow-hidden rounded-sm border border-border bg-card px-4 transition-shadow hover:shadow-md"
          >
            <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-sm bg-muted">
              <Image
                src={banner.imageUrl}
                alt={banner.title}
                fill
                className="object-cover"
                sizes="28px"
              />
            </div>
            <p className="truncate text-sm font-medium text-foreground">{banner.title}</p>
          </a>
        ))}
      </div>
    )
  }

  if (position === 'sidebar') {
    return (
      <div className="space-y-3">
        {banners.map((banner) => (
          <a
            key={banner.id}
            href={banner.linkUrl || '#'}
            target={banner.linkUrl ? '_blank' : undefined}
            rel={banner.linkUrl ? 'noopener noreferrer' : undefined}
            className="group block overflow-hidden rounded-sm border border-border bg-card transition-shadow hover:shadow-md"
          >
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
              <Image
                src={banner.imageUrl}
                alt={banner.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 300px"
              />
            </div>
            <div className="p-2">
              <p className="text-xs font-medium text-foreground line-clamp-2">{banner.title}</p>
            </div>
          </a>
        ))}
      </div>
    )
  }

  if (position === 'bottom') {
    return (
    <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-2">
      {banners.map((banner) => (
        <a
          key={banner.id}
          href={banner.linkUrl || '#'}
          target={banner.linkUrl ? '_blank' : undefined}
          rel={banner.linkUrl ? 'noopener noreferrer' : undefined}
          className="group relative flex flex-col overflow-hidden rounded-sm border border-border bg-card transition-shadow hover:shadow-md"
        >
          <div className="relative w-full overflow-hidden bg-muted" style={{ aspectRatio: '24 / 7', maxHeight: '180px' }}>
            <Image
              src={banner.imageUrl}
              alt={banner.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          <div className="p-2">
            <p className="text-xs font-medium text-foreground line-clamp-1">{banner.title}</p>
          </div>
        </a>
      ))}
    </div>
    )
  }
}
