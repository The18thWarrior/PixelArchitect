import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <title>PixelArchitect</title>
        <meta name="description" content="Your personal Salesforce SME" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/Fox_Logo.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
