/**
 * electron-builder configuration
 * Run: npm run make
 * Output: dist-electron/CreditDesk-Pro-Setup-{version}.exe
 */

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.nnpc.creditdeskpro',
  productName: 'CreditDesk Pro',
  copyright: 'Copyright © 2024 NNPC',

  directories: {
    output: 'dist-electron',
    buildResources: 'public',
  },

  // Files to include in the packaged app
  files: [
    'out/**',         // electron-vite build output (main + preload + renderer)
    'package.json',
  ],

  extraResources: [
    // The compiled electron main & preload are already in out/
  ],

  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
    ],
    icon: 'public/favicon.svg',
    // requestedExecutionLevel: 'requireAdministrator' // uncomment if IT requires UAC elevation
  },

  nsis: {
    oneClick: false,                         // Show installer wizard
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'CreditDesk Pro',
    installerLanguages: ['en_US'],
    // Custom install script can be added here for first-run dependency checks
  },

  // Auto-update: point to a network share or SharePoint-synced folder
  // publish: {
  //   provider: 'generic',
  //   url: '\\\\nnpc-server\\shared\\creditdesk-updates\\',
  // },
}
