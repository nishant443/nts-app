// Release notes shown once per version in the "What's new" dialog.
//
// BEFORE EACH DEPLOY that users should hear about:
//   1. Add a new entry at the TOP of RELEASES with a higher version.
//   2. Keep notes short and user-facing ("New leave module", "Faster payments page").
//   3. If the app icon or name changed, say the new icon may only appear after
//      reinstalling the app or within about a day (devices refresh it on their own schedule).
// Deploys without a new entry still show the "new version available" banner;
// they just don't open the dialog.

export interface Release {
  version: string;
  date: string;
  notes: string[];
}

/** Newest first. */
export const RELEASES: Release[] = [
  {
    version: "1.2.0",
    date: "2026-10-29",
    notes: [
      "A new launch screen celebrating 3 glorious years of Nutan Tech Solutions.",
      "The phone's status bar now matches the app's light or dark theme.",
      "If the old look remains, remove the app from your home screen and install it again.",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-10-29",
    notes: [
      "NTS can now be installed as an app on your phone or computer. Look for Install app in your account menu.",
      "You'll see a message whenever a new version is available, so you can update when it suits you.",
      "Forgotten your password? You can now reset it yourself from the sign-in page by email.",
    ],
  },
];

export const LATEST_RELEASE: Release | undefined = RELEASES[0];
