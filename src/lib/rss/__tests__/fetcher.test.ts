import { extractCategory, extractThumbnail } from '@/lib/rss/fetcher'

interface CategoryItem {
  categories?: string[] | string
}

interface ThumbnailItem {
  mediaContent?: { $?: { url?: string } }
  mediaThumbnail?: { $?: { url?: string } }
}

describe('fetcher utilities', () => {
  describe('extractCategory', () => {
    it('extracts first category from array', () => {
      const item: CategoryItem = { categories: ['business', 'finance', 'economy'] }
      const result = extractCategory(item)
      expect(result).toBe('business')
    })

    it('extracts string category', () => {
      const item: CategoryItem = { categories: 'technology' }
      const result = extractCategory(item)
      expect(result).toBe('technology')
    })

    it('returns undefined for empty array', () => {
      const item: CategoryItem = { categories: [] }
      const result = extractCategory(item)
      expect(result).toBeUndefined()
    })

    it('returns undefined for missing categories', () => {
      const item: CategoryItem = {}
      const result = extractCategory(item)
      expect(result).toBeUndefined()
    })
  })

  describe('extractThumbnail', () => {
    it('extracts media:content url', () => {
      const item: ThumbnailItem = {
        mediaContent: { $: { url: 'https://example.com/image.jpg' } },
      }
      const result = extractThumbnail(item)
      expect(result).toBe('https://example.com/image.jpg')
    })

    it('extracts media:thumbnail url', () => {
      const item: ThumbnailItem = {
        mediaThumbnail: { $: { url: 'https://example.com/thumb.jpg' } },
      }
      const result = extractThumbnail(item)
      expect(result).toBe('https://example.com/thumb.jpg')
    })

    it('prefers media:content over media:thumbnail', () => {
      const item: ThumbnailItem = {
        mediaContent: { $: { url: 'https://example.com/content.jpg' } },
        mediaThumbnail: { $: { url: 'https://example.com/thumb.jpg' } },
      }
      const result = extractThumbnail(item)
      expect(result).toBe('https://example.com/content.jpg')
    })

    it('returns undefined for missing thumbnails', () => {
      const item: ThumbnailItem = {}
      const result = extractThumbnail(item)
      expect(result).toBeUndefined()
    })
  })
})