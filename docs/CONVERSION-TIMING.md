# Song preparation timing investigation — November 9, 2026

Measured with the user-supplied video qV-3UMfcWBc in Chromium using the production page bridge. This is one diagnostic run; native WebKit, network conditions, and provider load can produce different results. No tokens, private request headers, or signed download URLs were recorded.

| Source | Observation |
| --- | --- |
| Flvto | Document ready at 1.3 s; YouTube metadata request at 3.3 s, complete at 8.3 s. Source verification ran from 4.4 s, with repeated HTTP 403 responses from the verification endpoint. The provider reported failure at 16.2 s. Conversion never started. |
| YTMP3 | Document ready and authentication began at 4.8 s. Authentication finished at 10.8 s, initialization at 13.3 s, and two conversion requests at 20.7 s and 30.3 s. Source stages then advanced at 30.3/33.3/36.3 s, with a downloadable audio URL ready at 39.3 s. This timing check captured readiness; it did not download or validate the resulting bytes. |

The UI formerly called all time before the download API or first provider progress callback “Finding your song.” That concealed verification, authentication, and extraction. The bridge now observes these existing requests and reports separate connecting, verification, preparation, and conversion stages. Verification rejection is identified in the failure state. It does not skip or bypass source verification.

The client waits at most 300 ms to select the requested quality and at most 50 ms to attach the fallback completion callback. These waits do not account for the measured multi-second provider delays. Existing 60-second idle and 240-second absolute conversion timeouts remain in place. Unavailable numerical progress remains unknown instead of being invented.

## Recovery changes

Verification HTTP 401/403 now ends the attempt as soon as the response is observed. Connection and verification inactivity are capped at 20 seconds; extraction/conversion retains a 60-second inactivity budget and four-minute total cap. The quality selector includes a direct 192 kbps route to YTMP3, avoiding the primary source entirely. After a primary verification rejection the main action is Continue at 192 kbps, with retrying the selected quality secondary. No automatic bitrate downgrade is performed.

The fallback page also contains a cProgress branch that waits through three fixed three-second UI timers after receiving a download URL. Lilt now captures that branch immediately and sends the URL to the real transfer queue, removing that nine-second handoff delay. The queue still requires successful network transfer, audio validation, and durable commit before showing success.

A later check with the decorative delay removed reached an audio URL at 8.3 seconds. However, the separate audio HTTP request still timed out after 120 seconds in that diagnostic environment. The client-side handoff delay is removed; successful live delivery for that attempt remains unverified. The source service and network can still prevent completion.
