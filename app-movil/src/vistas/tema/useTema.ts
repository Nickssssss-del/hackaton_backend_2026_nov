import { useContext } from "react";
import { TemaContext } from "./TemaProveedor";

export function useTema() {
  return useContext(TemaContext);
}
