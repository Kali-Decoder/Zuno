import type { Metadata } from "next";

const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : `http://localhost:${process.env.PORT || 3000}`;
const titleTemplate = "%s";
const DEFAULT_LOGO = "/zuno-logo.png";

export const getMetadata = ({
  title,
  description,
  imageRelativePath = DEFAULT_LOGO,
}: {
  title: string;
  description: string;
  imageRelativePath?: string;
}): Metadata => {
  const imageUrl = `${baseUrl}${imageRelativePath}`;

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: title,
      template: titleTemplate,
    },
    description,
    applicationName: "ZUNO.FUN",
    icons: {
      icon: [
        { url: DEFAULT_LOGO, type: "image/png" },
        { url: "/favicon.ico", sizes: "any" },
      ],
      shortcut: DEFAULT_LOGO,
      apple: [{ url: DEFAULT_LOGO, type: "image/png" }],
    },
    openGraph: {
      type: "website",
      siteName: "ZUNO.FUN",
      title: {
        default: title,
        template: titleTemplate,
      },
      description,
      images: [
        {
          url: imageUrl,
          width: 1376,
          height: 1143,
          alt: "ZUNO.FUN",
        },
      ],
    },
    twitter: {
      card: "summary",
      title: {
        default: title,
        template: titleTemplate,
      },
      description,
      images: [
        {
          url: imageUrl,
          alt: "ZUNO.FUN",
        },
      ],
    },
  };
};
