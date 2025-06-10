export interface StopListResponse {
  article: string
  image: string
  title: string
  marketplace: {
    id: number,
    title: string
    orders: number
    stocks: number
    sendStatus: {
      id: number
      title: string
    }
  }[]
  direction: {
    id: number
    title: string
  }
}