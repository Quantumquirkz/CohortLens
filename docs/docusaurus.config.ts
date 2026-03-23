import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import { themes as prismThemes } from 'prism-react-renderer';

const config: Config = {
  title: 'CohortLens',
  tagline: 'Cohort analysis, on-chain ML marketplace, and subgraph indexers',
  favicon: 'img/logo.svg',
  url: 'https://cohortlens.github.io',
  baseUrl: '/',

  organizationName: 'CohortLens',
  projectName: 'CohortLens',

  onBrokenLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/Quantumquirkz/CohortLens/tree/main/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'CohortLens',
      items: [
        { type: 'docSidebar', sidebarId: 'tutorialSidebar', position: 'left', label: 'Docs' },
        {
          href: 'https://github.com/Quantumquirkz/CohortLens',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Introduction', to: '/docs/intro' },
            { label: 'Deployment', to: '/docs/deployment' },
          ],
        },
        {
          title: 'Repository',
          items: [
            { label: 'GitHub', href: 'https://github.com/Quantumquirkz/CohortLens' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} CohortLens contributors.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
