import { type Control, Controller, type FieldValues, type Path } from 'react-hook-form';
import type { TextInputProps } from 'react-native';
import { TextField } from './TextField';

type Props<T extends FieldValues> = TextInputProps & { control: Control<T>; name: Path<T>; label: string };

export function FormTextField<T extends FieldValues>({ control, name, label, ...props }: Props<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
        <TextField
          label={label}
          value={value == null ? '' : String(value)}
          onChangeText={onChange}
          onBlur={onBlur}
          error={error?.message}
          {...props}
        />
      )}
    />
  );
}
