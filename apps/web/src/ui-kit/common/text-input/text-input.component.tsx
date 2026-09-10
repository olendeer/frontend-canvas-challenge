import { InputHTMLAttributes } from 'react';

import { Field } from '../field';

interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'id'> {
  error?: string;
  hint?: string;
  isLabelHidden?: boolean;
  label: string;
}

export const TextInput = ({ error, hint, isLabelHidden, label, ...rest }: TextInputProps) => (
  <Field error={error} hint={hint} isLabelHidden={isLabelHidden} label={label}>
    {(control) => <input {...rest} {...control} type={rest.type ?? 'text'} />}
  </Field>
);
