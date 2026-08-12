// Widget #15 — Blogs Page (full-page blog listing: tag filters, search, lazy load)
import { createWidget } from '@shared/createWidget';
import { BlogsPage } from './BlogsPage';
import type { BlogsPageProps } from './BlogsPage';

export const { init, clean } = createWidget<BlogsPageProps>(BlogsPage);
