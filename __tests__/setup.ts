import '@testing-library/jest-dom'

// Mock global fetch for route tests
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

// Suppress console noise during tests
jest.spyOn(console, 'warn').mockImplementation(() => {})
jest.spyOn(console, 'error').mockImplementation(() => {})
jest.spyOn(console, 'log').mockImplementation(() => {})