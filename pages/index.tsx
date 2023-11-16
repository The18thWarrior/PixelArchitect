
import type { AppProps } from 'next/app'
import React from 'react';
import ReactDOM from 'react-dom';
import { Auth0Provider } from "@auth0/auth0-react";
import Home from './home';
import Head from 'next/head';

export default function App() {
  return (
    <Auth0Provider
      domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN as string}
      clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID as string}
    >
      <Home useHeader={true}/>
    </Auth0Provider>
  )
  
}
