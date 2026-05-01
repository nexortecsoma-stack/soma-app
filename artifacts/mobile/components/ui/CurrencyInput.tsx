import React from "react";
import { AppInput } from "./AppInput";
import { currencyEngine } from "@/engines/currency-engine";

interface Props {
  label?: string;
  value: number;
  onChangeValue: (v: number) => void;
  placeholder?: string;
  error?: string | null;
  helper?: string;
  disabled?: boolean;
  left?: any;
}

export function CurrencyInput({ value, onChangeValue, ...rest }: Props) {
  const handleChange = (txt: string) => {
    const parsed = currencyEngine.parseFromInput(txt);
    onChangeValue(parsed);
  };
  return (
    <AppInput
      {...rest}
      keyboardType="numeric"
      value={value > 0 ? `R$ ${currencyEngine.formatarParaInput(value)}` : ""}
      onChangeText={handleChange}
      placeholder={rest.placeholder ?? "R$ 0,00"}
    />
  );
}
