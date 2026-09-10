import { SelectHTMLAttributes } from 'react';

import { Field } from '../field';

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'id'> {
  error?: string;
  hint?: string;
  isLabelHidden?: boolean;
  label: string;
  options: readonly SelectOption[];
}

export const Select = ({ error, hint, isLabelHidden, label, options, ...rest }: SelectProps) => (
  <Field error={error} hint={hint} isLabelHidden={isLabelHidden} label={label}>
    {(control) => (
      <select {...rest} {...control}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )}
  </Field>
);
