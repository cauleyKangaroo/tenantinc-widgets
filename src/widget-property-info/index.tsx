// Widget #03 — Property Info
import { createWidget } from '@shared/createWidget';
import { PropertyInfo } from './PropertyInfo';
import type { PropertyInfoProps } from './PropertyInfo';

export const { init, clean } = createWidget<PropertyInfoProps>(PropertyInfo);
