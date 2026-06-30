// Widget #02 — Navigation Bar
import { createWidget } from '@shared/createWidget';
import { NavigationBar } from './NavigationBar';
import type { NavigationBarProps } from './NavigationBar';

export const { init, clean } = createWidget<NavigationBarProps>(NavigationBar);
