import { prisma } from '@/lib/db'
import { AdDisplay } from './AdDisplay'

export async function SidebarAds() {
  const now = new Date()

  const ads = await prisma.advertisement.findMany({
    where: {
      position: 'sidebar',
      isActive: true,
      OR: [
        { startDate: null, endDate: null },
        { startDate: null, endDate: { gte: now } },
        { startDate: { lte: now }, endDate: null },
        { startDate: { lte: now }, endDate: { gte: now } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
  })

  if (ads.length === 0) return null

  return (
    <div className="mt-6 space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sponsored</h3>
      {ads.map((ad) => (
        <AdDisplay
          key={ad.id}
          id={ad.id}
          adType={ad.adType}
          title={ad.title}
          content={ad.content}
          linkUrl={ad.linkUrl}
        />
      ))}
    </div>
  )
}
