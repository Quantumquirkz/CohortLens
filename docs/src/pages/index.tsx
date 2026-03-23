import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import type { ReactNode } from 'react';
import styles from './index.module.css';

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <header className={`hero hero--primary ${styles.heroBanner}`}>
        <div className="container">
          <Heading as="h1" className="hero__title">
            {siteConfig.title}
          </Heading>
          <p className="hero__subtitle">{siteConfig.tagline}</p>
          <div className={styles.buttons}>
            <Link className="button button--secondary button--lg" to="/docs/intro">
              Documentation
            </Link>
            <Link className="button button--outline button--secondary button--lg" href="https://github.com/Quantumquirkz/CohortLens">
              GitHub
            </Link>
          </div>
        </div>
      </header>
    </Layout>
  );
}
