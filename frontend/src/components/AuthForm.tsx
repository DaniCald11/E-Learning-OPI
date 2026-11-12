import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { FieldValues, Path, Resolver } from 'react-hook-form'
import type { ObjectSchema } from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'
import { Alert, Button, Stack, TextField, Typography } from '@mui/material'
import { errorMessage } from '../services/api'
interface Props<T extends FieldValues> {
  title: string; schema: ObjectSchema<T>; fields: { name: Path<T>; label: string; type?: string; autoComplete?: string }[]
  onSubmit: (data: T) => Promise<void>; success?: string; submitLabel?: string
}
export function AuthForm<T extends FieldValues>({ title, schema, fields, onSubmit, success, submitLabel = 'Continuar' }: Props<T>) {
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const { control, handleSubmit, formState: { isSubmitting } } = useForm<T>({ resolver: yupResolver(schema) as unknown as Resolver<T> })
  return <Stack component="form" noValidate spacing={3} onSubmit={handleSubmit(async data => {
    setError(''); setDone(false)
    try { await onSubmit(data); setDone(true) } catch (failure) { setError(errorMessage(failure)) }
  })}>
    <Typography component="h1" variant="h4">{title}</Typography>
    {error && <Alert severity="error">{error}</Alert>}
    {done && success && <Alert severity="success">{success}</Alert>}
    {fields.map(item => <Controller key={item.name} name={item.name} control={control}
      render={({ field: { ref, ...field }, fieldState }) => <TextField {...field} inputRef={ref}
        value={field.value ?? ''} label={item.label} type={item.type ?? 'text'} autoComplete={item.autoComplete}
        fullWidth error={Boolean(fieldState.error)} helperText={fieldState.error?.message} />} />)}
    <Button type="submit" variant="contained" disabled={isSubmitting}>{isSubmitting ? 'Procesando…' : submitLabel}</Button>
  </Stack>
}
