import Head from 'next/head';
import { SeoMetadata, generateOgTags, generateTwitterTags, generateStructuredData } from '../lib/seoMetadata';

interface SeoProps {
  metadata: SeoMetadata;
  structuredData?: Record<string, unknown>;
  structuredDataType?: 'Organization' | 'Product' | 'Article';
}

/**
 * Reusable SEO component for adding meta tags to pages
 */
export function Seo({ metadata, structuredData, structuredDataType }: SeoProps) {
  const ogTags = generateOgTags(metadata);
  const twitterTags = generateTwitterTags(metadata);
  const schema = structuredData && structuredDataType 
    ? generateStructuredData(structuredDataType, structuredData)
    : null;

  return (
    <Head>
      <title>{metadata.title}</title>
      <meta name="description" content={metadata.description} />
      {metadata.canonical && <link rel="canonical" href={metadata.canonical} />}
      
      {/* Open Graph */}
      {Object.entries(ogTags).map(([key, value]) => (
        <meta key={key} property={key} content={value} />
      ))}
      
      {/* Twitter Card */}
      {Object.entries(twitterTags).map(([key, value]) => (
        <meta key={key} name={key} content={value} />
      ))}
      
      {/* Structured Data */}
      {schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )}
    </Head>
  );
}
