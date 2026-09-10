import { TextareaHTMLAttributes } from 'react';

import { Field } from '../field';

interface TextAreaProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'className' | 'id'
> {
  error?: string;
  hint?: string;
  isLabelHidden?: boolean;
  label: string;
}

export const TextArea = ({ error, hint, isLabelHidden, label, ...rest }: TextAreaProps) => (
  <Field error={error} hint={hint} isLabelHidden={isLabelHidden} label={label}>
    {(control) => <textarea {...rest} {...control} />}
  </Field>
);
