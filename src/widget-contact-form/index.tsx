// Widget #23 — Contact Form (inline "Send us a Message" for a contact page)
import { createWidget } from '@shared/createWidget';
import { ContactForm } from './ContactForm';
import type { ContactFormWidgetProps } from './ContactForm';

export const { init, clean } = createWidget<ContactFormWidgetProps>(ContactForm);
