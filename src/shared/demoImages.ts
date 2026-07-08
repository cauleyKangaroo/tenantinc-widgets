// Static demo imagery for the widget demos. Downscaled to 800px wide and
// JPEG-compressed from the originals in /assets (≈480 KB total for all ten).
// webpack base64-inlines these (asset/inline) so each widget stays a single
// self-contained .js file, as the Duda loader requires.
import blog1 from './assets/demo/blog-1.jpg';
import blog2 from './assets/demo/blog-2.jpg';
import blog3 from './assets/demo/blog-3.jpg';
import property1 from './assets/demo/property-1.jpg';
import property2 from './assets/demo/property-2.jpg';
import property3 from './assets/demo/property-3.jpg';
import size5x5 from './assets/demo/size-5x5.jpg';
import size5x10 from './assets/demo/size-5x10.jpg';
import size10x20 from './assets/demo/size-10x20.jpg';
import size10x30 from './assets/demo/size-10x30.jpg';

export const BLOG_IMAGES: string[] = [blog1, blog2, blog3];
export const PROPERTY_IMAGES: string[] = [property1, property2, property3];
export const SIZE_IMAGES: Record<string, string> = {
  '5x5': size5x5,
  '5x10': size5x10,
  '10x20': size10x20,
  '10x30': size10x30,
};

/** Ready-to-use CSS `background` value that covers the box with the image. */
export const cover = (img: string): string => `url(${img}) center / cover no-repeat`;
