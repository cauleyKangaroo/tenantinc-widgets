// Widget #16 — Blog Post (single article page, resolved from the URL slug)
import { createWidget } from '@shared/createWidget';
import { BlogPost } from './BlogPost';
import type { BlogPostProps } from './BlogPost';

export const { init, clean } = createWidget<BlogPostProps>(BlogPost);
