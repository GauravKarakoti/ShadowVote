import type { AppProps } from 'next/app';
import type { NextPageWithLayout } from '@/types/index.js';
import { useState, useMemo } from 'react';
import Head from 'next/head';
import { Hydrate, QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { ThemeProvider } from 'next-themes';

// --- CHANGED: Imports using "adaptor" (with o), "core", and "react-ui" ---
import { WalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import {
  DecryptPermission,
  WalletAdapterNetwork,
} from '@provablehq/aleo-wallet-adaptor-core'; // Was "base"

// --- CHANGED: Style import ---
import '@provablehq/aleo-wallet-adaptor-react-ui/styles.css'; // Was "reactui"

import 'swiper/swiper-bundle.css';
import '@/assets/css/globals.css';

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

function CustomApp({ Component, pageProps }: AppPropsWithLayout) {
  const [queryClient] = useState(() => new QueryClient());
  const getLayout = Component.getLayout ?? ((page) => page);

  const wallets = useMemo(
    () => [
      new LeoWalletAdapter({
        appName: 'ShadowVote',
      }),
      new ShieldWalletAdapter({ 
        appName: "ShadowVote"
      }),
    ],
    []
  );

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <QueryClientProvider client={queryClient}>
        <Hydrate state={pageProps.dehydratedState}>
          <WalletProvider
            wallets={wallets}
            decryptPermission={DecryptPermission.UponRequest}
            network={WalletAdapterNetwork.TestnetBeta}
            autoConnect
          >
            <WalletModalProvider>
              <ThemeProvider attribute="data-theme" enableSystem={true} defaultTheme="dark">
                {getLayout(<Component {...pageProps} />)}
              </ThemeProvider>
            </WalletModalProvider>
          </WalletProvider>
        </Hydrate>
        <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
      </QueryClientProvider>
    </>
  );
}

export default CustomApp;