export const convertToDirectLink = (url) => {
  if (!url) return '';

  // Google Drive
  // Format 1: https://drive.google.com/file/d/VIEW_ID/view...
  // Target: https://drive.google.com/uc?export=view&id=VIEW_ID
  const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const driveMatch = url.match(driveRegex);
  if (driveMatch && driveMatch[1]) {
    return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
  }

  // Dropbox
  // Format: https://www.dropbox.com/s/ID/file.jpg?dl=0
  // Target: ...?dl=1 or raw=1
  if (url.includes('dropbox.com') && url.includes('?dl=0')) {
      return url.replace('?dl=0', '?dl=1');
  }

  // Google Photos (Web Link vs Direct Link)
  // Google Photos share links (photos.app.goo.gl or photos.google.com) are HTML pages.
  // We can't easily convert them client-side without an API call or proxy.
  // However, often users copy the "Image Address" which is a huge lh3.googleusercontent.com URL.
  // Those work fine.
  // If it's a share link, we might not be able to fix it easily.
  
  return url;
};
