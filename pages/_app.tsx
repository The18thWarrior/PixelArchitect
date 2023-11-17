import type { AppProps } from 'next/app'
import '../styles/globals.css'
import Head from 'next/head'
export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
    <Head>
      <title>PixelArchitect</title>
      <meta name="description" content="Your personal Salesforce SME" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="icon" href="/Fox_Logo.png" />
    </Head>
    <Component {...pageProps} />
    </>
  )
}