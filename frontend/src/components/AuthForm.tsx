import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { FieldValues, Path, Resolver } from "react-hook-form";
import type { ObjectSchema } from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Alert,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Icon } from "./Icon";
import { errorMessage } from "../services/api";
interface Props<T extends FieldValues> {
  description?: string;
  eyebrow?: string;
  title: string;
  schema: ObjectSchema<T>;
  fields: {
    name: Path<T>;
    label: string;
    type?: string;
    autoComplete?: string;
  }[];
  onSubmit: (data: T) => Promise<void>;
  success?: string;
  submitLabel?: string;
}
export function AuthForm<T extends FieldValues>({
  title,
  description,
  eyebrow = "TU SIGUIENTE PASO",
  schema,
  fields,
  onSubmit,
  success,
  submitLabel = "Continuar",
}: Props<T>) {
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<T>({ resolver: yupResolver(schema) as unknown as Resolver<T> });
  return (
    <Stack
      component="form"
      noValidate
      spacing={3}
      onSubmit={handleSubmit(async (data) => {
        setError("");
        setDone(false);
        try {
          await onSubmit(data);
          setDone(true);
        } catch (failure) {
          setError(errorMessage(failure));
        }
      })}
    >
      <div className="auth-intro">
        <span className="eyebrow">{eyebrow}</span>
        <Typography component="h1" variant="h4">
          {title}
        </Typography>
        {description && <p className="auth-description">{description}</p>}
      </div>
      {error && <Alert severity="error">{error}</Alert>}
      {done && success && <Alert severity="success">{success}</Alert>}
      {fields.map((item) => (
        <Controller
          key={item.name}
          name={item.name}
          control={control}
          render={({ field: { ref, ...field }, fieldState }) => (
            <TextField
              {...field}
              inputRef={ref}
              value={field.value ?? ""}
              label={item.label}
              type={
                item.type === "password" && visible
                  ? "text"
                  : (item.type ?? "text")
              }
              autoComplete={item.autoComplete}
              slotProps={{
                input:
                  item.type === "password"
                    ? {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label={
                                visible
                                  ? "Ocultar contraseña"
                                  : "Mostrar contraseña"
                              }
                              onClick={() => setVisible(!visible)}
                              edge="end"
                            >
                              <Icon name="eye" size={18} />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }
                    : undefined,
              }}
              fullWidth
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message}
            />
          )}
        />
      ))}
      {fields.some((field) => field.autoComplete === "new-password") && (
        <p className="password-help">
          Usa al menos 12 caracteres con mayúscula, minúscula, número y símbolo.
        </p>
      )}
      <Button
        type="submit"
        variant="contained"
        endIcon={
          isSubmitting ? (
            <CircularProgress size={17} color="inherit" />
          ) : (
            <Icon />
          )
        }
        disabled={isSubmitting}
      >
        {isSubmitting ? "Procesando…" : submitLabel}
      </Button>
    </Stack>
  );
}
