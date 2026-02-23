import Head from 'next/head';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Series Vault</title>
        <meta name="application-name" content="Series Vault" />
        <meta name="apple-mobile-web-app-title" content="Series Vault" />
        <meta name="theme-color" content="#0b1020" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.svg" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
