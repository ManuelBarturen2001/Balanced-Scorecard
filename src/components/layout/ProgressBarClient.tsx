
"use client";

import { PagesProgressBar as ProgressBar } from 'next-nprogress-bar';


export default function ProgressBarClient() {
  return (

    <ProgressBar
        height="3px"
        color="#fffd00"
        options={{ showSpinner: false }}
        shallowRouting
      />
  );
}
