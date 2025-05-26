import fetch, {
  Headers,
  Request,
  Response,
} from 'node-fetch'

if (!globalThis.fetch) {
  // @ts-ignore
  globalThis.fetch = fetch
  // @ts-ignore
  globalThis.Request = Request
  // @ts-ignore
  globalThis.Response = Response
}
