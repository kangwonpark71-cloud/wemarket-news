import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SOURCES = [
  { name: '의협신문', nameEn: 'doctorsnews', url: 'http://www.doctorsnews.co.kr/rss/allArticle.xml', category: 'medical', subcategory: 'medical_policy', icon: '🏥', language: 'ko' },
  { name: '보사', nameEn: 'bosa', url: 'https://www.bosa.co.kr/rss/allArticle.xml', category: 'medical', subcategory: 'medical_policy', icon: '📋', language: 'ko' },
  { name: '히트뉴스', nameEn: 'hitnews', url: 'https://www.hitnews.co.kr/rss/allArticle.xml', category: 'medical', subcategory: 'medical_pharma', icon: '💊', language: 'ko' },
  { name: 'The Lancet', nameEn: 'lancet', url: 'https://www.thelancet.com/rssfeed/lancet_current.xml', category: 'medical', subcategory: 'medical_research', icon: '🔬', language: 'en' },
  { name: 'FDA Press Releases', nameEn: 'fda_press', url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml', category: 'medical', subcategory: 'medical_policy', icon: '🏛️', language: 'en' },
  { name: '한국소상공인신문', nameEn: 'ksbnews', url: 'https://www.ksbnews.co.kr/rss/allArticle.xml', category: 'smallbiz', subcategory: 'sbiz_general', icon: '🏪', language: 'ko' },
  { name: '식품외식경제', nameEn: 'foodbank', url: 'https://www.foodbank.co.kr/rss/allArticle.xml', category: 'smallbiz', subcategory: 'sbiz_food', icon: '🍽️', language: 'ko' },
]

async function main() {
  for (const s of SOURCES) {
    await prisma.source.upsert({
      where: { nameEn: s.nameEn },
      update: { name: s.name, url: s.url, category: s.category, subcategory: s.subcategory, icon: s.icon, fetchInterval: 3 },
      create: s,
    })
    console.log('✓', s.nameEn)
  }
  console.log(`\nSeeded ${SOURCES.length} medical/smallbiz sources`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
