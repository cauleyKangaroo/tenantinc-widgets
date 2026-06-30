// Widget #12 — Blogs Listing
import { createWidget } from '@shared/createWidget';
import { BlogsListing } from './BlogsListing';

export const { init, clean } = createWidget(BlogsListing);
