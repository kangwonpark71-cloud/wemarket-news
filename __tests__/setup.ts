import '@testing-library/jest-dom'

const originalFetch = global.fetch

beforeAll(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      headers: new Headers(),
      redirected: false,
      statusText: 'OK',
      type: 'basic' as ResponseType,
      url: '',
      clone: () => ({} as Response),
      body: null,
      bodyUsed: false,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      blob: () => Promise.resolve(new Blob()),
      formData: () => Promise.resolve(new FormData()),
    } as Response)
  ) as jest.Mock
})

beforeEach(() => {
  jest.restoreAllMocks()
})

afterAll(() => {
  global.fetch = originalFetch
})
