// Widget #17 — Account Login (identify → one-time code, 3rd-party portal)
import { createWidget } from '@shared/createWidget';
import { AccountLogin } from './AccountLogin';
import type { AccountLoginProps } from './AccountLogin';

export const { init, clean } = createWidget<AccountLoginProps>(AccountLogin);
