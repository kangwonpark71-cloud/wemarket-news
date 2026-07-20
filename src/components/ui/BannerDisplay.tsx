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
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {banners.map((banner) => (
          <a
            key={banner.id}
            href={banner.linkUrl || '#'}
            target={banner.linkUrl ? '_blank' : undefined}
            rel={banner.linkUrl ? 'noopener noreferrer' : undefined}
            className="group relative flex flex-col overflow-hidden rounded-sm border border-border bg-card transition-shadow hover:shadow-md"
          >
            <div className="relative w-full overflow-hidden bg-muted" style={{ aspectRatio: '24 / 7', maxHeight: '200px' }}>
              <img
                src={banner.imageUrl}
                alt={banner.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            </div>
            <div className="p-3">
              <p className="text-xs font-medium text-foreground line-clamp-1">{banner.title}</p>
            </div>
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
            <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
              <img
                src={banner.imageUrl}
                alt={banner.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
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
            <img
              src={banner.imageUrl}
              alt={banner.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
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
