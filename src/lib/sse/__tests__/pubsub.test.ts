import { fetchProgressPubSub, PubSub as PubSubClass } from '../pubsub'

/**
 * Re-create a fresh instance for each test-group so state is isolated.
 * We import the CLASS and instantiate here; the singleton is tested separately.
 */

// ── We need a constructor reference.  Since pubsub.ts exports a singleton
//    (fetchProgressPubSub) but not the class itself under its own name, we
//    grab the constructor from the singleton via Object.getPrototypeOf.
const PubSub = fetchProgressPubSub.constructor as typeof PubSubClass

describe('PubSub', () => {
  let ps: PubSubClass

  beforeEach(() => {
    ps = new PubSub()
  })

  // ── subscribe / publish ──────────────────────────────────────
  it('should deliver published data to a subscribed listener', () => {
    const listener = jest.fn()
    ps.subscribe('test-event', listener)
    ps.publish('test-event', { foo: 'bar' })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith({ foo: 'bar' })
  })

  it('should NOT deliver to listeners of a different event', () => {
    const listener = jest.fn()
    ps.subscribe('event-a', listener)
    ps.publish('event-b', { data: 1 })
    expect(listener).not.toHaveBeenCalled()
  })

  it('should do nothing when publishing to an event with no listeners', () => {
    expect(() => ps.publish('ghost-event', 42)).not.toThrow()
  })

  // ── unsubscribe ──────────────────────────────────────────────
  it('should stop delivering after unsubscribe is called', () => {
    const listener = jest.fn()
    const unsubscribe = ps.subscribe('ev', listener)

    unsubscribe()
    ps.publish('ev', 'data')
    expect(listener).not.toHaveBeenCalled()
  })

  it('should allow multiple listeners on the same event', () => {
    const a = jest.fn()
    const b = jest.fn()
    ps.subscribe('ev', a)
    ps.subscribe('ev', b)

    ps.publish('ev', 'x')
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('should only remove the correct listener on unsubscribe', () => {
    const a = jest.fn()
    const b = jest.fn()
    const unsubA = ps.subscribe('ev', a)
    ps.subscribe('ev', b)

    unsubA()
    ps.publish('ev', 'x')
    expect(a).not.toHaveBeenCalled()
    expect(b).toHaveBeenCalledTimes(1)
  })

  // ── error handling ───────────────────────────────────────────
  it('should not throw when a listener throws', () => {
    const throwing = jest.fn().mockImplementation(() => { throw new Error('boom') })
    const normal = jest.fn()
    ps.subscribe('ev', throwing)
    ps.subscribe('ev', normal)

    // Must not throw even though `throwing` errors
    expect(() => ps.publish('ev', 'data')).not.toThrow()
    expect(normal).toHaveBeenCalledTimes(1)
  })

  // ── singleton ────────────────────────────────────────────────
  it('should export a singleton instance (fetchProgressPubSub)', () => {
    expect(fetchProgressPubSub).toBeInstanceOf(PubSub)
  })
})