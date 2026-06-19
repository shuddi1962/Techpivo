"use client"

import { useEffect } from "react"

const PUBLISHER_ID = "pub-3867128949973557"

export function GoogleCMP() {
  useEffect(() => {
    const w = window as any
    w.dataLayer = w.dataLayer || []
    function gtag(...args: unknown[]) { w.dataLayer.push(args) }

    gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
      functionality_storage: "granted",
      personalization_storage: "denied",
      security_storage: "granted",
      wait_for_update: 500,
    })
    gtag("set", "ads_data_redaction", true)
    gtag("set", "url_passthrough", true)

    const fc = document.createElement("script")
    fc.src = `https://fundingchoicesmessages.google.com/i/${PUBLISHER_ID}?ers=1`
    fc.async = true
    document.head.appendChild(fc)

    const fcSignal = document.createElement("script")
    fcSignal.textContent = `
      (function() {
        function signalGooglefcPresent() {
          if (!window.frames['googlefcPresent']) {
            if (document.body) {
              const iframe = document.createElement('iframe');
              iframe.style = 'width:0;height:0;border:0;z-index:-1;';
              iframe.name = 'googlefcPresent';
              document.body.appendChild(iframe);
            } else {
              setTimeout(signalGooglefcPresent, 0);
            }
          }
        }
        signalGooglefcPresent();
      })();
    `
    document.head.appendChild(fcSignal)

    return () => {
      fc.remove()
      fcSignal.remove()
    }
  }, [])

  return null
}
