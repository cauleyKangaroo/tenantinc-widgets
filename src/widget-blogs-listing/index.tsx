// Widget #12 — Blogs Listing
import { createWidget } from '@shared/createWidget';
import { BlogsListing } from './BlogsListing';
import type { BlogsListingProps } from './BlogsListing';

export const { init, clean } = createWidget<BlogsListingProps>(BlogsListing);
