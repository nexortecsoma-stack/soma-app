import React from "react";
import { AppInput } from "./AppInput";
import { maskEngine } from "@/engines/mask-engine";
import { cpfEngine } from "@/engines/cpf-engine";

type Mascara = "cpf" | "telefone" | "placa" | "data" | "numero";

interface Props {
  label?: string;
  value: string;
  onChangeText: (formatado: string) => void;
  mascara: Mascara;
  placeholder?: string;
  error?: string | null;
  helper?: string;
  disabled?: boolean;
  left?: any;
}

export function MaskedInput({ value, onChangeText, mascara, ...rest }: Props) {
  const aplicar = (raw: string) => {
    if (mascara === "cpf") return cpfEngine.aplicarMascara(raw);
    if (mascara === "telefone") return maskEngine.telefone(raw);
    if (mascara === "placa") return maskEngine.placa(raw);
    if (mascara === "data") return maskEngine.data(raw);
    return maskEngine.somenteNumeros(raw);
  };

  return (
    <AppInput
      {...rest}
      keyboardType={mascara === "placa" ? "default" : "numeric"}
      autoCapitalize={mascara === "placa" ? "characters" : "none"}
      value={value}
      onChangeText={(t) => onChangeText(aplicar(t))}
    />
  );
}
