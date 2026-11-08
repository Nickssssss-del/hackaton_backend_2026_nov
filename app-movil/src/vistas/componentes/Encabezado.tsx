/**
 * Vista. Encabezado de las pantallas anteriores al Mockup v4. Ahora usa la barra común CC-01
 * (Volver, Aa, luna y altavoz) para que haya un solo «Volver» y se vea igual en toda la app.
 */
import { BarraSuperior } from "./BarraSuperior";

export function Encabezado({ onVolver, escuchar }: { onVolver: () => void; escuchar?: () => void }) {
  return <BarraSuperior volver={onVolver} alEscuchar={escuchar} />;
}
